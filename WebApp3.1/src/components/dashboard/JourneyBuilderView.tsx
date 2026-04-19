import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Save, Play, Pause, Workflow, Loader2, ChevronLeft,
  Zap, Timer, Bell, GitFork, CheckCircle2, Users, MessageSquare,
  Mail, ArrowRight
} from 'lucide-react';
import { createJourney, updateJourney, getJourneyById, updateJourneyStatus } from '../../lib/journeys';

// ─── Node palette definitions ─────────────────────────────────────────────────
const NODE_PALETTE = [
  {
    category: 'Triggers',
    nodes: [
      { type: 'trigger', label: 'User Signs Up',  icon: Users,  data: { label: 'Trigger: User Signs Up',  triggerType: 'user_signup' } },
      { type: 'trigger', label: 'App Opens',       icon: Zap,    data: { label: 'Trigger: App Opens',       triggerType: 'app_open' } },
      { type: 'trigger', label: 'Custom Event',    icon: Zap,    data: { label: 'Trigger: Custom Event',    triggerType: 'custom_event' } },
    ],
  },
  {
    category: 'Actions',
    nodes: [
      { type: 'action', label: 'Show Banner',       icon: Bell,           data: { label: 'Show In-App Banner' } },
      { type: 'action', label: 'Send Push',         icon: Bell,           data: { label: 'Send Push Notification' } },
      { type: 'action', label: 'Send SMS',          icon: MessageSquare,  data: { label: 'Send SMS' } },
      { type: 'action', label: 'Send WhatsApp',     icon: MessageSquare,  data: { label: 'Send WhatsApp Message' } },
      { type: 'action', label: 'Send Email',        icon: Mail,           data: { label: 'Send Email' } },
    ],
  },
  {
    category: 'Logic',
    nodes: [
      { type: 'delay',     label: 'Wait / Delay',     icon: Timer,        data: { label: 'Wait 1 Day', duration: 1, unit: 'days' } },
      { type: 'condition', label: 'Check Condition',   icon: GitFork,      data: { label: 'Check Condition' } },
      { type: 'end',       label: 'End Journey',       icon: CheckCircle2, data: { label: 'Journey Ends' } },
    ],
  },
];

const NODE_COLORS: Record<string, string> = {
  trigger:   '#3b82f6',
  action:    '#10b981',
  delay:     '#f59e0b',
  condition: '#8b5cf6',
  end:       '#6b7280',
  default:   '#6b7280',
};

let nodeCounter = 10;
function nextId() { return `node_${++nodeCounter}`; }

export default function JourneyBuilderView({ onNavigate }: { onNavigate: (view: string, data?: any) => void }) {
  const [nodes, setNodes] = useState<Node[]>([
    { id: '1', type: 'default', data: { label: 'Trigger: User Signs Up' }, position: { x: 250, y: 60 },
      style: { background: NODE_COLORS.trigger, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 } },
  ]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [journeyName, setJourneyName] = useState('New Journey');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [status, setStatus] = useState<'draft' | 'active' | 'paused'>('draft');
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // If editing an existing journey, load it
  useEffect(() => {
    const params = (window as any).__navigationData;
    const id = params?.journeyId;
    if (!id) return;

    getJourneyById(id)
      .then(res => {
        const j = (res as any)?.data ?? res;
        if (!j) return;
        setJourneyId(j._id);
        setJourneyName(j.name || 'Untitled');
        setDescription(j.description || '');
        setStatus(j.status || 'draft');
        if (j.nodes?.length) setNodes(j.nodes);
        if (j.edges?.length) setEdges(j.edges);
      })
      .catch(() => setLoadError('Failed to load journey. Starting fresh.'));
  }, []);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes(nds => applyNodeChanges(changes, nds)), [],
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges(eds => applyEdgeChanges(changes, eds)), [],
  );
  const onConnect: OnConnect = useCallback(
    (connection) => setEdges(eds => addEdge({ ...connection, animated: true }, eds)), [],
  );

  const addNodeFromPalette = (paletteNode: (typeof NODE_PALETTE)[0]['nodes'][0]) => {
    const id = nextId();
    const color = NODE_COLORS[paletteNode.type] ?? NODE_COLORS.default;
    setNodes(prev => [
      ...prev,
      {
        id,
        type: 'default',
        data: paletteNode.data,
        position: { x: 200 + Math.random() * 100, y: 100 + prev.length * 90 },
        style: { background: color, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 },
      },
    ]);
  };

  const handleSave = async (newStatus?: 'active' | 'paused') => {
    setSaving(true);
    try {
      const payload = {
        name:        journeyName.trim() || 'Untitled Journey',
        description: description.trim() || undefined,
        status:      newStatus ?? status,
        nodes,
        edges,
      };

      if (journeyId) {
        await updateJourney(journeyId, payload);
        if (newStatus) {
          await updateJourneyStatus(journeyId, newStatus);
          setStatus(newStatus);
        }
      } else {
        const res = await createJourney(payload as any);
        const created = (res as any)?.data ?? res;
        if (created?._id) setJourneyId(created._id);
        if (newStatus) setStatus(newStatus);
      }
      onNavigate('journeys');
    } catch {
      alert('Failed to save journey. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    setActivating(true);
    try { await handleSave('active'); }
    finally { setActivating(false); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => onNavigate('journeys')}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Workflow className="w-5 h-5 text-primary shrink-0" />
          <div className="flex flex-col min-w-0 flex-1">
            <Input
              className="text-base font-semibold h-8 border-0 shadow-none focus-visible:ring-0 px-0 bg-transparent"
              value={journeyName}
              onChange={e => setJourneyName(e.target.value)}
              placeholder="Journey name"
            />
            <Input
              className="text-xs text-muted-foreground h-6 border-0 shadow-none focus-visible:ring-0 px-0 bg-transparent"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add a short description…"
            />
          </div>
          {journeyId && (
            <Badge variant={status === 'active' ? 'default' : 'secondary'} className="shrink-0 text-xs">
              {status}
            </Badge>
          )}
        </div>

        {loadError && <p className="text-xs text-amber-500">{loadError}</p>}

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={() => onNavigate('journeys')}>Cancel</Button>
          {status !== 'active' ? (
            <Button variant="secondary" onClick={handleActivate} disabled={activating || saving}>
              {activating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              Activate
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => handleSave('paused')} disabled={saving}>
              <Pause className="w-4 h-4 mr-2" /> Pause
            </Button>
          )}
          <Button onClick={() => handleSave()} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Node palette */}
        <div className="w-56 shrink-0 border-r overflow-y-auto bg-card p-3 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Add Steps</p>
          {NODE_PALETTE.map(group => (
            <div key={group.category}>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">{group.category}</p>
              <div className="space-y-1">
                {group.nodes.map(n => (
                  <button
                    key={n.label}
                    onClick={() => addNodeFromPalette(n)}
                    className="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-lg border bg-background hover:bg-muted transition-colors text-left"
                  >
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                      style={{ background: NODE_COLORS[n.type] ?? NODE_COLORS.default }}
                    >
                      <n.icon className="w-3 h-3 text-white" />
                    </div>
                    <span className="truncate">{n.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="pt-2 border-t text-xs text-muted-foreground">
            <p>Click a step to add it to the canvas, then drag to connect.</p>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            deleteKeyCode="Delete"
          >
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
