import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { AlertCircle, CheckCircle, UploadCloud } from 'lucide-react';
import { generateUploadUrl, finalizeUpload } from '../../lib/content';

interface UploadAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

export default function UploadAssetModal({ isOpen, onClose, onUploadComplete }: UploadAssetModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'finalizing' | 'success'>('idle');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setStatus('idle');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      setStatus('uploading');
      
      // --- THIS IS THE DEFINITIVE FIX ---
      // The API returns a doubly nested structure: { data: { data: { uploadUrl, ... } } }
      // We must destructure it correctly.
      const response = await generateUploadUrl(file.name, file.type);
      const { uploadUrl, contentId, storageKey } = response.data;
      // --- END OF FIX ---

      if (!uploadUrl) {
          throw new Error("Failed to retrieve an upload URL from the server.");
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', file.type);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed with status: ${xhr.statusText}`));
        };

        xhr.onerror = () => reject(new Error('Network error during upload.'));
        xhr.send(file);
      });

      setStatus('finalizing');
      await finalizeUpload({
        contentId,
        storageKey,
        name: file.name,
        mimeType: file.type,
        size: file.size,
      });

      setStatus('success');
      setTimeout(() => {
        onUploadComplete();
        handleClose();
      }, 1000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setStatus('idle');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    setUploadProgress(0);
    setIsUploading(false);
    setStatus('idle');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload New Asset</DialogTitle>
          <DialogDescription>Select a file from your device to add it to the content library.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {error && (
            <div className="text-destructive p-3 bg-destructive/10 rounded-md text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />{error}
            </div>
          )}
          
          <Input type="file" onChange={handleFileChange} disabled={isUploading} />

          {file && !isUploading && (
            <div className="text-sm text-muted-foreground">
              Selected: <strong>{file.name}</strong> ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}

          {isUploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} />
              <p className="text-sm text-center text-muted-foreground">
                {status === 'uploading' && `Uploading... ${uploadProgress}%`}
                {status === 'finalizing' && 'Finalizing...'}
              </p>
            </div>
          )}

          {status === 'success' && (
             <div className="text-green-600 p-3 bg-green-50 rounded-md text-sm flex items-center justify-center gap-2">
              <CheckCircle className="h-4 w-4" /> Upload complete!
            </div>
          )}
        </div>
        <Button onClick={handleUpload} disabled={!file || isUploading}>
          <UploadCloud className="w-4 h-4 mr-2" />
          {isUploading ? 'Uploading...' : 'Upload File'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
