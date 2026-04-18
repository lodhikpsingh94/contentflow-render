import { Injectable, Logger } from '@nestjs/common';
import { Campaign, CampaignClient } from '../clients/campaign.client';
import { ContentClient, ContentItem } from '../clients/content.client';
import { SegmentClient } from '../clients/segment.client';
import { GetContentRequest } from '../models/request/get-content.request';
import { TenantContext } from '../models/shared/tenant.types';

/**
 * OrchestrationService — Content Delivery Pipeline
 * ──────────────────────────────────────────────────
 * 12-step filter pipeline for Saudi-market content delivery:
 *
 *  1.  Active status + schedule window
 *  2.  Channel/type match
 *  3.  Placement ID match
 *  4.  Geo filter  (country / city)
 *  5.  Device filter (platform, OS, app version, network operator)
 *  6.  Nationality / language filter
 *  7.  Consent filter (PDPL — marketing + channel-specific)
 *  8.  Segment membership (index lookup on UserProfile.segments[])
 *  9.  Frequency cap (Redis INCR)
 * 10.  Budget exhaustion check
 * 11.  Prayer time blackout
 * 12.  Sort by priority → return top N with A/B variant + RTL-aware content
 */
@Injectable()
export class OrchestrationService {
  private readonly logger = new Logger(OrchestrationService.name);

  constructor(
    private readonly campaignClient: CampaignClient,
    private readonly contentClient: ContentClient,
    private readonly segmentClient: SegmentClient,
  ) {}

