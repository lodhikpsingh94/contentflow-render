import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon, Loader2, AlertCircle } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

import VisualEditor from './VisualEditor';

import { createCampaign, getCampaignById, updateCampaign } from '../../lib/campaigns';
import { NewCampaignData, Campaign, CampaignVariant } from '../../lib/campaigns/types';
import { getSegments } from '../../lib/segments';
import { Segment } from '../../lib/segments/types';

interface CreateCampaignViewProps {
  onCampaignCreated: () => void;
  campaignId?: string;
}

type CampaignFormData = {
    name: string;
    type: string;
    subType: 'image' | 'video' | 'gif' | 'custom';
    description?: string;
    segments: string[];
    schedule: {
        startTime?: Date;
        endTime?: Date;
    };
    priority: number;
    metadata: {
        content: string;
        ctaText?: string;
        bannerColor?: string;
        ctaBackgroundColor?: string;
        ctaTextColor?: string;
        imageUrl?: string;
        actionUrl?: string;
        placementId?: string;
        bannerIcon?: string;
    };
};

const initialFormData: CampaignFormData = {
    name: '',
    type: '',
    subType: 'custom',
    description: '',
    segments: [],
    schedule: {},
    priority: 5,
    metadata: {
        content: 'This is a special offer just for you!',
        ctaText: 'Get Started',
        bannerColor: 'bg-primary text-primary-foreground',
        ctaBackgroundColor: '#FFFFFF',
        ctaTextColor: '#000000',
    },
};

