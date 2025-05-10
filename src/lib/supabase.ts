import type { Workout } from "@/types";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL and key must be defined in .env file");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export const saveWorkout = async (
  workout: Omit<Workout, "id" | "created_at">,
) => {
  const { data, error } = await supabase
    .from("workouts")
    .insert(workout)
    .select();

  if (error) {
    throw error;
  }

  return data[0];
};

export const uploadImage = async (file: File, poseType: "start" | "end") => {
  const fileName = `${Date.now()}_${poseType}_${file.name}`;
  const filePath = `workout_images/${fileName}`;

  const { error } = await supabase.storage
    .from("workouts")
    .upload(filePath, file);

  if (error) {
    throw error;
  }

  const { data: urlData } = supabase.storage
    .from("workouts")
    .getPublicUrl(filePath);

  return urlData.publicUrl;
};