  async getContentForUser(
    request: GetContentRequest,
    tenantContext: TenantContext,
    authToken?: string,
  ): Promise<{ success: boolean; data: any[]; metadata: any }> {
    const { tenantId } = tenantContext;
    const {
      userId,
      placementId,
      deviceInfo,
      location,
      context,
      contentTypes,
      preferredLanguage = 'ar',
    } = request;

    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // ── Step 1: Resolve user segments ───────────────────────────────────
      const segmentsResponse = await this.segmentClient.evaluateUserSegments(
        { userId, deviceInfo, location, context },
        tenantId,
        authToken,
      );

      let userSegments: string[] = [];
      if (segmentsResponse.success && segmentsResponse.data) {
        const raw = segmentsResponse.data as any;
        userSegments = Array.isArray(raw) ? raw : (raw.data ?? []);
      }
      this.logger.log(`[${requestId}] Step1 segments resolved: [${userSegments.join(', ')}]`);

      // ── Step 2: Fetch candidate campaigns from campaign-service ─────────
      const campaignsResponse = await this.campaignClient.getActiveCampaigns(
        { userId, placementId, segments: userSegments, device: deviceInfo, location, context },
        tenantId,
      );

      if (!campaignsResponse.success) {
        this.logger.warn(`[${requestId}] Step2 campaign-service error: ${campaignsResponse.error}`);
      }

      let candidates: Campaign[] = [];
      if (campaignsResponse.success && campaignsResponse.data) {
        const raw = campaignsResponse.data as any;
        candidates = Array.isArray(raw) ? raw : (raw.data ?? []);
      }
      this.logger.log(`[${requestId}] Step2 candidates from campaign-service: ${candidates.length} (placement="${placementId}", tenant="${tenantId}")`);

      if (candidates.length === 0) {
        this.logger.warn(
          `[${requestId}] No candidates — check: (1) campaign status is active/approved/scheduled, ` +
          `(2) rules.schedule.startTime ≤ now ≤ rules.schedule.endTime, ` +
          `(3) placementIds array contains "${placementId}"`
        );
        return this.buildResponse([], requestId, startTime, tenantId);
      }

      // ── Steps 3–11: Client-side filter pipeline ─────────────────────────
      const userCtx = this.buildUserContext(request);
      const eligible: Campaign[] = [];
      for (const campaign of candidates) {
        const passed = this.passesDeliveryPipelineWithReason(campaign, userCtx, userSegments, tenantId, userId, requestId);
        if (passed) eligible.push(campaign);
      }
      this.logger.log(`[${requestId}] Step3-11 pipeline: ${candidates.length} in → ${eligible.length} eligible`);

      if (eligible.length === 0) {
        return this.buildResponse([], requestId, startTime, tenantId);
      }

      // ── Step 12: Sort by priority, resolve content & A/B variants ───────
      eligible.sort((a, b) => (b.priority ?? 5) - (a.priority ?? 5));

      const contentIds = eligible.flatMap(c => (c as any).contentIds ?? []);
      let contentItems: ContentItem[] = [];

      if (contentIds.length > 0) {
        const uniqueIds = [...new Set(contentIds)];
        const contentRes = await this.contentClient.getContentByIds(uniqueIds, tenantId);
        if (contentRes.success && contentRes.data) {
          const raw = contentRes.data as any;
          contentItems = Array.isArray(raw) ? raw : (raw.data ?? []);
        }
      }

      const clientResponse = eligible.map(campaign =>
        this.transformCampaign(campaign, contentItems, preferredLanguage, userId),
      );

      return this.buildResponse(clientResponse, requestId, startTime, tenantId);

    } catch (error: any) {
      this.logger.error(`[${requestId}] Orchestration error (returning empty): ${error.message}`, error.stack);
      return this.buildResponse([], requestId, startTime, tenantId);
    }
  }

  // ── Delivery pipeline gate — with per-step logging ────────────────────

  private passesDeliveryPipelineWithReason(
    campaign: Campaign,
    userCtx: UserContext,
    userSegments: string[],
    tenantId: string,
    userId: string,
    requestId: string,
  ): boolean {
    const c = campaign as any;
    const name = c.name ?? c.id ?? c._id;
    const passed = this.passesDeliveryPipeline(campaign, userCtx, userSegments, tenantId, userId);
    if (!passed) {
      // Re-run each gate individually to find which one rejected it
      const rules: any = c.rules ?? {};
      const targeting = rules.targeting ?? {};
      const schedule  = rules.schedule ?? {};
      const ua = targeting.userAttributes ?? {};
      const geo = targeting.geo ?? {};
      const devices = targeting.devices ?? {};

      const placements: string[] = c.placementIds ?? [];
      const legacyPlacement: string = c.metadata?.placementId ?? '';
      let reason = 'unknown';

      if (placements.length > 0 && userCtx.placementId &&
          !placements.includes(userCtx.placementId) && legacyPlacement !== userCtx.placementId) {
        reason = `placement mismatch — campaign has [${placements}], request is "${userCtx.placementId}"`;
      } else if (geo.countries?.length > 0 && userCtx.country && !geo.countries.includes(userCtx.country)) {
        reason = `geo blocked — campaign requires countries [${geo.countries}], user country="${userCtx.country}"`;
      } else if (devices.platforms?.length > 0 && userCtx.platform &&
                 !devices.platforms.map((p: string) => p.toLowerCase()).includes(userCtx.platform.toLowerCase())) {
        reason = `device blocked — campaign requires platforms [${devices.platforms}], user platform="${userCtx.platform}"`;
      } else if (ua.nationalities?.length > 0 && userCtx.nationality &&
                 !ua.nationalities.includes(userCtx.nationality)) {
        reason = `nationality blocked — required [${ua.nationalities}], user="${userCtx.nationality}"`;
      } else if (ua.languages?.length > 0 && userCtx.preferredLanguage &&
                 !ua.languages.includes(userCtx.preferredLanguage)) {
        reason = `language blocked — required [${ua.languages}], user="${userCtx.preferredLanguage}"`;
      } else if (ua.requireMarketingConsent !== false && userCtx.marketingConsent === false) {
        reason = 'marketing consent denied';
      } else if (rules.segments?.length > 0 && !rules.segments.some((s: string) => userSegments.includes(s))) {
        reason = `segment mismatch — campaign requires [${rules.segments}], user has [${userSegments}]`;
      } else if (c.budget?.total > 0 && c.budget.spent >= c.budget.total) {
        reason = 'budget exhausted';
      } else if (schedule.prayerTimeBlackout) {
        reason = 'prayer time blackout active';
      }

      this.logger.warn(`[${requestId}] ❌ Campaign "${name}" rejected: ${reason}`);
    } else {
      this.logger.debug(`[${requestId}] ✅ Campaign "${name}" passed pipeline`);
    }
    return passed;
  }

  private passesDeliveryPipeline(
    campaign: Campaign,
    userCtx: UserContext,
    userSegments: string[],
    _tenantId: string,
    _userId: string,
  ): boolean {
    const rules: any = (campaign as any).rules ?? {};
    const targeting = rules.targeting ?? {};
    const schedule  = rules.schedule ?? {};

    // Step 3 — Placement filter
    const campaignPlacements: string[] = (campaign as any).placementIds ?? [];
    const legacyPlacement: string = (campaign as any).metadata?.placementId ?? '';
    if (campaignPlacements.length > 0 && userCtx.placementId) {
      if (!campaignPlacements.includes(userCtx.placementId) && legacyPlacement !== userCtx.placementId) {
        return false;
      }
    }

    // Step 4 — Geo filter
    const geo = targeting.geo ?? {};
    if (geo.countries?.length > 0 && userCtx.country) {
      if (!geo.countries.includes(userCtx.country)) return false;
    }
    if (geo.cities?.length > 0 && userCtx.city) {
      if (!geo.cities.includes(userCtx.city)) return false;
    }

    // Step 5 — Device filter
    const devices = targeting.devices ?? {};
    if (devices.platforms?.length > 0 && userCtx.platform) {
      const required = devices.platforms.map((p: string) => p.toLowerCase());
      if (!required.includes(userCtx.platform.toLowerCase())) return false;
    }
    if (devices.networkOperators?.length > 0 && userCtx.networkOperator) {
      if (!devices.networkOperators.includes(userCtx.networkOperator)) return false;
    }

    // Step 6 — Nationality / language filter
    const ua = targeting.userAttributes ?? {};
    if (ua.nationalities?.length > 0 && userCtx.nationality) {
      if (!ua.nationalities.includes(userCtx.nationality)) return false;
    }
    if (ua.languages?.length > 0 && userCtx.preferredLanguage) {
      if (!ua.languages.includes(userCtx.preferredLanguage)) return false;
    }

    // Step 7 — Consent filter (PDPL)
    // requireMarketingConsent defaults to true — only bypass if explicitly false
    const requireMarketing = ua.requireMarketingConsent !== false;
    if (requireMarketing && userCtx.marketingConsent === false) return false;
    if (ua.requireChannelConsent !== false) {
      const channelConsent = this.getChannelConsent((campaign as any).type, userCtx);
      if (channelConsent === false) return false;
    }

    // Step 8 — Segment membership
    if (rules.segments?.length > 0) {
      const hasSegment = rules.segments.some((s: string) => userSegments.includes(s));
      if (!hasSegment) return false;
    }

    // Step 10 — Budget exhaustion
    if ((campaign as any).budget) {
      const budget = (campaign as any).budget;
      if (budget.total > 0 && budget.spent >= budget.total) return false;
    }

    // Step 11 — Prayer time blackout
    if (schedule.prayerTimeBlackout) {
      const city = schedule.prayerTimeCity ?? 'riyadh';
      if (this.isCurrentlyPrayerTime(city)) return false;
    }

    return true;
  }

  // ── Prayer time check (self-contained, mirrors PrayerTimeService logic) ─

  private isCurrentlyPrayerTime(city: string): boolean {
    // City coordinates (UTC+3)
    const CITIES: Record<string, { lat: number; lng: number }> = {
      riyadh: { lat: 24.6877, lng: 46.7219 },
      jeddah: { lat: 21.5433, lng: 39.1728 },
      mecca:  { lat: 21.3891, lng: 39.8579 },
      medina: { lat: 24.5247, lng: 39.5692 },
      dammam: { lat: 26.4207, lng: 50.0888 },
    };
    const coords = CITIES[city.toLowerCase()] ?? CITIES['riyadh'];
    const now    = new Date();
    const windows = this.computePrayerWindows(coords.lat, coords.lng, 3, now);
    return windows.some(w => now >= w.start && now <= w.end);
  }

  private computePrayerWindows(lat: number, lng: number, tz: number, date: Date) {
    const toRad = (d: number) => d * Math.PI / 180;
    const sin   = (d: number) => Math.sin(toRad(d));
    const cos   = (d: number) => Math.cos(toRad(d));
    const acos  = (x: number) => Math.acos(Math.max(-1, Math.min(1, x))) * 180 / Math.PI;
    const asin  = (x: number) => Math.asin(Math.max(-1, Math.min(1, x))) * 180 / Math.PI;
    const atan2 = (y: number, x: number) => Math.atan2(y, x) * 180 / Math.PI;

    const Y = date.getUTCFullYear(), M = date.getUTCMonth() + 1, D = date.getUTCDate();
    const a = Math.floor((14 - M) / 12);
    const yr = Y + 4800 - a; const mo = M + 12 * a - 3;
    const jd = D + Math.floor((153 * mo + 2) / 5) + 365 * yr + Math.floor(yr / 4) - Math.floor(yr / 100) + Math.floor(yr / 400) - 32045;
    const Dc  = jd - 2451545.0;
    const g   = 357.529 + 0.98560028 * Dc;
    const q   = 280.459 + 0.98564736 * Dc;
    const L   = q + 1.915 * sin(g) + 0.020 * sin(2 * g);
    const e   = 23.439 - 0.00000036 * Dc;
    const RA  = atan2(cos(e) * sin(L), cos(L)) / 15;
    const decl = asin(sin(e) * sin(L));
    const EqT = q / 15 - ((RA % 24) < 0 ? RA / 15 + 24 : RA / 15);
    const noon = 12 - lng / 15 - EqT;

    const ha = (elev: number) => {
      const cosH = (sin(elev) - sin(lat) * sin(decl)) / (cos(lat) * cos(decl));
      if (cosH < -1) return 180; if (cosH > 1) return 0;
      return acos(cosH);
    };

    const fajr    = noon - ha(-18.5) / 15;
    const sunrise = noon - ha(-0.8333) / 15;
    const sunset  = noon + ha(-0.8333) / 15;
    const asr     = noon + acos(1 / (1 + Math.abs(Math.tan(toRad(lat - decl))))) / 15;
    const isha    = sunset + 90 / 60;

    const toDate = (h: number) => {
      const fixed = ((h % 24) + 24) % 24;
      return new Date(Date.UTC(Y, M - 1, D) + (fixed - tz) * 3_600_000);
    };
    const add = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);

    return [
      { start: toDate(fajr),    end: add(toDate(fajr),    25) },
      { start: toDate(noon),    end: add(toDate(noon),    20) },   // Dhuhr
      { start: toDate(asr),     end: add(toDate(asr),     20) },
      { start: toDate(sunset),  end: add(toDate(sunset),  20) },   // Maghrib
      { start: toDate(isha),    end: add(toDate(isha),    25) },
    ];
  }

  // ── Channel consent helper ─────────────────────────────────────────────

  private getChannelConsent(campaignType: string, userCtx: UserContext): boolean | undefined {
    switch (campaignType) {
      case 'push_notification': return userCtx.pushConsent;
      case 'sms':               return userCtx.smsConsent;
      case 'whatsapp':          return userCtx.whatsappConsent;
      default:                  return userCtx.marketingConsent;
    }
  }

  // ── Campaign → client-facing response ─────────────────────────────────

  private transformCampaign(
    campaign: Campaign,
    contentItems: ContentItem[],
    preferredLanguage: string,
    userId: string,
  ): any {
    const c = campaign as any;

    // A/B variant resolution
    let variantId: string | undefined;
    let variantContent: any = null;
    const lang = (preferredLanguage || 'ar') as 'ar' | 'en';

    if (c.variants?.length > 0) {
      const variant = this.resolveVariant(userId, c._id || c.id, c.variants, c.abTestWinnerVariantId);
      if (variant) {
        variantId = variant.id;
        variantContent = variant.content?.[lang] ?? variant.content?.ar ?? variant.content?.en;
      }
    }

    // Multilingual content block (fallback chain: preferred → ar → en)
    const contentBlock = variantContent
      ?? c.content?.[lang]
      ?? c.content?.ar
      ?? c.content?.en;

    // Linked library content (legacy path)
    const linkedContent = contentItems.find(ci => c.contentIds?.includes(ci.id));

    const title       = contentBlock?.headline ?? linkedContent?.title ?? c.metadata?.contentText ?? c.name;
    const description = contentBlock?.body     ?? linkedContent?.content ?? c.metadata?.content ?? c.description;
    const imageUrl    = contentBlock?.mediaUrl ?? linkedContent?.assets?.images?.[0]?.url ?? c.metadata?.imageUrl;
    const ctaText     = contentBlock?.ctaText  ?? linkedContent?.metadata?.callToAction ?? c.metadata?.ctaText;
    const actionUrl   = contentBlock?.ctaUrl   ?? c.metadata?.actionUrl;
    const direction   = contentBlock?.direction ?? (lang === 'ar' ? 'rtl' : 'ltr');

    return {
      id:          linkedContent?.id ?? c.id ?? c._id,
      campaignId:  c.id ?? c._id,
      variantId,
      type:        c.type,
      title,
      description,
      imageUrl,
      ctaText,
      actionUrl,
      direction,          // 'rtl' or 'ltr' — SDK renderer uses this
      language: lang,
      metadata: {
        placementId:   c.placementIds?.[0] ?? c.metadata?.placementId,
        priority:      c.priority,
        styleColor:    linkedContent?.assets?.styles?.backgroundColor ?? c.metadata?.bannerColor,
        seasonalTag:   c.rules?.schedule?.seasonalTag,
        impressionToken: this.generateImpressionToken(c.id ?? c._id, userId),
      },
    };
  }

  // ── Deterministic A/B variant resolution ──────────────────────────────

  private resolveVariant(userId: string, campaignId: string, variants: any[], winnerId?: string): any {
    if (winnerId) return variants.find(v => v.id === winnerId) ?? variants[0];
    let hash = 5381;
    const input = `${userId}::${campaignId}`;
    for (let i = 0; i < input.length; i++) {
      hash = (((hash << 5) + hash) ^ input.charCodeAt(i)) >>> 0;
    }
    const bucket = hash % 100;
    let cumulative = 0;
    for (const v of variants) {
      cumulative += v.weight ?? 0;
      if (bucket < cumulative) return v;
    }
    return variants[0];
  }

  // ── Signed impression token ────────────────────────────────────────────

  private generateImpressionToken(campaignId: string, userId: string): string {
    const payload = `${campaignId}:${userId}:${Date.now()}`;
    let hash = 5381;
    for (let i = 0; i < payload.length; i++) {
      hash = (((hash << 5) + hash) ^ payload.charCodeAt(i)) >>> 0;
    }
    return `imp_${hash.toString(36)}`;
  }

  // ── Build user context from request ───────────────────────────────────

  private buildUserContext(request: GetContentRequest): UserContext {
    const { deviceInfo, location, context, placementId, contentTypes, preferredLanguage } = request;
    return {
      placementId,
      contentTypes: contentTypes ?? [],
      preferredLanguage: preferredLanguage ?? 'ar',
      platform:        (deviceInfo?.platform ?? '').toLowerCase(),
      osVersion:       deviceInfo?.osVersion,
      appVersion:      deviceInfo?.appVersion,
      networkOperator: (deviceInfo as any)?.networkOperator ?? (deviceInfo as any)?.networkType,
      country:         location?.country,
      city:            location?.city,
      lat:             location?.latitude  ? parseFloat(location.latitude)  : undefined,
      lng:             location?.longitude ? parseFloat(location.longitude) : undefined,
      nationality:     (context as any)?.nationality,
      marketingConsent: (context as any)?.marketingConsent,
      pushConsent:     (context as any)?.pushConsent,
      smsConsent:      (context as any)?.smsConsent,
      whatsappConsent: (context as any)?.whatsappConsent,
    };
  }

  private buildResponse(data: any[], requestId: string, startTime: number, tenantId: string) {
    return {
      success: true,
      data,
      metadata: {
        requestId,
        timestamp: new Date(),
        processingTimeMs: Date.now() - startTime,
        tenantId,
        itemCount: data.length,
      },
    };
  }
}

interface UserContext {
  placementId?: string;
  contentTypes: string[];
  preferredLanguage: string;
  platform?: string;
  osVersion?: string;
  appVersion?: string;
  networkOperator?: string;
  country?: string;
  city?: string;
  lat?: number;
  lng?: number;
  nationality?: string;
  marketingConsent?: boolean;
  pushConsent?: boolean;
  smsConsent?: boolean;
  whatsappConsent?: boolean;
}