export default function CreateCampaignView({ onCampaignCreated, campaignId }: CreateCampaignViewProps) {
  const [formData, setFormData] = useState<CampaignFormData>(initialFormData);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false);
  const [isEndCalendarOpen, setIsEndCalendarOpen] = useState(false);

  const isEditMode = !!campaignId;

  useEffect(() => {
    const fetchAllData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            console.log('Edit Mode:', isEditMode, 'Campaign ID:', campaignId);
            
            // Fetch segments - handle different response structures
            const segmentsResponse = await getSegments();
            console.log('Segments Response:', segmentsResponse);
            
            // Handle both nested and direct array responses
            const segmentsData = segmentsResponse?.data || segmentsResponse || [];
            setSegments(Array.isArray(segmentsData) ? segmentsData : []);

            // If in edit mode, fetch the campaign data
            if (isEditMode && campaignId) {
                console.log('Fetching campaign for edit:', campaignId);
                const campaignResponse = await getCampaignById(campaignId);
                console.log('Campaign Response:', campaignResponse);
                
                // Handle nested response structure - try multiple levels
                const campaign = campaignResponse?.data?.data || campaignResponse?.data || campaignResponse;
                
                if (campaign && campaign._id) {
                    console.log('Loading campaign data:', campaign);
                    
                    // Extract metadata from the campaign
                    const campaignMetadata = campaign.metadata || {};
                    
                    // Safely extract nested data with fallbacks
                    const rules = campaign.rules || {};
                    const schedule = rules.schedule || {};
                    const segments = rules.segments || [];
                    
                    setFormData({
                        name: campaign.name || '',
                        type: campaign.type || '',
                        description: campaign.description || '',
                        segments: Array.isArray(segments) ? segments : [],
                        schedule: {
                            startTime: schedule.startTime ? new Date(schedule.startTime) : undefined,
                            endTime: schedule.endTime ? new Date(schedule.endTime) : undefined,
                        },
                        priority: campaign.priority || 5,
                        subType: campaign.subType || 'custom',
                        metadata: {
                            content: campaignMetadata.content || campaignMetadata.contentText || '',
                            ctaText: campaignMetadata.ctaText || 'Get Started',
                            bannerColor: campaignMetadata.bannerColor || 'bg-primary text-primary-foreground',
                            ctaBackgroundColor: campaignMetadata.ctaBackgroundColor || '#FFFFFF',
                            ctaTextColor: campaignMetadata.ctaTextColor || '#000000',
                            imageUrl: campaignMetadata.imageUrl || '',
                            actionUrl: campaignMetadata.actionUrl || '',
                            placementId: campaignMetadata.placementId || '',
                            bannerIcon: campaignMetadata.bannerIcon || '',
                        },
                    });
                    console.log('Form data loaded successfully');
                } else {
                    console.error('Campaign data structure invalid:', campaign);
                    throw new Error("Campaign data not found or invalid format.");
                }
            }
        } catch (err) { 
            const errorMessage = err instanceof Error ? err.message : "Failed to load required data.";
            setError(errorMessage); 
            console.error('Error loading data:', err);
        } finally { 
            setIsLoading(false); 
        }
    };

    fetchAllData();
  }, [campaignId, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { name, type, subType, segments, schedule, priority, metadata } = formData;
      
      if (!schedule?.startTime || !schedule?.endTime) {
        throw new Error("Schedule dates are required.");
      }
      if (subType === 'custom' && !metadata.content) {
        throw new Error("Message is required for Custom Content.");
      }
      if (subType !== 'custom' && !metadata.imageUrl) {
        throw new Error("Content from library is required for static subTypes.");
      }

      const payload = {
        name, 
        type, 
        subType, // Changed from subType to subtype
        segments, 
        priority,
        schedule: {
          startTime: schedule.startTime.toISOString(),
          endTime: schedule.endTime.toISOString(),
        },
        metadata,
      };

      console.log('Submitting payload:', payload);

      if (isEditMode && campaignId) {
        await updateCampaign(campaignId, payload as any);
        alert('Campaign updated successfully!');
      } else {
        await createCampaign(payload as NewCampaignData);
        alert('Campaign created successfully!');
      }
      onCampaignCreated();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
      console.error('Submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateSelect = (field: 'startTime' | 'endTime', date: Date | undefined) => {
    setFormData(prev => ({ ...prev, schedule: { ...prev.schedule, [field]: date }}));
    if (field === 'startTime') setIsStartCalendarOpen(false);
    else setIsEndCalendarOpen(false);
  };
  
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
  
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Debug Banner - Remove after testing
      {isEditMode && (
        <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-300">
          <strong>Edit Mode Active</strong><br />
          Campaign ID: {campaignId}<br />
          Form Name: {formData.name || '(empty)'}<br />
          Form Type: {formData.type || '(empty)'}<br />
          Segments Selected: {formData.segments.join(', ') || '(none)'}
        </div>
      )} */}

      <Card>
        <CardHeader>
            <CardTitle className="text-2xl">{isEditMode ? 'Edit Campaign' : 'Create New Campaign'}</CardTitle>
            <CardDescription>{isEditMode ? 'Modify campaign details.' : 'Configure and launch a new campaign.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="text-destructive p-3 bg-destructive/10 rounded-md text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Campaign Type</Label>
                  <Select 
                    required 
                    value={formData.type} 
                    onValueChange={(value) => setFormData(p => ({ ...p, type: value as 'banner' | 'popup' }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="banner">Banner</SelectItem>
                      <SelectItem value="popup">Popup</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <div className="p-6 border rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Content & Appearance</h3>
                <VisualEditor 
                    campaignType={formData.type}
                    subType={formData.subType}
                    metadata={formData.metadata}
                    onSubtypeChange={(value) => setFormData(p => ({ ...p, subType: value }))}
                    onMetadataChange={(field, value) => {
                        setFormData(p => ({ ...p, metadata: { ...p.metadata, [field]: value } }));
                    }}
                />
            </div>
            
            <div className="space-y-4 p-6 border rounded-lg">
                <h3 className="text-lg font-semibold">Targeting & Priority</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="targetSegment">Target Segment</Label>
                        <Select 
                          required 
                          value={formData.segments[0] || ''} 
                          onValueChange={(value) => setFormData(p => ({ ...p, segments: [value]}))}
                        >
                            <SelectTrigger>
                              <SelectValue placeholder="Select segment" />
                            </SelectTrigger>
                            <SelectContent>
                                {segments.map(s => (
                                  <SelectItem key={s._id} value={s._id}>
                                    {s.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="priority">Priority</Label>
                        <Select 
                          value={String(formData.priority)} 
                          onValueChange={(value) => setFormData(p => ({ ...p, priority: parseInt(value) }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="5" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 10 }, (_, i) => i + 1).map(p => (
                              <SelectItem key={p} value={String(p)}>
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
            
            <div className="space-y-4 p-6 border rounded-lg">
                <h3 className="text-lg font-semibold">Scheduling</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Popover open={isStartCalendarOpen} onOpenChange={setIsStartCalendarOpen}>
                        <PopoverTrigger asChild>
                          <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.schedule?.startTime ? formData.schedule.startTime.toLocaleDateString() : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-50" align="start">
                          <Calendar 
                            mode="single" 
                            selected={formData.schedule?.startTime} 
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
                          <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.schedule?.endTime ? formData.schedule.endTime.toLocaleDateString() : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-50" align="start">
                          <Calendar 
                            mode="single" 
                            selected={formData.schedule?.endTime} 
                            onSelect={(d) => handleDateSelect('endTime', d)} 
                            initialFocus 
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Button type="button" variant="outline" onClick={onCampaignCreated} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isEditMode ? 'Save Changes' : 'Create Campaign'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}