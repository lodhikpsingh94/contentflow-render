import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Skeleton } from '../ui/skeleton';
import { 
  Upload, Search, MoreHorizontal, Download, Trash2, Edit,
  FileImage, Video, User
} from 'lucide-react';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger 
} from '../ui/dropdown-menu';

import { getContentAssets } from '../../lib/content';
import { ContentAsset, PaginatedContentResponse } from '../../lib/content/types';
import UploadAssetModal from './UploadAssetModal';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface ContentLibraryViewProps {
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (isOpen: boolean) => void;
}

const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export default function ContentLibraryView({ isUploadModalOpen, setIsUploadModalOpen }: ContentLibraryViewProps) {
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAssets = async () => {
    try {
      setLoading(true); // Always set loading true on fetch
      setError(null);
      
      const response: PaginatedContentResponse = await getContentAssets();
      
      // CORRECTED: Access the 'data' property from the paginated response
      setAssets(response.data || []); 
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch content assets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const filteredAssets = assets.filter(asset => asset.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const getTotalSize = () => formatBytes(assets.reduce((sum, asset) => sum + (asset.size || 0), 0));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center text-destructive bg-destructive/10 border-destructive/50">
        <CardTitle>Error Fetching Assets</CardTitle>
        <CardContent className="mt-4">{error}</CardContent>
      </Card>
    );
  }

  return (
    <>
      <UploadAssetModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={fetchAssets}
      />

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Assets</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{assets.length}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Storage Used</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{getTotalSize()}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Folders</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">--</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Most Used</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">--</div></CardContent></Card>
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search assets..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 w-64" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredAssets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No assets found in your library.</p>
                <Button className="mt-4" onClick={() => setIsUploadModalOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Your First Asset
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {filteredAssets.map((asset) => (
                  <Card key={asset._id} className="group cursor-pointer hover:shadow-md transition-all">
                    <CardContent className="p-3">
                      <div className="relative">
                        <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-3">
                          <ImageWithFallback src={asset.publicUrl} alt={asset.name} className="w-full h-full object-cover" />
                          {asset.mimeType.startsWith('video/') && (<div className="absolute inset-0 flex items-center justify-center bg-black/20"><Video className="w-6 h-6 text-white/80" /></div>)}
                        </div>
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs">{formatBytes(asset.size)}</Badge>
                          <h4 className="text-sm font-medium text-foreground truncate" title={asset.name}>{asset.name}</h4>
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground"><User className="w-3 h-3" /><span className="truncate">{asset.uploadedBy || 'System'}</span></div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 p-0"><MoreHorizontal className="w-3 h-3" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem><Download className="w-4 h-4 mr-2" />Download</DropdownMenuItem>
                            <DropdownMenuItem><Edit className="w-4 h-4 mr-2" />Edit Details</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}