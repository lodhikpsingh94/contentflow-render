import React from 'react';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Sparkles, Code } from 'lucide-react';

// Define the available personalization tags
const PERSONALIZATION_TAGS = [
  { tag: '{{user.name}}', description: "User's full name" },
  { tag: '{{user.firstName}}', description: "User's first name" },
  { tag: '{{user.email}}', description: "User's email address" },
  { tag: '{{user.city}}', description: "User's city" },
  { tag: '{{user.plan}}', description: "User's subscription plan" },
];

interface PersonalizationHelperProps {
  // Callback to insert the selected tag into the parent's textarea
  onInsertTag: (tag: string) => void;
}

export default function PersonalizationHelper({ onInsertTag }: PersonalizationHelperProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-auto p-1 text-primary">
          <Sparkles className="w-4 h-4" />
          <span className="sr-only">Insert Personalization</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium leading-none">Personalization</h4>
            <p className="text-sm text-muted-foreground">
              Insert dynamic content based on user attributes.
            </p>
          </div>
          <div className="space-y-2">
            {PERSONALIZATION_TAGS.map(({ tag, description }) => (
              <div 
                key={tag} 
                onClick={() => onInsertTag(tag)}
                className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer"
              >
                <div>
                  <code className="text-xs font-semibold">{tag}</code>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Code className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}