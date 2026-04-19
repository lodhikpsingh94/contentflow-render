import React, { useState, useRef } from 'react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Image as ImageIcon, Sparkles, PiggyBank, BadgePercent, Gift, Check } from 'lucide-react';
import { cn } from '../ui/utils';
import PersonalizationHelper from './PersonalizationHelper';
import ContentLibraryModal from './ContentLibraryModal';

interface VisualEditorProps {
  campaignType: string;
  subType: 'image' | 'video' | 'gif' | 'custom';
  metadata: {
    content: string;
    imageUrl?: string;
    ctaText?: string;
    bannerColor?: string;
    actionUrl?: string;
    placementId?: string;
    bannerIcon?: string;
    ctaBackgroundColor?: string;
    ctaTextColor?: string;
  };
  onSubtypeChange: (value: 'image' | 'video' | 'gif' | 'custom') => void;
  onMetadataChange: (field: string, value: string) => void;
}

const PLACEMENT_IDS = ["dashboard_top_banner", "home_popup", "profile_rewards_banner"];
const ACTION_URLS = ["/profile", "/settings", "/rewards", "custom"];
const BANNER_ICONS = { PiggyBank, BadgePercent, Gift };
const BANNER_COLORS = [
    { value: 'bg-blue-600 text-white', display: 'bg-blue-600' }, 
    { value: 'bg-green-600 text-white', display: 'bg-green-600' },
    { value: 'bg-purple-600 text-white', display: 'bg-purple-600' }, 
    { value: 'bg-gray-800 text-white', display: 'bg-gray-800' }
];
const CTA_BG_COLORS = [
    { value: '#FFFFFF', display: 'bg-white' }, { value: '#000000', display: 'bg-black' },
    { value: '#3B82F6', display: 'bg-blue-500' }, { value: '#22C55E', display: 'bg-green-500' }
];
const CTA_TEXT_COLORS = [
    { value: '#000000', display: 'bg-black' }, { value: '#FFFFFF', display: 'bg-white' },
    { value: '#E5E7EB', display: 'bg-gray-200' }
];
const sampleUser = { name: 'Jane Doe' };

