import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { CalendarIcon, Loader2, AlertCircle, Users, CheckSquare, Square, Plus, X, Globe, Moon, Send } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

import VisualEditor from './VisualEditor';

import { createCampaign, getCampaignById, updateCampaign } from '../../lib/campaigns';
import { NewCampaignData, Campaign, ContentBlock, BilingualContent, HijriDate } from '../../lib/campaigns/types';
import { getSegments } from '../../lib/segments';
import { Segment } from '../../lib/segments/types';

interface CreateCampaignViewProps {
  onCampaignCreated: () => void;
  campaignId?: string;
}

// ─── Channel type config ──────────────────────────────────────────────────────
const CHANNEL_TYPES = [
  { value: 'banner',              label: 'Banner',              icon: '🖼️',  hasVisualEditor: true  },
  { value: 'popup',               label: 'Popup',               icon: '💬',  hasVisualEditor: true  },
  { value: 'inapp_notification',  label: 'In-App Notification', icon: '🔔',  hasVisualEditor: false },
  { value: 'push_notification',   label: 'Push Notification',   icon: '📲',  hasVisualEditor: false },
  { value: 'sms',                 label: 'SMS',                 icon: '📱',  hasVisualEditor: false },
  { value: 'whatsapp',            label: 'WhatsApp',            icon: '💚',  hasVisualEditor: false },
  { value: 'video',               label: 'Video',               icon: '🎬',  hasVisualEditor: true  },
];

const SAUDI_CITIES = [
  'Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam',
  'Khobar', 'Taif', 'Tabuk', 'Abha', 'Najran',
];

const SEASONAL_TAGS = [
  { value: 'none',           label: 'None' },
  { value: 'ramadan',        label: '🌙 Ramadan' },
  { value: 'eid_fitr',       label: '🎉 Eid al-Fitr' },
  { value: 'eid_adha',       label: '🐑 Eid al-Adha' },
  { value: 'national_day',   label: '🇸🇦 National Day (Sep 23)' },
  { value: 'founding_day',   label: '🏛️ Founding Day (Feb 22)' },
  { value: 'hajj_season',    label: '🕌 Hajj Season' },
  { value: 'custom',         label: '📅 Custom Hijri Range' },
];

