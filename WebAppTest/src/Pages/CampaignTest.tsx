import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play, RefreshCw, Bell, X, Monitor, Smartphone, Tablet,
  CheckCircle, AlertCircle, Clock, Zap, ChevronDown, ChevronUp,
  ExternalLink, Eye, MousePointer
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Campaign {
  _id: string;
  name: string;
  type: 'banner' | 'popup' | 'inapp_notification' | 'push_notification' | 'sms' | 'whatsapp' | string;
  subType?: string;
  status: string;
  priority: number;
  content?: {
    ar?: ContentBlock;
    en?: ContentBlock;
  };
  metadata?: Record<string, any>;
  rules?: any;
  placementIds?: string[];
}

interface ContentBlock {
  headline?: string;
  body?: string;
  ctaText?: string;
  ctaUrl?: string;
  mediaUrl?: string;
  mediaType?: string;
  direction?: string;
}

interface EventLog {
  id: string;
  timestamp: string;
  type: 'impression' | 'click' | 'dismiss' | 'push_granted' | 'push_denied' | 'evaluate' | 'error';
  campaignId?: string;
  campaignName?: string;
  detail?: string;
}

interface UserContext {
  userId: string;
  segments: string[];
  platform: string;
  country: string;
  language: 'en' | 'ar';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sdk = () => (window as any).BannerSDK?.getInstance?.();

function getContent(campaign: Campaign, lang: 'en' | 'ar'): ContentBlock | null {
  return campaign.content?.[lang] ?? campaign.content?.en ?? campaign.content?.ar ?? null;
}

function logEntry(
  type: EventLog['type'],
  detail?: string,
  campaign?: Campaign
): EventLog {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toLocaleTimeString(),
    type,
    campaignId: campaign?._id,
    campaignName: campaign?.name,
    detail,
  };
}

// ─── Banner Renderer ─────────────────────────────────────────────────────────

