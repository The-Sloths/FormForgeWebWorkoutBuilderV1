import { useEffect, useRef } from 'react';
import { poseLandmarkerService } from '../lib/pose-landmarker';
import type { PoseLandmarkerResult } from '@/types';

interface LandmarkCanvasProps {
  image: HTMLImageElement | null;
  results: PoseLandmarkerResult | null;
}

export function LandmarkCanvas({ image, results }: LandmarkCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current || !image || !results) return;
    
    poseLandmarkerService.drawResults(canvasRef.current, image, results);
  }, [image, results]);
  
  if (!image || !results) {
    return null;
  }
  
  return (
    <div className="mt-6 flex justify-center">
      <canvas
        ref={canvasRef}
        className="border border-gray-200 rounded-md"
      />
    </div>
  );
}