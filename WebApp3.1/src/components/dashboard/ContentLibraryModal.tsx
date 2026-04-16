import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Card, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { getContentAssets } from '../../lib/content';
import { ContentAsset } from '../../lib/content/types';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { Upload } from 'lucide-react';

// Import the UploadAssetModal to use it inside this component
import UploadAssetModal from './UploadAssetModal';

interface ContentLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export default function ContentLibraryModal({ isOpen, onClose, onSelect }: ContentLibraryModalProps) {
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NEW: State to control the nested upload modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const fetchAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getContentAssets();
      const imageAssets = response.data.filter(asset => asset.mimeType.startsWith('image/'));
      setAssets(imageAssets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch assets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen]);

  const handleImageSelect = (url: string) => {
    onSelect(url);
    onClose();
  };
  
  const handleUploadComplete = () => {
      setIsUploadModalOpen(false); // Close the upload modal
      fetchAssets(); // Refresh the asset list
  };

  return (
    <>
      {/* The Upload modal is now nested and controlled from here */}
      <UploadAssetModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
      />
      
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader className="flex-row items-center justify-between pr-6">
            <div>
              <DialogTitle>Select an Image from Content Library</DialogTitle>
              <DialogDescription>Click an image to select it for your campaign.</DialogDescription>
            </div>
            {/* NEW: Button to open the upload modal */}
            <Button onClick={() => setIsUploadModalOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload New Asset
            </Button>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto pr-4">
            {loading && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => <Skeleton key={i} className="aspect-video" />)}
              </div>
            )}
            {error && <div className="text-destructive text-center p-8">{error}</div>}
            
            {!loading && !error && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {assets.map(asset => (
                  <Card 
                    key={asset._id} 
                    className="group cursor-pointer hover:shadow-lg hover:border-primary transition-all overflow-hidden"
                    onClick={() => handleImageSelect(asset.publicUrl)}
                  >
                    <CardContent className="p-0">
                      <div className="aspect-video relative">
                        <ImageWithFallback src={asset.publicUrl} alt={asset.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button size="sm">Select</Button>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-muted-foreground p-2 truncate" title={asset.name}>{asset.name}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}