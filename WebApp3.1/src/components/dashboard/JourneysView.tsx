import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import {
  Plus, Workflow, Edit, Trash2, MoreHorizontal, Play, Pause,
  Users, Zap, CheckCircle2, Clock, ArrowRight, Layers, Mail,
  MessageSquare, Bell, GitFork, Timer
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { getJourneys, deleteJourney, updateJourneyStatus } from '../../lib/journeys';
import { Journey } from '../../lib/journeys/types';

interface JourneysViewProps {
  onNavigate: (view: string, data?: any) => void;
}

// ─── Journey templates shown when no journeys exist ──────────────────────────
const JOURNEY_TEMPLATES = [
  {
    name: 'New User Onboarding',
    description: 'Welcome new users with a series of personalised banners and push notifications over 7 days.',
    steps: ['User Signs Up', 'Wait 1 hour', 'Show Welcome Banner', 'Wait 1 day', 'Send Push Notification'],
    icon: Users,
    color: 'from-blue-500 to-indigo-600',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    name: 'Ramadan Engagement',
    description: 'Boost engagement during Ramadan with prayer-time-aware campaigns and exclusive offers.',
    steps: ['Ramadan Start', 'Send Arabic Greeting', 'Wait Until Iftar', 'Show Special Offer', 'Post-Ramadan Follow-up'],
    icon: Zap,
    color: 'from-amber-500 to-orange-600',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    name: 'Win-Back Lapsed Users',
    description: 'Re-engage users who have not opened the app in 30+ days with targeted campaigns.',
    steps: ['30 Days Inactive', 'Check Segment', 'Send Push Notification', 'Wait 3 days', 'Show In-App Banner'],
    icon: ArrowRight,
    color: 'from-purple-500 to-pink-600',
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
];

// ─── Step icon map ────────────────────────────────────────────────────────────
function StepIcon({ step }: { step: string }) {
  const s = step.toLowerCase();
  if (s.includes('wait') || s.includes('delay') || s.includes('hour') || s.includes('day'))
    return <Timer className="w-3 h-3" />;
  if (s.includes('push') || s.includes('notification'))
    return <Bell className="w-3 h-3" />;
  if (s.includes('email'))
    return <Mail className="w-3 h-3" />;
  if (s.includes('sms') || s.includes('whatsapp') || s.includes('message'))
    return <MessageSquare className="w-3 h-3" />;
  if (s.includes('condition') || s.includes('check') || s.includes('segment'))
    return <GitFork className="w-3 h-3" />;
  if (s.includes('complete') || s.includes('end') || s.includes('finish'))
    return <CheckCircle2 className="w-3 h-3" />;
  return <Zap className="w-3 h-3" />;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === 'active')
    return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 text-xs">● Active</Badge>;
  if (status === 'paused')
    return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-xs">⏸ Paused</Badge>;
  return <Badge variant="secondary" className="text-xs">Draft</Badge>;
}

export default function JourneysView({ onNavigate }: JourneysViewProps) {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJourneys = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getJourneys();
      // API wraps in { data: Journey[] } — handle both shapes
      const list = (response as any)?.data ?? [];
      setJourneys(Array.isArray(list) ? list : []);
    } catch {
      // If the endpoint isn't reachable, show empty state instead of error
      setJourneys([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJourneys(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this journey?')) return;
    try {
      await deleteJourney(id);
      setJourneys(prev => prev.filter(j => j._id !== id));
    } catch {
      alert('Failed to delete journey.');
    }
  };

  const handleToggleStatus = async (journey: Journey) => {
    const next = journey.status === 'active' ? 'paused' : 'active';
    try {
      await updateJourneyStatus(journey._id, next);
      setJourneys(prev => prev.map(j => j._id === journey._id ? { ...j, status: next as any } : j));
    } catch {
      alert('Failed to update status.');
    }
  };

  // ── Summary stats ────────────────────────────────────────────────────────────
  const total    = journeys.length;
  const active   = journeys.filter(j => j.status === 'active').length;
  const draft    = journeys.filter(j => j.status === 'draft').length;
  const totalUsers = journeys.reduce((s, j) => s + (j.stats?.entered ?? 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-56" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Journeys</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Automate multi-step user engagement flows</p>
        </div>
        <Button onClick={() => onNavigate('journey-builder')} className="gap-2">
          <Plus className="w-4 h-4" />
          New Journey
        </Button>
      </div>

      {/* ── Stats strip ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Journeys', value: total, icon: Layers, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Active',         value: active, icon: Play,  color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Draft',          value: draft,  icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Users Entered',  value: totalUsers.toLocaleString(), icon: Users, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Journey list or empty state ─────────────────────────────────────────── */}
      {journeys.length === 0 ? (
        <div className="space-y-6">
          {/* Empty CTA */}
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Workflow className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No journeys yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                Start from a template below or build your own automated flow from scratch.
              </p>
              <Button onClick={() => onNavigate('journey-builder')} size="lg" className="gap-2">
                <Plus className="w-4 h-4" /> Create Your First Journey
              </Button>
            </CardContent>
          </Card>

          {/* Templates */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Start from a template
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {JOURNEY_TEMPLATES.map(t => (
                <Card key={t.name} className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('journey-builder')}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.iconBg}`}>
                        <t.icon className={`w-5 h-5 ${t.iconColor}`} />
                      </div>
                      <CardTitle className="text-base">{t.name}</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground leading-snug">{t.description}</p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1">
                      {t.steps.map((step, i) => (
                        <React.Fragment key={i}>
                          <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                            <StepIcon step={step} />
                            {step}
                          </span>
                          {i < t.steps.length - 1 && <span className="text-muted-foreground text-xs self-center">→</span>}
                        </React.Fragment>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" className="w-full mt-3 gap-1 group-hover:bg-primary/5">
                      Use Template <ArrowRight className="w-3 h-3" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {journeys.map(journey => (
            <Card key={journey._id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Workflow className="w-4 h-4 text-primary" />
                      </div>
                      <CardTitle className="text-base truncate">{journey.name}</CardTitle>
                    </div>
                    <div className="pl-10">
                      <StatusBadge status={journey.status} />
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0 text-muted-foreground">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onNavigate('journey-builder', { journeyId: journey._id })}>
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleStatus(journey)}>
                        {journey.status === 'active'
                          ? <><Pause className="w-4 h-4 mr-2" /> Pause</>
                          : <><Play  className="w-4 h-4 mr-2" /> Activate</>}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(journey._id)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {journey.description && (
                  <p className="text-sm text-muted-foreground pl-10 line-clamp-2">{journey.description}</p>
                )}
              </CardHeader>

              <CardContent className="pt-0 space-y-4 flex-1">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'Entered',   value: journey.stats?.entered   ?? 0 },
                    { label: 'Active',    value: journey.stats?.active    ?? 0 },
                    { label: 'Completed', value: journey.stats?.completed ?? 0 },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-muted/50 rounded-lg py-2">
                      <div className="text-lg font-bold">{value.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Node count */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {journey.nodes?.length ?? 0} steps
                  </span>
                  <span>Updated {new Date(journey.updatedAt).toLocaleDateString('en-CA')}</span>
                </div>
              </CardContent>

              <div className="px-6 pb-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1"
                  onClick={() => onNavigate('journey-builder', { journeyId: journey._id })}
                >
                  <Edit className="w-3.5 h-3.5" /> Edit Journey
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