export default function VisualEditor({
  campaignType,
  subType,
  metadata,
  onSubtypeChange,
  onMetadataChange,
}: VisualEditorProps) {
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  const isRichSubtype = subType === 'custom';

  const handleInsertTag = (tag: string) => {
    const textarea = contentRef.current;
    if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newContent = `${metadata.content.substring(0, start)}${tag}${metadata.content.substring(end)}`;
        onMetadataChange('content', newContent);
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + tag.length, start + tag.length);
        }, 0);
    }
  };

  const renderPreviewContent = (content: string) => (content || '').replace(/{{user.name}}/g, sampleUser.name);
  const SelectedIcon = BANNER_ICONS[metadata.bannerIcon as keyof typeof BANNER_ICONS];

  const previewContent = isRichSubtype ? (
    <div className={cn('p-4 rounded-lg shadow-md w-full text-sm text-center flex flex-col items-center gap-3', metadata.bannerColor || 'bg-primary text-primary-foreground')}>
        {SelectedIcon && React.createElement(SelectedIcon, { className: 'w-6 h-6' })}
        {metadata.imageUrl && !SelectedIcon && (<img src={metadata.imageUrl} alt="Preview" className="w-full h-24 object-cover rounded-md" />)}
        <p>{renderPreviewContent(metadata.content) || "Your message will appear here..."}</p>
        {metadata.ctaText && (<Button size="sm" style={{ backgroundColor: metadata.ctaBackgroundColor, color: metadata.ctaTextColor }} className="font-semibold">{metadata.ctaText}</Button>)}
    </div>
  ) : (
    metadata.imageUrl ? (<img src={metadata.imageUrl} alt="Static Content Preview" className="w-full h-full object-contain" />) 
    : (<div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground text-xs p-4 rounded-lg"><ImageIcon className="w-8 h-8 mb-2"/> Select content from library</div>)
  );
  
  return (
    <>
      <ContentLibraryModal isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} onSelect={(url) => onMetadataChange('imageUrl', url)} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="space-y-4">
          <div>
            <Label htmlFor="subType">Subtype</Label>
            <Select required value={subType} onValueChange={onSubtypeChange}>
              <SelectTrigger><SelectValue placeholder="Select a subType..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Custom Content (Banner/Popup)</SelectItem>
                <SelectItem value="image">Static Image</SelectItem>
                <SelectItem value="video">Static Video</SelectItem>
                <SelectItem value="gif">Static GIF</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="imageUrl">{isRichSubtype ? "Background Image (Optional)" : "Content from Library (Required)"}</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input id="imageUrl" placeholder="Select content from library" value={metadata.imageUrl || ''} readOnly className="flex-1 bg-muted" />
              <Button type="button" variant="outline" onClick={() => setIsLibraryOpen(true)} className="shrink-0"><ImageIcon className="w-4 h-4 mr-2"/>Browse Library</Button>
            </div>
          </div>
          {isRichSubtype && (
            <div className="space-y-4 animate-in fade-in-50 border-t pt-4">
              <div>
                <div className="flex items-center justify-between mb-2"><Label htmlFor="content">Message (Required)</Label><PersonalizationHelper onInsertTag={handleInsertTag} /></div>
                <Textarea ref={contentRef} id="content" placeholder="Enter message..." value={metadata.content || ''} onChange={(e) => onMetadataChange('content', e.target.value)} rows={3}/>
              </div>
              <div>
                <Label htmlFor="ctaText">CTA Button Text</Label>
                <Input id="ctaText" placeholder="e.g., Learn More" value={metadata.ctaText || ''} onChange={(e) => onMetadataChange('ctaText', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className='space-y-2'><Label>CTA Background</Label><div className="flex items-center gap-2">{CTA_BG_COLORS.map(color => (<button type="button" key={color.value} onClick={() => onMetadataChange('ctaBackgroundColor', color.value)} className={cn('w-8 h-8 rounded-full border-2 flex items-center justify-center', metadata.ctaBackgroundColor === color.value ? 'border-primary dark:border-white' : 'border-transparent')}><div className={cn('w-6 h-6 rounded-full border', color.display)}/></button>))}</div></div>
                <div className='space-y-2'><Label>CTA Text Color</Label><div className="flex items-center gap-2">{CTA_TEXT_COLORS.map(color => (<button type="button" key={color.value} onClick={() => onMetadataChange('ctaTextColor', color.value)} className={cn('w-8 h-8 rounded-full border-2 flex items-center justify-center', metadata.ctaTextColor === color.value ? 'border-primary dark:border-white' : 'border-transparent')}><div className={cn('w-6 h-6 rounded-full border', color.display)}/></button>))}</div></div>
              </div>
              <div>
                <Label>Banner Color</Label>
                <div className="flex items-center gap-2 mt-2">{BANNER_COLORS.map(color => (<button type="button" key={color.value} onClick={() => onMetadataChange('bannerColor', color.value)} className={cn('w-8 h-8 rounded-full border-2 flex items-center justify-center', metadata.bannerColor === color.value ? 'border-primary dark:border-white' : 'border-transparent')}><div className={cn('w-6 h-6 rounded-full border', color.display)}/></button>))}</div>
              </div>
              <div>
                <Label htmlFor="bannerIcon">Icon (optional)</Label>
                <Select value={metadata.bannerIcon} onValueChange={(value) => onMetadataChange('bannerIcon', value)}><SelectTrigger><SelectValue placeholder="Select icon..." /></SelectTrigger><SelectContent>{Object.keys(BANNER_ICONS).map(iconName => <SelectItem key={iconName} value={iconName}>{iconName}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
          )}
          <div className="space-y-4 border-t pt-4">
              <div>
                <Label htmlFor="actionUrl">Action URL</Label>
                <Select value={metadata.actionUrl} onValueChange={(value) => onMetadataChange('actionUrl', value)}><SelectTrigger><SelectValue placeholder="Select destination..." /></SelectTrigger><SelectContent>{ACTION_URLS.map(url => <SelectItem key={url} value={url}>{url === 'custom' ? 'Custom URL' : `App Route: ${url}`}</SelectItem>)}</SelectContent></Select>
              </div>
          </div>
        </div>
        <div>
            <Label className="text-xs text-muted-foreground">Live Preview</Label>
            <Card className="mt-2 w-full max-w-[320px] mx-auto p-2 bg-muted h-[640px] flex flex-col"><CardContent className="p-0 flex-1"><div className="h-full bg-background rounded-lg flex flex-col p-2 overflow-hidden"><div className="text-center text-xs text-muted-foreground mb-2">Your App Screen</div>{campaignType === 'banner' ? (<div className="p-2">{previewContent}</div>) : campaignType === 'popup' ? (<div className="flex-1 flex items-center justify-center p-4 bg-black/30"><div className="w-full max-w-xs">{previewContent}</div></div>) : (<div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">Select a campaign type to see a preview.</div>)}</div></CardContent></Card>
        </div>
      </div>
    </>
  );
}