function BannerCard({
  campaign, lang, onImpression, onClick,
}: {
  campaign: Campaign;
  lang: 'en' | 'ar';
  onImpression: (c: Campaign) => void;
  onClick: (c: Campaign) => void;
}) {
  const content = getContent(campaign, lang);
  const isRtl = lang === 'ar';

  useEffect(() => { onImpression(campaign); }, [campaign._id]);

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="rounded-xl overflow-hidden border border-blue-200 bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-md"
    >
      {content?.mediaUrl && (
        <img src={content.mediaUrl} alt="" className="w-full h-32 object-cover opacity-80" />
      )}
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-75 mb-1">
          {campaign.type} · {campaign.subType ?? 'banner'} · P{campaign.priority}
        </p>
        <h3 className="text-base font-bold leading-tight">
          {content?.headline ?? campaign.name}
        </h3>
        {content?.body && (
          <p className="text-sm opacity-90 mt-1 line-clamp-2">{content.body}</p>
        )}
        {content?.ctaText && (
          <button
            onClick={() => onClick(campaign)}
            className="mt-3 px-4 py-1.5 bg-white text-blue-700 rounded-full text-sm font-semibold hover:bg-blue-50 transition-colors"
          >
            {content.ctaText}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Popup Renderer ──────────────────────────────────────────────────────────

function PopupOverlay({
  campaign, lang, onImpression, onClick, onDismiss,
}: {
  campaign: Campaign;
  lang: 'en' | 'ar';
  onImpression: (c: Campaign) => void;
  onClick: (c: Campaign) => void;
  onDismiss: (c: Campaign) => void;
}) {
  const content = getContent(campaign, lang);
  const isRtl = lang === 'ar';

  useEffect(() => { onImpression(campaign); }, [campaign._id]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        {content?.mediaUrl && (
          <img src={content.mediaUrl} alt="" className="w-full h-44 object-cover" />
        )}
        <div className="p-5">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-900 leading-tight">
              {content?.headline ?? campaign.name}
            </h3>
            <button
              onClick={() => onDismiss(campaign)}
              className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {content?.body && (
            <p className="text-sm text-gray-600 mt-1">{content.body}</p>
          )}
          <div className="mt-4 flex gap-2">
            {content?.ctaText && (
              <button
                onClick={() => onClick(campaign)}
                className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                {content.ctaText}
              </button>
            )}
            <button
              onClick={() => onDismiss(campaign)}
              className="px-4 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── In-App Notification Renderer ────────────────────────────────────────────

function InAppToast({
  campaign, lang, onImpression, onClick, onDismiss,
}: {
  campaign: Campaign;
  lang: 'en' | 'ar';
  onImpression: (c: Campaign) => void;
  onClick: (c: Campaign) => void;
  onDismiss: (c: Campaign) => void;
}) {
  const content = getContent(campaign, lang);
  const isRtl = lang === 'ar';

  useEffect(() => {
    onImpression(campaign);
    const timer = setTimeout(() => onDismiss(campaign), 6000);
    return () => clearTimeout(timer);
  }, [campaign._id]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="bg-gray-900 text-white rounded-2xl shadow-xl p-4 flex items-start gap-3 animate-in slide-in-from-top"
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
          <Bell className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">
            {content?.headline ?? campaign.name}
          </p>
          {content?.body && (
            <p className="text-xs text-gray-300 mt-0.5 line-clamp-2">{content.body}</p>
          )}
          {content?.ctaText && (
            <button
              onClick={() => onClick(campaign)}
              className="mt-2 text-blue-400 text-xs font-semibold hover:text-blue-300"
            >
              {content.ctaText} →
            </button>
          )}
        </div>
        <button onClick={() => onDismiss(campaign)} className="text-gray-400 hover:text-white flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Event Log ────────────────────────────────────────────────────────────────

const EVENT_COLORS: Record<EventLog['type'], string> = {
  impression: 'text-blue-600',
  click: 'text-green-600',
  dismiss: 'text-gray-500',
  push_granted: 'text-emerald-600',
  push_denied: 'text-red-500',
  evaluate: 'text-purple-600',
  error: 'text-red-600',
};

const EVENT_ICONS: Record<EventLog['type'], React.ReactNode> = {
  impression: <Eye className="w-3.5 h-3.5" />,
  click: <MousePointer className="w-3.5 h-3.5" />,
  dismiss: <X className="w-3.5 h-3.5" />,
  push_granted: <CheckCircle className="w-3.5 h-3.5" />,
  push_denied: <AlertCircle className="w-3.5 h-3.5" />,
  evaluate: <Zap className="w-3.5 h-3.5" />,
  error: <AlertCircle className="w-3.5 h-3.5" />,
};

function EventLogPanel({ logs, onClear }: { logs: EventLog[]; onClear: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length]);

  return (
    <div className="bg-gray-900 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h3 className="text-white font-semibold text-sm">Analytics Event Log</h3>
        <button
          onClick={onClear}
          className="text-gray-400 hover:text-white text-xs transition-colors"
        >
          Clear
        </button>
      </div>
      <div ref={scrollRef} className="h-48 overflow-y-auto p-3 space-y-1.5 font-mono text-xs">
        {logs.length === 0 ? (
          <p className="text-gray-500 text-center pt-4">No events yet. Run an evaluation.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2">
              <span className="text-gray-500 flex-shrink-0 w-14">{log.timestamp}</span>
              <span className={`flex items-center gap-1 flex-shrink-0 ${EVENT_COLORS[log.type]}`}>
                {EVENT_ICONS[log.type]}
                <span className="uppercase font-bold">{log.type}</span>
              </span>
              <span className="text-gray-300 truncate">
                {log.campaignName && <span className="text-yellow-400">[{log.campaignName}]</span>}
                {log.detail && <span className="text-gray-400"> {log.detail}</span>}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PLACEMENTS = ['dashboard_top', 'home_fullscreen', 'card_detail', 'profile_bottom', 'any'];

export default function CampaignTest() {
  const [userCtx, setUserCtx] = useState<UserContext>({
    userId: localStorage.getItem('user_id') ?? 'test_user_1',
    segments: [],
    platform: 'web',
    country: 'SA',
    language: 'en',
  });

  const [placementId, setPlacementId] = useState('dashboard_top');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [pushStatus, setPushStatus] = useState<string>('default');
  const [showControlPanel, setShowControlPanel] = useState(true);

  // Active renders
  const [activePopup, setActivePopup] = useState<Campaign | null>(null);
  const [activeToast, setActiveToast] = useState<Campaign | null>(null);

  // Push status on load
  useEffect(() => {
    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    } else {
      setPushStatus('unsupported');
    }
  }, []);

  const addLog = useCallback((entry: EventLog) => {
    setLogs((prev) => [...prev.slice(-99), entry]);
  }, []);

  // ── Evaluation ──────────────────────────────────────────────────────────────

  const runEvaluation = useCallback(async () => {
    const s = sdk();
    if (!s) {
      setError('SDK not initialized — check console for details.');
      addLog(logEntry('error', 'SDK not initialized'));
      return;
    }

    setLoading(true);
    setError(null);
    addLog(logEntry('evaluate', `placement="${placementId}" userId="${userCtx.userId}"`));

    try {
      // Identify user first so SDK uses correct userId
      s.identify(userCtx.userId);

      const results: Campaign[] = await s.getActiveCampaigns(placementId, {
        segments: userCtx.segments,
        attributes: { country: userCtx.country, platform: userCtx.platform },
        forceRefresh: true,
      });

      setCampaigns(results ?? []);
      addLog(logEntry('evaluate', `→ ${results?.length ?? 0} campaign(s) returned`));

      // Auto-show first popup/toast
      const firstPopup = results?.find((c) => c.type === 'popup');
      const firstToast = results?.find((c) => c.type === 'inapp_notification');
      if (firstPopup) setActivePopup(firstPopup);
      else if (firstToast) setActiveToast(firstToast);
    } catch (err: any) {
      setError(err.message ?? 'Evaluation failed');
      addLog(logEntry('error', err.message ?? 'Evaluation failed'));
    } finally {
      setLoading(false);
    }
  }, [placementId, userCtx, addLog]);

  // ── Campaign actions ────────────────────────────────────────────────────────

  const handleImpression = useCallback((c: Campaign) => {
    addLog(logEntry('impression', undefined, c));
    sdk()?.trackEvent('impression', c._id).catch(() => {});
  }, [addLog]);

  const handleClick = useCallback((c: Campaign) => {
    addLog(logEntry('click', undefined, c));
    sdk()?.trackEvent('click', c._id).catch(() => {});
    setActivePopup(null);
    setActiveToast(null);
  }, [addLog]);

  const handleDismiss = useCallback((c: Campaign) => {
    addLog(logEntry('dismiss', undefined, c));
    sdk()?.trackEvent('dismiss', c._id).catch(() => {});
    setActivePopup(null);
    setActiveToast(null);
  }, [addLog]);

  // ── Push Permission ─────────────────────────────────────────────────────────

  const handleRequestPush = useCallback(async () => {
    const s = sdk();
    if (!s) return;
    const result = await s.requestPushPermission();
    setPushStatus(result);
    addLog(logEntry(result === 'granted' ? 'push_granted' : 'push_denied', `permission=${result}`));
  }, [addLog]);

  const handleShowPush = useCallback((campaign: Campaign) => {
    const s = sdk();
    if (!s) return;
    const content = getContent(campaign, userCtx.language);
    s.showPushNotification({
      title: content?.headline ?? campaign.name,
      body: content?.body ?? '',
      icon: content?.mediaUrl ?? '',
      campaignId: campaign._id,
    });
    addLog(logEntry('impression', 'push notification shown', campaign));
  }, [userCtx.language, addLog]);

  // ── Render helpers ──────────────────────────────────────────────────────────

  const bannerCampaigns = campaigns.filter((c) => c.type === 'banner' || c.type === 'video');
  const popupCampaigns = campaigns.filter((c) => c.type === 'popup');
  const inappCampaigns = campaigns.filter((c) => c.type === 'inapp_notification');
  const pushCampaigns = campaigns.filter((c) => c.type === 'push_notification');
  const otherCampaigns = campaigns.filter(
    (c) => !['banner', 'video', 'popup', 'inapp_notification', 'push_notification'].includes(c.type)
  );

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Campaign SDK Test</h1>
          <p className="text-xs text-gray-500 mt-0.5">Evaluate and preview live campaigns</p>
        </div>
        <button
          onClick={runEvaluation}
          disabled={loading}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-60"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          Evaluate
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Control Panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowControlPanel((p) => !p)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700"
        >
          <span>User Context &amp; Settings</span>
          {showControlPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showControlPanel && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-50">
            {/* User ID */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">User ID</label>
              <input
                type="text"
                value={userCtx.userId}
                onChange={(e) => setUserCtx((p) => ({ ...p, userId: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            {/* Placement */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Placement ID</label>
              <select
                value={placementId}
                onChange={(e) => setPlacementId(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              >
                {PLACEMENTS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Language + Platform */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Language</label>
                <select
                  value={userCtx.language}
                  onChange={(e) => setUserCtx((p) => ({ ...p, language: e.target.value as 'en' | 'ar' }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                >
                  <option value="en">English</option>
                  <option value="ar">Arabic (RTL)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Platform</label>
                <select
                  value={userCtx.platform}
                  onChange={(e) => setUserCtx((p) => ({ ...p, platform: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                >
                  <option value="web">Web</option>
                  <option value="ios">iOS</option>
                  <option value="android">Android</option>
                </select>
              </div>
            </div>

            {/* Country */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Country</label>
              <select
                value={userCtx.country}
                onChange={(e) => setUserCtx((p) => ({ ...p, country: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              >
                <option value="SA">Saudi Arabia (SA)</option>
                <option value="AE">UAE (AE)</option>
                <option value="US">United States (US)</option>
                <option value="GB">United Kingdom (GB)</option>
              </select>
            </div>

            {/* Push Permission */}
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Push permission</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  pushStatus === 'granted' ? 'bg-green-100 text-green-700' :
                  pushStatus === 'denied' ? 'bg-red-100 text-red-600' :
                  pushStatus === 'unsupported' ? 'bg-gray-200 text-gray-500' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {pushStatus}
                </span>
              </div>
              {pushStatus !== 'granted' && pushStatus !== 'unsupported' && (
                <button
                  onClick={handleRequestPush}
                  className="text-xs text-blue-600 font-semibold hover:text-blue-800"
                >
                  Request
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Banners', count: bannerCampaigns.length, color: 'bg-blue-50 text-blue-700' },
            { label: 'Popups', count: popupCampaigns.length, color: 'bg-purple-50 text-purple-700' },
            { label: 'In-App', count: inappCampaigns.length, color: 'bg-amber-50 text-amber-700' },
            { label: 'Push', count: pushCampaigns.length, color: 'bg-green-50 text-green-700' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
              <p className="text-2xl font-bold">{s.count}</p>
              <p className="text-xs font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {campaigns.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400">
          <Monitor className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Press Evaluate to fetch matching campaigns</p>
          <p className="text-xs mt-1 opacity-70">Make sure you have active campaigns in the dashboard</p>
        </div>
      )}

      {/* ── Banner Campaigns ── */}
      {bannerCampaigns.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Banners / Video ({bannerCampaigns.length})
          </h2>
          {bannerCampaigns.map((c) => (
            <BannerCard
              key={c._id}
              campaign={c}
              lang={userCtx.language}
              onImpression={handleImpression}
              onClick={handleClick}
            />
          ))}
        </section>
      )}

      {/* ── Popup Campaigns ── */}
      {popupCampaigns.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Popups ({popupCampaigns.length})
          </h2>
          <div className="space-y-2">
            {popupCampaigns.map((c) => (
              <div
                key={c._id}
                className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{c.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">popup · P{c.priority}</p>
                </div>
                <button
                  onClick={() => setActivePopup(c)}
                  className="ml-3 flex-shrink-0 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Preview
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── In-App Notification Campaigns ── */}
      {inappCampaigns.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            In-App Notifications ({inappCampaigns.length})
          </h2>
          <div className="space-y-2">
            {inappCampaigns.map((c) => (
              <div
                key={c._id}
                className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{c.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">in_app · P{c.priority}</p>
                </div>
                <button
                  onClick={() => setActiveToast(c)}
                  className="ml-3 flex-shrink-0 text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Show
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Push Notification Campaigns ── */}
      {pushCampaigns.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Push Notifications ({pushCampaigns.length})
          </h2>
          <div className="space-y-2">
            {pushCampaigns.map((c) => {
              const content = getContent(c, userCtx.language);
              return (
                <div
                  key={c._id}
                  className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {content?.headline ?? '—'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleShowPush(c)}
                      disabled={pushStatus !== 'granted'}
                      className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      Send
                    </button>
                  </div>
                  {pushStatus !== 'granted' && (
                    <p className="mt-2 text-xs text-amber-600 bg-amber-50 rounded-lg px-2 py-1">
                      Grant push permission above to fire this notification
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Other campaign types (SMS, WhatsApp, etc.) ── */}
      {otherCampaigns.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Other ({otherCampaigns.length})
          </h2>
          {otherCampaigns.map((c) => (
            <div
              key={c._id}
              className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-4 h-4 text-gray-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{c.name}</p>
                <p className="text-xs text-gray-500">{c.type} · P{c.priority}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── Event Log ── */}
      <EventLogPanel logs={logs} onClear={() => setLogs([])} />

      {/* ── Overlays ── */}
      {activePopup && (
        <PopupOverlay
          campaign={activePopup}
          lang={userCtx.language}
          onImpression={handleImpression}
          onClick={handleClick}
          onDismiss={handleDismiss}
        />
      )}

      {activeToast && (
        <InAppToast
          campaign={activeToast}
          lang={userCtx.language}
          onImpression={handleImpression}
          onClick={handleClick}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  );
}
