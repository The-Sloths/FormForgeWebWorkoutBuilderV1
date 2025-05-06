import type { Landmark, PoseLandmarkerResult } from '@/types';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

class PoseLandmarkerService {
  private poseLandmarker: any = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      
      this.poseLandmarker = await PoseLandmarker.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU"
          },
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          runningMode: "IMAGE"
        }
      );
      
      this.isInitialized = true;
      console.log("MediaPipe Pose Landmarker initialized successfully");
    } catch (error) {
      console.error("Error initializing MediaPipe Pose Landmarker:", error);
      throw error;
    }
  }

  async detectPose(imageFile: File): Promise<PoseLandmarkerResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(imageFile);
      
      img.onload = () => {
        try {
          const results = this.poseLandmarker.detect(img);
          resolve(results);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = (error) => {
        reject(error);
      };
    });
  }

  drawResults(canvas: HTMLCanvasElement, image: HTMLImageElement, results: PoseLandmarkerResult): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    const maxWidth = 600;
    const scale = image.width > maxWidth ? maxWidth / image.width : 1;
    canvas.width = image.width * scale;
    canvas.height = image.height * scale;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image
    ctx.drawImage(
      image, 
      0, 0, 
      image.width, image.height, 
      0, 0, 
      image.width * scale, image.height * scale
    );
    
    if (!results.landmarks || results.landmarks.length === 0) {
      ctx.fillStyle = 'red';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No pose detected!', canvas.width / 2, 30);
      return;
    }
    
    const landmarks = results.landmarks[0];
    
    // Draw connections
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 3;
    
    // Define connections for pose
    const connections = [
      // Torso
      [11, 12], [12, 24], [24, 23], [23, 11],
      // Right arm
      [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
      // Left arm
      [12, 14], [14, 16], [16, 18], [16, 20], [16, 22],
      // Right leg
      [23, 25], [25, 27], [27, 29], [27, 31], [31, 33],
      // Left leg
      [24, 26], [26, 28], [28, 30], [28, 32], [32, 34]
    ];
    
    connections.forEach(([start, end]) => {
      if (landmarks[start] && landmarks[end]) {
        ctx.beginPath();
        ctx.moveTo(
          landmarks[start].x * image.width * scale,
          landmarks[start].y * image.height * scale
        );
        ctx.lineTo(
          landmarks[end].x * image.width * scale,
          landmarks[end].y * image.height * scale
        );
        ctx.stroke();
      }
    });
    
    // Draw landmarks
    ctx.fillStyle = 'red';
    landmarks.forEach((landmark: Landmark) => {
      ctx.beginPath();
      ctx.arc(
        landmark.x * image.width * scale,
        landmark.y * image.height * scale,
        4,
        0,
        2 * Math.PI
      );
      ctx.fill();
    });
  }
}

export const poseLandmarkerService = new PoseLandmarkerService();