export interface Exercise {
  exercise_name: string;
  exercise_type: "Basics" | "Skill" | "Static Hold" | "Dynamic" | "Stretch" | "Mobility Drill" | "Cardio" | "Weighted" | "Freestyle" | "Other";
  description: string;
  target_muscles: string[];
  video_url?: string | null;
  progressions?: Array<{
    level_name: string;
    description: string;
  }> | null;
}

export interface ExerciseInRoutine {
  exercise_name: string;
  progression_level?: string | null;
  sets?: number | string | null;
  reps?: number | string | null;
  duration?: string | number | null;
  rest_after_exercise?: string | number | null;
  notes?: string | null;
}

export interface Routine {
  routine_name: string;
  routine_type: "Standard Sets/Reps" | "Circuit" | "AMRAP" | "EMOM" | "Tabata" | "Warm-up" | "Cool-down" | "Greasing the Groove Session" | "Other";
  duration?: string | null;
  notes?: string | null;
  exercises_in_routine: ExerciseInRoutine[];
}

export interface WorkoutDay {
  day: string;
  focus: string;
  routines: Routine[];
}

export interface WorkoutPlanSchedule {
  structure_type: "Weekly Split" | "Circuit Based" | "AMRAP" | "EMOM" | "Tabata" | "Greasing the Groove" | "Other";
  schedule: WorkoutDay[];
}

export interface KeyPrinciple {
  principle_name: string;
  description: string;
}

export interface MacronutrientsGuidelines {
  calories?: string;
  carbohydrates?: string;
  protein?: string;
  fats?: string;
}

export interface Meal {
  time?: string;
  meal_type: string;
  consumption: string;
}

export interface ExampleMealPlan {
  plan_name: string;
  meals: Meal[];
}

export interface NutritionAdvice {
  overview?: string;
  key_principles?: KeyPrinciple[];
  macronutrients_guidelines?: MacronutrientsGuidelines;
  example_meal_plans?: ExampleMealPlan[] | null;
}

export interface HydrationAdvice {
  overview?: string;
  recommended_intake?: string;
}

export interface WorkoutPlan {
  id?: string; // Assuming the API adds an ID
  program_name: string;
  program_goal: string;
  program_description: string;
  required_gear: string[];
  exercises: Exercise[];
  workout_plan: WorkoutPlanSchedule;
  nutrition_advice?: NutritionAdvice | null;
  hydration_advice?: HydrationAdvice | null;
  created_at?: string; // Assuming the API adds a creation timestamp
}
