import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import { Skeleton } from '../ui/skeleton';
import {
  Users, Target, Plus, Edit, Trash2, Eye, MoreHorizontal, Search,
  Loader2, AlertCircle, ChevronDown, TrendingUp, Zap, RefreshCw
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

import { getSegments, createSegment, estimateAudience, getEnrichmentAttributes } from '../../lib/segments';
import { Segment, NewSegmentData, SegmentRule, AudienceEstimate, EnrichmentAttributeMeta } from '../../lib/segments/types';

// ─── Field catalogue ──────────────────────────────────────────────────────────
// Static groups — enrichment fields are added dynamically at runtime.
const FIELD_GROUPS = [
  {
    label: 'Demographic',
    fields: [
      { value: 'demographic.age',              label: 'Age',                    type: 'number'  },
      { value: 'demographic.gender',           label: 'Gender',                 type: 'string'  },
      { value: 'demographic.country',          label: 'Country',                type: 'string'  },
      { value: 'demographic.city',             label: 'City',                   type: 'string'  },
      { value: 'demographic.nationality',      label: 'Nationality',            type: 'string'  },
      { value: 'demographic.preferredLanguage',label: 'Preferred Language',     type: 'string'  },
      { value: 'demographic.language',         label: 'App Language',           type: 'string'  },
      { value: 'demographic.subscriptionTier', label: 'Subscription Tier',      type: 'string'  },
      { value: 'demographic.accountAgeDays',   label: 'Account Age (days)',      type: 'number'  },
    ],
  },
  {
    label: 'Behavioral',
    fields: [
      { value: 'behavioral.totalSessions',         label: 'Total Sessions',           type: 'number'  },
      { value: 'behavioral.purchaseCount',          label: 'Purchase Count',           type: 'number'  },
      { value: 'behavioral.totalSpent',             label: 'Total Spent (SAR)',        type: 'number'  },
      { value: 'behavioral.averageOrderValue',      label: 'Avg. Order Value (SAR)',   type: 'number'  },
      { value: 'behavioral.engagementScore',        label: 'Engagement Score (0–100)', type: 'number'  },
      { value: 'behavioral.churnRisk',              label: 'Churn Risk (0–100)',        type: 'number'  },
      { value: 'behavioral.lifetimeValue',          label: 'Lifetime Value (SAR)',     type: 'number'  },
      { value: 'behavioral.prayerTimeSensitive',    label: 'Prayer-Time Sensitive',    type: 'boolean' },
      { value: 'behavioral.ramadanEngagementBoost', label: 'Ramadan Engagement Boost', type: 'boolean' },
      { value: 'behavioral.hajjUmrahInterest',      label: 'Hajj / Umrah Interest',    type: 'boolean' },
    ],
  },
  {
    label: 'Device',
    fields: [
      { value: 'device.platform',         label: 'Platform',            type: 'string'  },
      { value: 'device.osVersion',        label: 'OS Version',          type: 'string'  },
      { value: 'device.appVersion',       label: 'App Version',         type: 'appver'  },
      { value: 'device.networkOperator',  label: 'Network Operator',    type: 'string'  },
      { value: 'device.connectionType',   label: 'Connection Type',     type: 'string'  },
    ],
  },
  {
    label: 'Location',
    fields: [
      { value: 'location.country',   label: 'Country (IP)',  type: 'string'   },
      { value: 'location.city',      label: 'City (IP)',     type: 'string'   },
      { value: 'location.geo',       label: 'Geo Radius',    type: 'geo'      },
    ],
  },
  {
    label: 'Consent (PDPL)',
    fields: [
      { value: 'consent.marketing',  label: 'Marketing Consent',  type: 'consent' },
      { value: 'consent.push',       label: 'Push Consent',        type: 'consent' },
      { value: 'consent.sms',        label: 'SMS Consent',         type: 'consent' },
      { value: 'consent.whatsapp',   label: 'WhatsApp Consent',    type: 'consent' },
      { value: 'consent.pdplOptOut', label: 'PDPL Opt-Out',        type: 'consent' },
    ],
  },
  {
    label: 'Metadata / Status',
    fields: [
      { value: 'metadata.isActive',   label: 'Is Active',   type: 'boolean' },
      { value: 'metadata.isPremium',  label: 'Is Premium',  type: 'boolean' },
      { value: 'metadata.isNewUser',  label: 'Is New User', type: 'boolean' },
    ],
  },
];

const ALL_STATIC_FIELDS = FIELD_GROUPS.flatMap(g => g.fields);

/** Look up display metadata for a rule field. Accepts an optional dynamic list so
 *  enrichment fields are labelled with their human-readable key, not a raw path. */
function getFieldMeta(
  fieldValue: string,
  dynamicFields: { value: string; label: string; type: string }[] = []
) {
  return (
    ALL_STATIC_FIELDS.find(f => f.value === fieldValue) ??
    dynamicFields.find(f => f.value === fieldValue) ??
    { value: fieldValue, label: fieldValue, type: 'string' }
  );
}

/** Convert a camelCase key to "Title Case With Spaces". */
function labelFromKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

function getOperatorsForType(type: string) {
  switch (type) {
    case 'number':
      return [
        { value: 'equals',       label: 'equals'           },
        { value: 'not_equals',   label: 'does not equal'   },
        { value: 'greater_than', label: 'is greater than'  },
        { value: 'less_than',    label: 'is less than'     },
        { value: 'between',      label: 'is between'       },
      ];
    case 'boolean':
    case 'consent':
      return [
        { value: 'is_true',  label: 'is true'  },
        { value: 'is_false', label: 'is false' },
      ];
    case 'appver':
      return [
        { value: 'equals',          label: 'equals'             },
        { value: 'app_version_gte', label: 'is at least (≥)'    },
        { value: 'not_equals',      label: 'does not equal'     },
      ];
    case 'geo':
      return [
        { value: 'geo_radius', label: 'within radius (km)' },
      ];
    default: // string
      return [
        { value: 'equals',       label: 'equals'            },
        { value: 'not_equals',   label: 'does not equal'    },
        { value: 'contains',     label: 'contains'          },
        { value: 'not_contains', label: 'does not contain'  },
        { value: 'starts_with',  label: 'starts with'       },
        { value: 'ends_with',    label: 'ends with'         },
        { value: 'in',           label: 'is one of'         },
      ];
  }
}

// ─── Rule row ─────────────────────────────────────────────────────────────────
interface RuleRowProps {
  rule: SegmentRule;
  index: number;
  canDelete: boolean;
  onChange: (index: number, field: keyof SegmentRule, value: any) => void;
  onDelete: (index: number) => void;
  matchCount?: number;
  /** Combined static + enrichment field groups for the field selector. */
  allFieldGroups: { label: string; fields: { value: string; label: string; type: string }[] }[];
}

function RuleRow({ rule, index, canDelete, onChange, onDelete, matchCount, allFieldGroups }: RuleRowProps) {
  const dynamicFields = allFieldGroups.flatMap(g => g.fields);
  const meta = getFieldMeta(rule.field, dynamicFields);
  const operators = getOperatorsForType(meta.type);

  // Reset operator when field type changes and operator is no longer valid
  const handleFieldChange = (val: string) => {
    const newMeta = getFieldMeta(val);
    const newOps = getOperatorsForType(newMeta.type);
    const currentOpStillValid = newOps.some(o => o.value === rule.operator);
    onChange(index, 'field', val);
    if (!currentOpStillValid) onChange(index, 'operator', newOps[0].value);
    // Reset value on field change
    onChange(index, 'value', '');
  };

  const renderValueInput = () => {
    // Consent / boolean: no value needed (operator is is_true / is_false)
    if (meta.type === 'consent' || (meta.type === 'boolean' && (rule.operator === 'is_true' || rule.operator === 'is_false'))) {
      return (
        <div className="h-9 flex items-center">
          <span className="text-xs text-muted-foreground italic">No value needed</span>
        </div>
      );
    }

    // Legacy boolean "equals" fallback
    if (meta.type === 'boolean') {
      return (
        <Select value={String(rule.value)} onValueChange={(v) => onChange(index, 'value', v)}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="true">True</SelectItem>
            <SelectItem value="false">False</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    // Geo radius: { lat, lng, radiusKm }
    if (rule.operator === 'geo_radius') {
      const geo = typeof rule.value === 'object' && rule.value !== null ? rule.value as any : {};
      const update = (field: string, val: string) =>
        onChange(index, 'value', { ...geo, [field]: val });
      return (
        <div className="flex items-center gap-1">
          <Input
            className="h-9 w-20"
            type="number"
            placeholder="Lat"
            value={geo.lat ?? ''}
            onChange={(e) => update('lat', e.target.value)}
          />
          <Input
            className="h-9 w-20"
            type="number"
            placeholder="Lng"
            value={geo.lng ?? ''}
            onChange={(e) => update('lng', e.target.value)}
          />
          <Input
            className="h-9 w-16"
            type="number"
            placeholder="km"
            value={geo.radiusKm ?? ''}
            onChange={(e) => update('radiusKm', e.target.value)}
          />
        </div>
      );
    }

    // Between range
    if (rule.operator === 'between') {
      const parts = Array.isArray(rule.value) ? rule.value : ['', ''];
      return (
        <div className="flex items-center gap-1">
          <Input
            className="h-9 w-20"
            type="number"
            placeholder="Min"
            value={parts[0] ?? ''}
            onChange={(e) => onChange(index, 'value', [e.target.value, parts[1]])}
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            className="h-9 w-20"
            type="number"
            placeholder="Max"
            value={parts[1] ?? ''}
            onChange={(e) => onChange(index, 'value', [parts[0], e.target.value])}
          />
        </div>
      );
    }

    // Comma-separated list
    if (rule.operator === 'in') {
      return (
        <Input
          className="h-9"
          placeholder="val1, val2, val3"
          value={Array.isArray(rule.value) ? rule.value.join(', ') : rule.value}
          onChange={(e) => onChange(index, 'value', e.target.value.split(',').map(s => s.trim()))}
        />
      );
    }

    // Platform selector shortcut
    if (rule.field === 'device.platform') {
      return (
        <Select value={String(rule.value)} onValueChange={(v) => onChange(index, 'value', v)}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Platform" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ios">iOS</SelectItem>
            <SelectItem value="android">Android</SelectItem>
            <SelectItem value="web">Web</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    // Default text / number input
    return (
      <Input
        className="h-9"
        type={meta.type === 'number' || meta.type === 'appver' ? 'text' : 'text'}
        placeholder={meta.type === 'appver' ? 'e.g. 2.5.0' : 'Value'}
        value={rule.value ?? ''}
        onChange={(e) => onChange(index, 'value', e.target.value)}
      />
    );
  };

  return (
    <div className="flex items-end gap-2 p-3 bg-muted/30 rounded-lg border border-border/50">
      {/* Field selector */}
      <div className="flex-1 min-w-0 space-y-1">
        <Label className="text-xs text-muted-foreground">Field</Label>
        <Select value={rule.field} onValueChange={handleFieldChange}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Select a field…" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {allFieldGroups.map(group => (
              <React.Fragment key={group.label}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </div>
                {group.fields.map(f => (
                  <SelectItem key={f.value} value={f.value} className="text-xs pl-4">
                    {f.label}
                  </SelectItem>
                ))}
              </React.Fragment>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Operator */}
      <div className="w-44 space-y-1">
        <Label className="text-xs text-muted-foreground">Condition</Label>
        <Select value={rule.operator} onValueChange={(v) => onChange(index, 'operator', v)}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {operators.map(op => (
              <SelectItem key={op.value} value={op.value} className="text-xs">{op.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Value */}
      <div className="flex-1 min-w-0 space-y-1">
        <Label className="text-xs text-muted-foreground">Value</Label>
        {renderValueInput()}
      </div>

      {/* Per-rule match badge */}
      {matchCount !== undefined && (
        <div className="shrink-0 text-center space-y-1">
          <Label className="text-xs text-muted-foreground">Matches</Label>
          <div className="h-9 flex items-center justify-center">
            <Badge variant="secondary" className="text-xs font-mono">{matchCount.toLocaleString()}</Badge>
          </div>
        </div>
      )}

      {/* Delete */}
      <Button
        variant="ghost"
        size="icon"
        type="button"
        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onDelete(index)}
        disabled={!canDelete}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ─── Estimate panel ───────────────────────────────────────────────────────────
function EstimatePanel({ estimate, loading, stale }: { estimate: AudienceEstimate | null; loading: boolean; stale?: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
        <span className="text-sm text-blue-700 dark:text-blue-300">Calculating audience estimate…</span>
      </div>
    );
  }
  if (!estimate) return null;

  const pct = estimate.percentage;
  const barColor = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-blue-500' : 'bg-amber-500';

  return (
    <div className={`p-4 rounded-lg border space-y-3 transition-opacity ${stale ? 'opacity-60 bg-muted/40 border-muted-foreground/20' : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className={`w-4 h-4 ${stale ? 'text-muted-foreground' : 'text-blue-600'}`} />
          <span className={`text-sm font-semibold ${stale ? 'text-muted-foreground' : 'text-blue-800 dark:text-blue-200'}`}>
            Estimated Reach
          </span>
          {stale && (
            <span className="text-xs text-muted-foreground italic">(rules changed — re-estimate to refresh)</span>
          )}
        </div>
        <div className="text-right">
          <span className={`text-2xl font-bold ${stale ? 'text-muted-foreground' : 'text-blue-700 dark:text-blue-300'}`}>
            {estimate.estimatedCount.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground ml-1">
            / {estimate.totalUsers.toLocaleString()} users
          </span>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Coverage</span>
          <span className="font-medium">{pct}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${stale ? 'bg-muted-foreground/40' : barColor}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────
const blankRule = (): SegmentRule => ({ field: '', operator: 'equals', value: '' });
const initialFormState = (): NewSegmentData => ({
  name: '',
  description: '',
  rules: [blankRule()],
  logicalOperator: 'AND',
});

const formatDate = (d: string) => !d ? '' : new Date(d).toLocaleDateString('en-CA');

export default function SegmentsView() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState<NewSegmentData>(initialFormState());
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Enrichment attributes — populated from the CSV upload discovery endpoint.
  const [enrichmentAttrs, setEnrichmentAttrs] = useState<EnrichmentAttributeMeta[]>([]);

  // Total users tracked in the database (fetched via empty-rules estimate on mount).
  const [totalTrackedUsers, setTotalTrackedUsers] = useState<number | null>(null);

  // Estimate state
  const [estimate, setEstimate] = useState<AudienceEstimate | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [isEstimateStale, setIsEstimateStale] = useState(false);

  // Build the dynamic field groups: static groups + "Custom Data (CSV)" if attrs exist.
  const allFieldGroups = React.useMemo(() => {
    if (enrichmentAttrs.length === 0) return FIELD_GROUPS;
    return [
      ...FIELD_GROUPS,
      {
        label: 'Custom Data (CSV)',
        fields: enrichmentAttrs.map(attr => ({
          value: `enrichment.${attr.key}`,
          label: `${labelFromKey(attr.key)} (${attr.recordCount.toLocaleString()} records)`,
          // Treat 'date' as 'string' for operator purposes (the engine handles it).
          type: attr.type === 'date' ? 'string' : attr.type,
        })),
      },
    ];
  }, [enrichmentAttrs]);

  const fetchSegments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getSegments();
      setSegments(res?.data || (res as any) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch segments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegments();

    // Fetch enrichment attributes so the rule-builder can show CSV column names.
    getEnrichmentAttributes()
      .then(res => setEnrichmentAttrs((res as any)?.data ?? []))
      .catch(() => { /* non-critical — builder still works with static fields */ });

    // Fetch total user count by calling estimate with no rules (no filters = all users).
    estimateAudience([], 'AND')
      .then(res => {
        const data: AudienceEstimate = (res as any)?.data ?? res;
        setTotalTrackedUsers(data.totalUsers ?? 0);
      })
      .catch(() => setTotalTrackedUsers(0));
  }, []);

  // A rule is "complete" when all three parts are filled and meaningful
  const isRuleComplete = (r: SegmentRule): boolean => {
    if (!r.field || !r.operator) return false;
    // is_true / is_false need no value
    if (r.operator === 'is_true' || r.operator === 'is_false') return true;
    // geo_radius needs lat + lng + radiusKm
    if (r.operator === 'geo_radius') {
      const v = r.value as any;
      return v && v.lat !== '' && v.lng !== '' && v.radiusKm !== '';
    }
    // between needs both parts non-empty
    if (r.operator === 'between') {
      return Array.isArray(r.value) && r.value[0] !== '' && r.value[1] !== '';
    }
    // everything else just needs a non-empty value
    if (Array.isArray(r.value)) return r.value.length > 0;
    return r.value !== '' && r.value !== undefined && r.value !== null;
  };

  // Mark estimate as stale whenever rules change after a prior estimate
  useEffect(() => {
    if (estimate !== null) {
      setIsEstimateStale(true);
    }
  }, [form.rules, form.logicalOperator]);

  // Manual estimate — called only when the user clicks "Estimate Audience"
  const handleEstimate = useCallback(async () => {
    const completeRules = form.rules.filter(isRuleComplete);
    if (completeRules.length === 0) return;
    setEstimateLoading(true);
    setIsEstimateStale(false);
    try {
      const res = await estimateAudience(completeRules, form.logicalOperator ?? 'AND');
      setEstimate(res?.data ?? (res as any));
    } catch {
      // Silently ignore estimate errors — don't block the form
      setEstimate(null);
    } finally {
      setEstimateLoading(false);
    }
  }, [form.rules, form.logicalOperator]);

  // Rule helpers
  const updateRule = (index: number, key: keyof SegmentRule, value: any) => {
    setForm(prev => ({
      ...prev,
      rules: prev.rules.map((r, i) => i === index ? { ...r, [key]: value } : r),
    }));
  };
  const addRule = () => setForm(prev => ({ ...prev, rules: [...prev.rules, blankRule()] }));
  const removeRule = (index: number) =>
    setForm(prev => ({ ...prev, rules: prev.rules.filter((_, i) => i !== index) }));

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError(null);
    try {
      if (!form.name.trim()) throw new Error('Segment name is required.');
      const validRules = form.rules.filter(r => r.field && r.operator);
      if (validRules.length === 0) throw new Error('At least one complete rule is required.');
      await createSegment({ ...form, rules: validRules });
      setShowCreateForm(false);
      setForm(initialFormState());
      setEstimate(null);
      setIsEstimateStale(false);
      await fetchSegments();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredSegments = segments.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTotalUsers = () => segments.reduce((sum, s) => sum + (s.userCount || 0), 0);

  if (loading) return <Skeleton className="h-[500px] w-full" />;
  if (error) return (
    <Card className="p-8 text-center text-destructive bg-destructive/10">
      <CardTitle>Error</CardTitle>
      <CardContent className="mt-4">{error}</CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audience</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Segment your users for precise campaign targeting</p>
        </div>
        <Button onClick={() => { setShowCreateForm(p => !p); setEstimate(null); setIsEstimateStale(false); setForm(initialFormState()); }}>
          <Plus className="w-4 h-4 mr-2" />
          {showCreateForm ? 'Cancel' : 'New Segment'}
        </Button>
      </div>

      {/* ── Stats cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Segments */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{segments.length}</div>
                <div className="text-xs text-muted-foreground">Total Segments</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users in Database */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {totalTrackedUsers === null
                    ? <span className="text-muted-foreground text-lg animate-pulse">…</span>
                    : totalTrackedUsers === 0
                      ? <span className="text-amber-500 text-base font-semibold">None yet</span>
                      : totalTrackedUsers >= 1000
                        ? `${(totalTrackedUsers / 1000).toFixed(1)}K`
                        : totalTrackedUsers.toLocaleString()
                  }
                </div>
                <div className="text-xs text-muted-foreground">
                  {totalTrackedUsers === 0 ? 'Grows as SDK tracks users' : 'Tracked Users'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CSV Attributes */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{enrichmentAttrs.length}</div>
                <div className="text-xs text-muted-foreground">
                  {enrichmentAttrs.length === 0 ? 'Upload CSV to enable' : 'CSV Attributes'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Avg Segment Size */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {segments.length > 0 ? Math.round(getTotalUsers() / segments.length).toLocaleString() : '—'}
                </div>
                <div className="text-xs text-muted-foreground">Avg. Segment Size</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Search bar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search segments…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {filteredSegments.length} of {segments.length} segment{segments.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <Card className="animate-in fade-in-50">
          <CardHeader>
            <CardTitle>Create New Segment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSubmit} className="space-y-6">
              {createError && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {createError}
                </div>
              )}

              {/* Name + description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="seg-name">Segment Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="seg-name"
                    className="mt-2"
                    placeholder="e.g., High-Value Customers"
                    value={form.name}
                    onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="seg-desc">Description</Label>
                  <Input
                    id="seg-desc"
                    className="mt-2"
                    placeholder="Brief description of this segment"
                    value={form.description}
                    onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                  />
                </div>
              </div>

              {/* Rules header with AND/OR toggle */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">Targeting Rules</Label>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Match</span>
                    <div className="flex rounded-md border overflow-hidden">
                      {(['AND', 'OR'] as const).map(op => (
                        <button
                          key={op}
                          type="button"
                          onClick={() => setForm(p => ({ ...p, logicalOperator: op }))}
                          className={`px-3 py-1 text-xs font-semibold transition-colors ${
                            form.logicalOperator === op
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {op}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {form.logicalOperator === 'AND' ? 'all rules' : 'any rule'}
                    </span>
                    <Button variant="outline" size="sm" type="button" onClick={addRule}>
                      <Plus className="w-3 h-3 mr-1" /> Add Rule
                    </Button>
                  </div>
                </div>

                {/* Rule rows */}
                <div className="space-y-2">
                  {form.rules.map((rule, index) => {
                    const bd = estimate?.breakdown?.[index];
                    return (
                      <RuleRow
                        key={index}
                        rule={rule}
                        index={index}
                        canDelete={form.rules.length > 1}
                        onChange={updateRule}
                        onDelete={removeRule}
                        matchCount={bd?.matchCount}
                        allFieldGroups={allFieldGroups}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Estimate audience button + result panel */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleEstimate}
                    disabled={estimateLoading || form.rules.filter(isRuleComplete).length === 0}
                    className="gap-2"
                  >
                    {estimateLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Estimating…</>
                      : <><TrendingUp className="w-4 h-4" /> Estimate Audience</>
                    }
                  </Button>
                  {estimate && !estimateLoading && (
                    <span className="text-xs text-muted-foreground">
                      {isEstimateStale ? 'Rules changed — click to refresh estimate' : 'Estimate is current'}
                    </span>
                  )}
                </div>
                <EstimatePanel estimate={estimate} loading={estimateLoading} stale={isEstimateStale} />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => { setShowCreateForm(false); setEstimate(null); setIsEstimateStale(false); }} disabled={isCreating}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Segment
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Segment grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredSegments.length === 0 ? (
          <div className="col-span-2 flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Target className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="text-lg font-semibold">No segments found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchTerm ? 'Try a different search term.' : 'Click "New Segment" to create your first audience segment.'}
            </p>
          </div>
        ) : (
          filteredSegments.map((segment, idx) => {
            const coverage = totalTrackedUsers && totalTrackedUsers > 0
              ? Math.min(Math.round((segment.userCount / totalTrackedUsers) * 100), 100)
              : 0;
            const barColor = coverage > 50 ? 'bg-green-500' : coverage > 20 ? 'bg-blue-500' : 'bg-amber-500';
            // Cycle through accent colours for the left border
            const accents = ['border-blue-500', 'border-green-500', 'border-purple-500', 'border-amber-500', 'border-pink-500'];
            const accent = accents[idx % accents.length];
            const dynFields = allFieldGroups.flatMap(g => g.fields);

            return (
              <Card key={segment._id} className={`flex flex-col border-l-4 ${accent} hover:shadow-md transition-shadow`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{segment.name}</CardTitle>
                      {segment.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{segment.description}</p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0 text-muted-foreground">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Eye className="w-4 h-4 mr-2" />View Users</DropdownMenuItem>
                        <DropdownMenuItem><Edit className="w-4 h-4 mr-2" />Edit Segment</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-4 flex-1">
                  {/* User count + coverage bar */}
                  <div>
                    <div className="flex items-end justify-between mb-1.5">
                      <div>
                        <span className="text-3xl font-bold">{(segment.userCount ?? 0).toLocaleString()}</span>
                        <span className="text-sm text-muted-foreground ml-1.5">users</span>
                      </div>
                      {totalTrackedUsers ? (
                        <span className="text-sm font-semibold text-muted-foreground">{coverage}%</span>
                      ) : null}
                    </div>
                    {totalTrackedUsers ? (
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                          style={{ width: `${coverage}%` }}
                        />
                      </div>
                    ) : null}
                    {totalTrackedUsers ? (
                      <p className="text-xs text-muted-foreground mt-1">{coverage}% of {totalTrackedUsers.toLocaleString()} tracked users</p>
                    ) : null}
                  </div>

                  {/* Rules badges */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Criteria</p>
                    <div className="flex flex-wrap gap-1.5">
                      {segment.rules?.length > 0 ? (
                        segment.rules.slice(0, 4).map((rule, i) => {
                          const meta = getFieldMeta(rule.field, dynFields);
                          return (
                            <Badge key={i} variant="secondary" className="font-normal text-xs gap-1 max-w-[220px]">
                              <span className="font-medium truncate">{meta.label}</span>
                              <span className="text-muted-foreground shrink-0">{rule.operator.replace(/_/g, ' ')}</span>
                              <span className="truncate">"{String(rule.value ?? '')}"</span>
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No criteria defined.</span>
                      )}
                      {(segment.rules?.length ?? 0) > 4 && (
                        <Badge variant="outline" className="text-xs">+{segment.rules.length - 4} more</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>

                <div className="px-6 pb-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>Created {formatDate(segment.createdAt)}</span>
                  <span>Modified {formatDate(segment.updatedAt)}</span>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
