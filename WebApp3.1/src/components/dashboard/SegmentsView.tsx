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

import { getSegments, createSegment, estimateAudience } from '../../lib/segments';
import { Segment, NewSegmentData, SegmentRule, AudienceEstimate } from '../../lib/segments/types';

// ─── Field catalogue ──────────────────────────────────────────────────────────
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

const ALL_FIELDS = FIELD_GROUPS.flatMap(g => g.fields);

function getFieldMeta(fieldValue: string) {
  return ALL_FIELDS.find(f => f.value === fieldValue) ?? { value: fieldValue, label: fieldValue, type: 'string' };
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
}

function RuleRow({ rule, index, canDelete, onChange, onDelete, matchCount }: RuleRowProps) {
  const meta = getFieldMeta(rule.field);
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
            {FIELD_GROUPS.map(group => (
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

  // Estimate state
  const [estimate, setEstimate] = useState<AudienceEstimate | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [isEstimateStale, setIsEstimateStale] = useState(false);

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

  useEffect(() => { fetchSegments(); }, []);

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
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Segments</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{segments.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{(getTotalUsers() / 1000).toFixed(1)}K</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active Segments</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{segments.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg. Segment Size</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{segments.length > 0 ? Math.round(getTotalUsers() / segments.length).toLocaleString() : '—'}</div></CardContent></Card>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-6 flex items-center justify-between gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search segments…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button onClick={() => { setShowCreateForm(p => !p); setEstimate(null); setIsEstimateStale(false); setForm(initialFormState()); }}>
            <Plus className="w-4 h-4 mr-2" />
            {showCreateForm ? 'Cancel' : 'Create Segment'}
          </Button>
        </CardContent>
      </Card>

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

      {/* Segment grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredSegments.length === 0 ? (
          <div className="col-span-2 text-center py-16 text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">No segments found</p>
            <p className="text-sm mt-1">{searchTerm ? 'Try a different search.' : 'Create your first segment to get started.'}</p>
          </div>
        ) : (
          filteredSegments.map(segment => (
            <Card key={segment._id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                      <CardTitle className="text-lg truncate">{segment.name}</CardTitle>
                    </div>
                    {segment.description && (
                      <p className="text-sm text-muted-foreground">{segment.description}</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0">
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
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-3xl font-bold">{(segment.userCount ?? 0).toLocaleString()}</div>
                    <p className="text-sm text-muted-foreground">Users</p>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-muted-foreground">—</div>
                    <p className="text-sm text-muted-foreground">Active Campaigns</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Criteria</p>
                  <div className="flex flex-wrap gap-1.5">
                    {segment.rules?.length > 0 ? (
                      segment.rules.map((rule, i) => {
                        const meta = getFieldMeta(rule.field);
                        return (
                          <Badge key={i} variant="outline" className="font-normal text-xs">
                            {meta.label} {rule.operator.replace(/_/g, ' ')} "{String(rule.value ?? '')}"
                          </Badge>
                        );
                      })
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No criteria defined.</span>
                    )}
                  </div>
                </div>
              </CardContent>
              <div className="px-6 pb-4 mt-auto pt-4 text-xs text-muted-foreground border-t">
                Created {formatDate(segment.createdAt)} · Modified {formatDate(segment.updatedAt)}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
