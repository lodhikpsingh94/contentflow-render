import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import { Skeleton } from '../ui/skeleton';
import { 
  Users, Target, Plus, Edit, Trash2, Eye, MoreHorizontal, Search, Loader2, AlertCircle 
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

import { getSegments, createSegment } from '../../lib/segments';
import { Segment, NewSegmentData, SegmentRule } from '../../lib/segments/types';

const initialNewSegmentState: NewSegmentData = {
  name: '',
  description: '',
  rules: [{ field: '', operator: 'equals', value: '' }],
};

const formatDate = (dateString: string) => !dateString ? '' : new Date(dateString).toLocaleDateString('en-CA');

export default function SegmentsView() {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSegment, setNewSegment] = useState<NewSegmentData>(initialNewSegmentState);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSegments = async () => {
    try {
      setLoading(true); // Always set loading on fetch
      setError(null);

      // --- THIS IS THE FIX ---
      // getSegments() returns the array of segments directly.
      const segmentsResponse = await getSegments();
      setSegments(segmentsResponse || []);
      // --- END OF FIX ---

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch segments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegments();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError(null);
    try {
      if (!newSegment.name || newSegment.rules.some(r => !r.field || !r.operator || !r.value)) {
        throw new Error("Segment Name and all Rule fields are required.");
      }
      await createSegment(newSegment);
      setShowCreateForm(false);
      setNewSegment(initialNewSegmentState);
      await fetchSegments();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsCreating(false);
    }
  };

  const addRule = () => setNewSegment(prev => ({ ...prev, rules: [...prev.rules, { field: '', operator: 'equals', value: '' }] }));
  const updateRule = (index: number, field: keyof SegmentRule, value: string) => setNewSegment(prev => ({ ...prev, rules: prev.rules.map((rule, i) => i === index ? { ...rule, [field]: value } : rule) }));
  const removeRule = (index: number) => setNewSegment(prev => ({ ...prev, rules: prev.rules.filter((_, i) => i !== index) }));

  const filteredSegments = (segments || []).filter(segment =>
    segment && segment.name && (
        segment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (segment.description && segment.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );
  
  const getTotalUsers = () => (segments || []).reduce((sum, segment) => sum + (segment.userCount || 0), 0);

  if (loading) return <Skeleton className="h-[500px] w-full" />;
  if (error) return <Card className="p-8 text-center text-destructive bg-destructive/10"><CardTitle>Error</CardTitle><CardContent className="mt-4">{error}</CardContent></Card>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Segments</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{segments.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{(getTotalUsers() / 1000).toFixed(1)}K</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Active Campaigns</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-muted-foreground">--</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Avg. Growth</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-muted-foreground">--</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-6 flex items-center justify-between">
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search segments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 w-full md:w-64" /></div>
            <Button onClick={() => setShowCreateForm(prev => !prev)}><Plus className="w-4 h-4 mr-2" />{showCreateForm ? 'Cancel' : 'Create Segment'}</Button>
        </CardContent>
      </Card>

      {showCreateForm && (
        <Card className="animate-in fade-in-50">
          <CardHeader><CardTitle>Create New Segment</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSubmit} className="space-y-6">
              {createError && (<div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4" /><p>{createError}</p></div>)}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="segment-name">Segment Name</Label><Input id="segment-name" placeholder="e.g., High-Value Customers" value={newSegment.name} onChange={(e) => setNewSegment(prev => ({ ...prev, name: e.target.value }))} className="mt-2" required/></div>
                <div><Label htmlFor="segment-description">Description</Label><Input id="segment-description" placeholder="Brief description of this segment" value={newSegment.description} onChange={(e) => setNewSegment(prev => ({ ...prev, description: e.target.value }))} className="mt-2"/></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-4"><Label>Targeting Criteria (All conditions must be met - AND)</Label><Button variant="outline" size="sm" type="button" onClick={addRule}><Plus className="w-4 h-4 mr-1" /> Add Rule</Button></div>
                <div className="space-y-4">
                  {newSegment.rules.map((rule, index) => (
                    <div key={index} className="flex items-end gap-2">
                        <div className="flex-1 space-y-1"><Label>Field</Label><Input placeholder="e.g., behavioral.totalSpent" value={rule.field} onChange={(e) => updateRule(index, 'field', e.target.value)} required/></div>
                        <div className="w-48 space-y-1"><Label>Operator</Label><Select value={rule.operator} onValueChange={(value) => updateRule(index, 'operator', value)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>
                            <SelectItem value="equals">Equals</SelectItem><SelectItem value="not_equals">Not Equals</SelectItem>
                            <SelectItem value="greater_than">Greater Than</SelectItem><SelectItem value="less_than">Less Than</SelectItem>
                            <SelectItem value="contains">Contains</SelectItem>
                        </SelectContent></Select></div>
                        <div className="flex-1 space-y-1"><Label>Value</Label><Input placeholder="e.g., 500" value={rule.value} onChange={(e) => updateRule(index, 'value', e.target.value)} required/></div>
                        <Button variant="ghost" size="sm" type="button" onClick={() => removeRule(index)} disabled={newSegment.rules.length === 1}><Trash2 className="w-4 h-4"/></Button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2"><Button variant="outline" type="button" onClick={() => setShowCreateForm(false)} disabled={isCreating}>Cancel</Button><Button type="submit" disabled={isCreating}>{isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Segment</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredSegments.map((segment) => (
          <Card key={segment._id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full bg-primary" />
                        <CardTitle className="text-lg">{segment.name}</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">{segment.description}</p>
                  </div>
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="w-8 h-8 flex-shrink-0"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
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
                <div><div className="text-3xl font-bold text-foreground">{segment.userCount?.toLocaleString() ?? 0}</div><p className="text-sm text-muted-foreground">Users</p></div>
                <div><div className="text-3xl font-bold text-foreground text-muted-foreground">--</div><p className="text-sm text-muted-foreground">Active Campaigns</p></div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Criteria:</p>
                <div className="flex flex-wrap gap-2">
                  {(segment.rules || []).length > 0 ? (
                    segment.rules.map((rule, index) => (
                      <Badge key={index} variant="outline" className="font-normal text-xs">
                        {rule.field}: {(rule.operator || '').replace(/_/g, ' ')} "{String(rule.value ?? '')}"
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No criteria defined.</span>
                  )}
                </div>
              </div>
            </CardContent>
            <div className="px-6 pb-4 mt-auto pt-4 text-xs text-muted-foreground border-t">Created {formatDate(segment.createdAt)} • Last modified {formatDate(segment.updatedAt)}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}