import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Landmark } from '@/types';
import { poseLandmarkerService } from '../lib/pose-landmarker';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Card } from './ui/card';

interface PoseUploadProps {
  title: string;
  onPoseDetected: (landmarks: Landmark[]) => void;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
}

export function PoseUpload({ title, onPoseDetected, isProcessing, setIsProcessing }: PoseUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Reset state
    setError(null);
    setIsProcessing(true);
    
    try {
      // Create preview
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      // Process with MediaPipe
      const results = await poseLandmarkerService.detectPose(file);
      
      if (!results.landmarks || results.landmarks.length === 0) {
        setError('No pose detected in the image. Please try a clearer image.');
      } else {
        onPoseDetected(results.landmarks[0]);
      }
    } catch (err) {
      console.error('Error processing image:', err);
      setError('Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{title}</h3>
      
      <div className="grid gap-4">
        <Label htmlFor={`${title.toLowerCase()}-pose-input`}>Upload Image</Label>
        <Input
          id={`${title.toLowerCase()}-pose-input`}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={isProcessing}
        />
      </div>
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      
      <Card className="overflow-hidden aspect-video flex items-center justify-center bg-gray-50">
        {isProcessing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Processing image...</p>
          </div>
        ) : previewUrl ? (
          <img
            src={previewUrl}
            alt={`${title} pose`}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <p className="text-muted-foreground">No image uploaded</p>
        )}
      </Card>
    </div>
  );
}