export interface FormRule {
    id: number;
    joint_name: string;
    min_angle: number;
    max_angle: number;
    feedback: string;
  }
  
  export interface Landmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
  }
  
  export interface Workout {
    id?: string;
    name: string;
    description: string;
    target_reps: number;
    start_pose_landmarks: Landmark[];
    end_pose_landmarks: Landmark[];
    form_rules: FormRule[];
    created_at?: string;
  }
  
  export interface PoseLandmarkerResult {
    landmarks?: Landmark[][];
    worldLandmarks?: Landmark[][];
  }