const TIMEZONES = [
  { value: 'Asia/Riyadh',   label: 'Arabia Standard Time (AST +3)' },
  { value: 'UTC',            label: 'UTC' },
  { value: 'Asia/Dubai',    label: 'Gulf Standard Time (GST +4)' },
  { value: 'Asia/Kuwait',   label: 'Kuwait Time (AST +3)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
];

// ─── Form state type ──────────────────────────────────────────────────────────
type ContentFormBlock = {
  headline: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  mediaUrl: string;
  whatsappTemplateId: string;
  smsFrom: string;
};

type CampaignFormData = {
  name: string;
  description: string;
  type: string;
  segments: string[];
  placementIds: string[];
  priority: number;
  content: {
    ar: ContentFormBlock;
    en: ContentFormBlock;
  };
  schedule: {
    startTime?: Date;
    endTime?: Date;
    timezone: string;
    prayerTimeBlackout: boolean;
    prayerTimeCity: string;
    seasonalTag: string;
    hijriStart: string;   // "year/month/day"
    hijriEnd: string;
  };
  budget: {
    total: string;
    currency: string;
    dailyCap: string;
  };
  // Legacy visual editor metadata (banner/popup/video)
  metadata: {
    content: string;
    ctaText: string;
    bannerColor: string;
    ctaBackgroundColor: string;
    ctaTextColor: string;
    imageUrl: string;
    actionUrl: string;
    placementId: string;
    bannerIcon: string;
  };
  subType: 'image' | 'video' | 'gif' | 'custom';
};

const emptyContentBlock: ContentFormBlock = {
  headline: '', body: '', ctaText: '', ctaUrl: '',
  mediaUrl: '', whatsappTemplateId: '', smsFrom: '',
};

const initialFormData: CampaignFormData = {
  name: '',
  description: '',
  type: '',
  segments: [],
  placementIds: [''],
  priority: 5,
  content: { ar: { ...emptyContentBlock }, en: { ...emptyContentBlock } },
  schedule: {
    startTime: undefined,
    endTime: undefined,
    timezone: 'Asia/Riyadh',
    prayerTimeBlackout: false,
    prayerTimeCity: 'Riyadh',
    seasonalTag: 'none',
    hijriStart: '',
    hijriEnd: '',
  },
  budget: { total: '', currency: 'SAR', dailyCap: '' },
  metadata: {
    content: 'This is a special offer just for you!',
    ctaText: 'Get Started',
    bannerColor: 'bg-primary text-primary-foreground',
    ctaBackgroundColor: '#FFFFFF',
    ctaTextColor: '#000000',
    imageUrl: '',
    actionUrl: '',
    placementId: '',
    bannerIcon: '',
  },
  subType: 'custom',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseHijri(str: string): HijriDate | undefined {
  const parts = str.split('/').map(Number);
  if (parts.length === 3 && parts.every(n => !isNaN(n) && n > 0)) {
    return { year: parts[0], month: parts[1], day: parts[2] };
  }
  return undefined;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CreateCampaignView({ onCampaignCreated, campaignId }: CreateCampaignViewProps) {
  const [formData, setFormData] = useState<CampaignFormData>(initialFormData);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false);
  const [isEndCalendarOpen, setIsEndCalendarOpen] = useState(false);
  const [contentLang, setContentLang] = useState<'ar' | 'en'>('ar');

  const isEditMode = !!campaignId;
  const channelConfig = CHANNEL_TYPES.find(c => c.value === formData.type);
  const hasVisualEditor = channelConfig?.hasVisualEditor ?? false;
  const showCustomSchedule = formData.schedule.seasonalTag === 'custom';

  // ─── Data loading ───────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const segmentsResponse = await getSegments();
        const segmentsData = segmentsResponse?.data || segmentsResponse || [];
        setSegments(Array.isArray(segmentsData) ? segmentsData : []);

        if (isEditMode && campaignId) {
          const campaignResponse = await getCampaignById(campaignId);
          const campaign: Campaign = campaignResponse?.data?.data || campaignResponse?.data || campaignResponse;

          if (campaign?._id) {
            const rules = campaign.rules || {};
            const schedule = rules.schedule || {};
            const meta = campaign.metadata || {};
            const c = campaign.content || {};

            setFormData({
              name: campaign.name || '',
              description: campaign.description || '',
              type: campaign.type || '',
              segments: Array.isArray(rules.segments) ? rules.segments : [],
              placementIds: campaign.placementIds?.length ? campaign.placementIds : [meta.placementId || ''],
              priority: campaign.priority || 5,
              content: {
                ar: {
                  headline: c.ar?.headline || '',
                  body: c.ar?.body || '',
                  ctaText: c.ar?.ctaText || '',
                  ctaUrl: c.ar?.ctaUrl || '',
                  mediaUrl: c.ar?.mediaUrl || '',
                  whatsappTemplateId: c.ar?.whatsappTemplateId || '',
                  smsFrom: c.ar?.smsFrom || '',
                },
                en: {
                  headline: c.en?.headline || '',
                  body: c.en?.body || '',
                  ctaText: c.en?.ctaText || '',
                  ctaUrl: c.en?.ctaUrl || '',
                  mediaUrl: c.en?.mediaUrl || '',
                  whatsappTemplateId: c.en?.whatsappTemplateId || '',
                  smsFrom: c.en?.smsFrom || '',
                },
              },
              schedule: {
                startTime: schedule.startTime ? new Date(schedule.startTime) : undefined,
                endTime: schedule.endTime ? new Date(schedule.endTime) : undefined,
                timezone: schedule.timezone || 'Asia/Riyadh',
                prayerTimeBlackout: schedule.prayerTimeBlackout || false,
                prayerTimeCity: schedule.prayerTimeCity || 'Riyadh',
                seasonalTag: schedule.seasonalTag || 'none',
                hijriStart: schedule.hijriStart
                  ? `${schedule.hijriStart.year}/${schedule.hijriStart.month}/${schedule.hijriStart.day}`
                  : '',
                hijriEnd: schedule.hijriEnd
                  ? `${schedule.hijriEnd.year}/${schedule.hijriEnd.month}/${schedule.hijriEnd.day}`
                  : '',
              },
              budget: {
                total: campaign.budget?.total?.toString() || '',
                currency: campaign.budget?.currency || 'SAR',
                dailyCap: campaign.budget?.dailyCap?.toString() || '',
              },
              metadata: {
                content: meta.contentText || '',
                ctaText: meta.ctaText || 'Get Started',
                bannerColor: meta.bannerColor || 'bg-primary text-primary-foreground',
                ctaBackgroundColor: meta.ctaBackgroundColor || '#FFFFFF',
                ctaTextColor: meta.ctaTextColor || '#000000',
                imageUrl: meta.imageUrl || '',
                actionUrl: meta.actionUrl || '',
                placementId: meta.placementId || '',
                bannerIcon: meta.bannerIcon || '',
              },
              subType: (campaign as any).subType || 'custom',
            });
          } else {
            throw new Error('Campaign data not found or invalid format.');
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load required data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, [campaignId, isEditMode]);

  // ─── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { name, type, description, segments, schedule, priority, metadata, content, placementIds, budget, subType } = formData;

      if (!schedule.startTime || !schedule.endTime) throw new Error('Schedule dates are required.');

      // Build bilingual content block
      const builtContent: BilingualContent = {};
      if (content.ar.headline || content.ar.body || content.ar.ctaText) {
        builtContent.ar = {
          headline: content.ar.headline || undefined,
          body: content.ar.body || undefined,
          ctaText: content.ar.ctaText || undefined,
          ctaUrl: content.ar.ctaUrl || undefined,
          mediaUrl: content.ar.mediaUrl || undefined,
          direction: 'rtl',
          whatsappTemplateId: content.ar.whatsappTemplateId || undefined,
          smsFrom: content.ar.smsFrom || undefined,
        };
      }
      if (content.en.headline || content.en.body || content.en.ctaText) {
        builtContent.en = {
          headline: content.en.headline || undefined,
          body: content.en.body || undefined,
          ctaText: content.en.ctaText || undefined,
          ctaUrl: content.en.ctaUrl || undefined,
          mediaUrl: content.en.mediaUrl || undefined,
          direction: 'ltr',
          whatsappTemplateId: content.en.whatsappTemplateId || undefined,
          smsFrom: content.en.smsFrom || undefined,
        };
      }

      const cleanPlacementIds = placementIds.filter(p => p.trim() !== '');

      const payload: NewCampaignData = {
        name,
        description: description || undefined,
        type,
        content: builtContent,
        placementIds: cleanPlacementIds.length > 0 ? cleanPlacementIds : undefined,
        segments,
        priority,
        schedule: {
          startTime: schedule.startTime.toISOString(),
          endTime: schedule.endTime.toISOString(),
          timezone: schedule.timezone,
          prayerTimeBlackout: schedule.prayerTimeBlackout || undefined,
          prayerTimeCity: schedule.prayerTimeBlackout ? schedule.prayerTimeCity : undefined,
          seasonalTag: (schedule.seasonalTag && schedule.seasonalTag !== 'none') ? schedule.seasonalTag : null,
          hijriStart: showCustomSchedule ? parseHijri(schedule.hijriStart) : undefined,
          hijriEnd: showCustomSchedule ? parseHijri(schedule.hijriEnd) : undefined,
        },
        budget: {
          total: budget.total ? parseFloat(budget.total) : undefined,
          currency: budget.currency || 'SAR',
          dailyCap: budget.dailyCap ? parseFloat(budget.dailyCap) : undefined,
        },
        // Include legacy metadata for visual editor channels
        metadata: hasVisualEditor ? {
          ...metadata,
          contentText: metadata.content,
        } : undefined,
      };

      if (isEditMode && campaignId) {
        await updateCampaign(campaignId, payload as any);
        alert('Campaign updated successfully!');
      } else {
        await createCampaign(payload as any);
        alert('Campaign created successfully!');
      }
      onCampaignCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateSelect = (field: 'startTime' | 'endTime', date: Date | undefined) => {
    setFormData(prev => ({ ...prev, schedule: { ...prev.schedule, [field]: date } }));
    if (field === 'startTime') setIsStartCalendarOpen(false);
    else setIsEndCalendarOpen(false);
  };

  const updateContent = (lang: 'ar' | 'en', field: keyof ContentFormBlock, value: string) => {
    setFormData(prev => ({
      ...prev,
      content: { ...prev.content, [lang]: { ...prev.content[lang], [field]: value } },
    }));
  };

  const addPlacementId = () => setFormData(prev => ({ ...prev, placementIds: [...prev.placementIds, ''] }));
  const removePlacementId = (i: number) =>
    setFormData(prev => ({ ...prev, placementIds: prev.placementIds.filter((_, idx) => idx !== i) }));
  const updatePlacementId = (i: number, val: string) =>
    setFormData(prev => ({
      ...prev,
      placementIds: prev.placementIds.map((p, idx) => (idx === i ? val : p)),
    }));

  // ─── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4 mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{isEditMode ? 'Edit Campaign' : 'Create New Campaign'}</CardTitle>
          <CardDescription>
            {isEditMode ? 'Modify campaign details.' : 'Configure and launch a new campaign.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="text-destructive p-3 bg-destructive/10 rounded-md text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* ── Basic Info ──────────────────────────────────────────────── */}
            <div className="space-y-4 p-6 border rounded-lg">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Title</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Ramadan Special Offer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Channel Type</Label>
                  <Select
                    required
                    value={formData.type}
                    onValueChange={(value) => setFormData(p => ({ ...p, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNEL_TYPES.map(c => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.icon}&nbsp; {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                  placeholder="Internal notes about this campaign"
                />
              </div>
            </div>

            {/* ── Content ─────────────────────────────────────────────────── */}
            <div className="p-6 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Content</h3>
                <Badge variant="outline" className="text-xs">
                  <Globe className="w-3 h-3 mr-1" />
                  Bilingual · AR / EN
                </Badge>
              </div>

              {hasVisualEditor ? (
                /* Legacy visual editor for banner / popup / video */
                <VisualEditor
                  campaignType={formData.type}
                  subType={formData.subType}
                  metadata={formData.metadata}
                  onSubtypeChange={(value) => setFormData(p => ({ ...p, subType: value }))}
                  onMetadataChange={(field, value) =>
                    setFormData(p => ({ ...p, metadata: { ...p.metadata, [field]: value } }))
                  }
                />
              ) : (
                /* Bilingual text-based editor for SMS / WhatsApp / Push / In-App */
                <Tabs value={contentLang} onValueChange={(v) => setContentLang(v as 'ar' | 'en')}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="ar" className="gap-1">
                      🇸🇦 Arabic
                    </TabsTrigger>
                    <TabsTrigger value="en" className="gap-1">
                      🇬🇧 English
                    </TabsTrigger>
                  </TabsList>

                  {(['ar', 'en'] as const).map(lang => (
                    <TabsContent key={lang} value={lang}>
                      <div
                        className="space-y-4"
                        dir={lang === 'ar' ? 'rtl' : 'ltr'}
                      >
                        <div className="space-y-2">
                          <Label>{lang === 'ar' ? 'العنوان' : 'Headline'}</Label>
                          <Input
                            value={formData.content[lang].headline}
                            onChange={(e) => updateContent(lang, 'headline', e.target.value)}
                            placeholder={lang === 'ar' ? 'عنوان رئيسي…' : 'Main headline…'}
                            className={lang === 'ar' ? 'text-right' : ''}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{lang === 'ar' ? 'نص الرسالة' : 'Body'}</Label>
                          <textarea
                            rows={3}
                            value={formData.content[lang].body}
                            onChange={(e) => updateContent(lang, 'body', e.target.value)}
                            placeholder={lang === 'ar' ? 'نص الرسالة…' : 'Message body…'}
                            className={`w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none ${lang === 'ar' ? 'text-right' : ''}`}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>{lang === 'ar' ? 'نص زر الإجراء' : 'CTA Text'}</Label>
                            <Input
                              value={formData.content[lang].ctaText}
                              onChange={(e) => updateContent(lang, 'ctaText', e.target.value)}
                              placeholder={lang === 'ar' ? 'اكتشف الآن' : 'Discover Now'}
                              className={lang === 'ar' ? 'text-right' : ''}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>CTA URL</Label>
                            <Input
                              value={formData.content[lang].ctaUrl}
                              onChange={(e) => updateContent(lang, 'ctaUrl', e.target.value)}
                              placeholder="https://…"
                              dir="ltr"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>{lang === 'ar' ? 'رابط الوسائط' : 'Media URL'}</Label>
                          <Input
                            value={formData.content[lang].mediaUrl}
                            onChange={(e) => updateContent(lang, 'mediaUrl', e.target.value)}
                            placeholder="https://cdn.example.com/image.png"
                            dir="ltr"
                          />
                        </div>
                        {/* WhatsApp-specific */}
                        {formData.type === 'whatsapp' && (
                          <div className="space-y-2">
                            <Label>WhatsApp Template ID</Label>
                            <Input
                              value={formData.content[lang].whatsappTemplateId}
                              onChange={(e) => updateContent(lang, 'whatsappTemplateId', e.target.value)}
                              placeholder="template_name_v1"
                              dir="ltr"
                            />
                          </div>
                        )}
                        {/* SMS-specific */}
                        {formData.type === 'sms' && (
                          <div className="space-y-2">
                            <Label>Sender ID (From)</Label>
                            <Input
                              value={formData.content[lang].smsFrom}
                              onChange={(e) => updateContent(lang, 'smsFrom', e.target.value)}
                              placeholder="ContentFlow"
                              dir="ltr"
                            />
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </div>

            {/* ── Placement IDs ────────────────────────────────────────────── */}
            <div className="space-y-4 p-6 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Placement IDs</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Specify where this campaign should appear in the app
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addPlacementId}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {formData.placementIds.map((pid, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={pid}
                      onChange={(e) => updatePlacementId(i, e.target.value)}
                      placeholder={`e.g. dashboard_top, home_banner_${i + 1}`}
                      className="flex-1"
                    />
                    {formData.placementIds.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePlacementId(i)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Targeting & Priority ─────────────────────────────────────── */}
            <div className="space-y-4 p-6 border rounded-lg">
              <h3 className="text-lg font-semibold">Targeting & Priority</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Segment multi-select */}
                <div className="space-y-2">
                  <Label>Target Segments</Label>
                  <p className="text-xs text-muted-foreground">Select one or more segments to target</p>
                  <div className="border rounded-lg divide-y max-h-56 overflow-y-auto">
                    {segments.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        No segments available. Create one first.
                      </div>
                    ) : segments.map(s => {
                      const selected = formData.segments.includes(s._id);
                      return (
                        <button
                          key={s._id}
                          type="button"
                          onClick={() =>
                            setFormData(p => ({
                              ...p,
                              segments: selected
                                ? p.segments.filter(id => id !== s._id)
                                : [...p.segments, s._id],
                            }))
                          }
                          className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${selected ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                        >
                          <div className="flex items-center gap-3">
                            {selected
                              ? <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                              : <Square className="w-4 h-4 text-muted-foreground shrink-0" />}
                            <div>
                              <div className="text-sm font-medium">{s.name}</div>
                              {s.description && (
                                <div className="text-xs text-muted-foreground">{s.description}</div>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <div className="text-sm font-semibold">{(s.userCount ?? 0).toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">users</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {formData.segments.length > 0 && (() => {
                    const sel = segments.filter(s => formData.segments.includes(s._id));
                    const total = sel.reduce((sum, s) => sum + (s.userCount ?? 0), 0);
                    return (
                      <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <Users className="w-4 h-4 text-blue-600 shrink-0" />
                        <div className="flex-1">
                          <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                            Estimated Reach:&nbsp;
                          </span>
                          <span className="text-sm text-blue-700 dark:text-blue-300">
                            {total.toLocaleString()} users
                          </span>
                          <span className="text-xs text-blue-500 ml-1">
                            across {sel.length} segment{sel.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Priority + Budget */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <p className="text-xs text-muted-foreground">
                      Higher priority campaigns are shown first (1 = highest)
                    </p>
                    <Select
                      value={String(formData.priority)}
                      onValueChange={(v) => setFormData(p => ({ ...p, priority: parseInt(v) }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="5" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(p => (
                          <SelectItem key={p} value={String(p)}>
                            {p} {p === 1 ? '(Highest)' : p === 10 ? '(Lowest)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Budget (optional)</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-1">
                        <Select
                          value={formData.budget.currency}
                          onValueChange={(v) =>
                            setFormData(p => ({ ...p, budget: { ...p.budget, currency: v } }))
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SAR">SAR ﷼</SelectItem>
                            <SelectItem value="USD">USD $</SelectItem>
                            <SelectItem value="EUR">EUR €</SelectItem>
                            <SelectItem value="AED">AED</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Total"
                          value={formData.budget.total}
                          onChange={(e) =>
                            setFormData(p => ({ ...p, budget: { ...p.budget, total: e.target.value } }))
                          }
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Daily cap"
                          value={formData.budget.dailyCap}
                          onChange={(e) =>
                            setFormData(p => ({ ...p, budget: { ...p.budget, dailyCap: e.target.value } }))
                          }
                          className="h-9"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Currency · Total budget · Daily cap</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Scheduling ───────────────────────────────────────────────── */}
            <div className="space-y-6 p-6 border rounded-lg">
              <h3 className="text-lg font-semibold">Scheduling</h3>

              {/* Date range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover open={isStartCalendarOpen} onOpenChange={setIsStartCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.schedule.startTime
                          ? formData.schedule.startTime.toLocaleDateString()
                          : <span className="text-muted-foreground">Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.schedule.startTime}
                        onSelect={(d) => handleDateSelect('startTime', d)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover open={isEndCalendarOpen} onOpenChange={setIsEndCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.schedule.endTime
                          ? formData.schedule.endTime.toLocaleDateString()
                          : <span className="text-muted-foreground">Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.schedule.endTime}
                        onSelect={(d) => handleDateSelect('endTime', d)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Timezone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select
                    value={formData.schedule.timezone}
                    onValueChange={(v) =>
                      setFormData(p => ({ ...p, schedule: { ...p.schedule, timezone: v } }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map(tz => (
                        <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Seasonal tag */}
                <div className="space-y-2">
                  <Label>Seasonal Tag</Label>
                  <Select
                    value={formData.schedule.seasonalTag}
                    onValueChange={(v) =>
                      setFormData(p => ({ ...p, schedule: { ...p.schedule, seasonalTag: v } }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEASONAL_TAGS.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Custom Hijri range */}
              {showCustomSchedule && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="col-span-2 flex items-center gap-2 mb-1">
                    <Moon className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Hijri Calendar Range
                    </span>
                    <span className="text-xs text-amber-600 ml-1">format: year/month/day</span>
                  </div>
                  <div className="space-y-2">
                    <Label>Hijri Start Date</Label>
                    <Input
                      value={formData.schedule.hijriStart}
                      onChange={(e) =>
                        setFormData(p => ({ ...p, schedule: { ...p.schedule, hijriStart: e.target.value } }))
                      }
                      placeholder="1445/9/1  (1 Ramadan 1445)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hijri End Date</Label>
                    <Input
                      value={formData.schedule.hijriEnd}
                      onChange={(e) =>
                        setFormData(p => ({ ...p, schedule: { ...p.schedule, hijriEnd: e.target.value } }))
                      }
                      placeholder="1445/9/30  (30 Ramadan 1445)"
                    />
                  </div>
                </div>
              )}

              {/* Prayer time blackout */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-primary" />
                    <Label className="text-sm font-medium cursor-pointer">Prayer Time Blackout</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pause delivery during the 5 daily prayer windows. Uses Umm al-Qura astronomical times.
                  </p>
                </div>
                <Switch
                  checked={formData.schedule.prayerTimeBlackout}
                  onCheckedChange={(checked) =>
                    setFormData(p => ({ ...p, schedule: { ...p.schedule, prayerTimeBlackout: checked } }))
                  }
                />
              </div>

              {formData.schedule.prayerTimeBlackout && (
                <div className="space-y-2">
                  <Label>Reference City for Prayer Times</Label>
                  <Select
                    value={formData.schedule.prayerTimeCity}
                    onValueChange={(v) =>
                      setFormData(p => ({ ...p, schedule: { ...p.schedule, prayerTimeCity: v } }))
                    }
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SAUDI_CITIES.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Prayer times are calculated for this city and applied across all users in this campaign.
                  </p>
                </div>
              )}
            </div>

            {/* ── Actions ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between pt-4">
              <div className="text-xs text-muted-foreground">
                Campaign will be saved as <Badge variant="outline">draft</Badge> until submitted for review.
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={onCampaignCreated} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isEditMode ? 'Save Changes' : 'Create Campaign'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
