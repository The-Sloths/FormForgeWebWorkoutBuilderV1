import React from "react";
import { useLocation } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Define the structure of the WorkoutPlan based on backend types
// This should ideally come from a shared types definition or be accurately manually defined
interface Exercise {
  exercise_name: string;
  exercise_type: string;
  description: string;
  target_muscles: string[];
  video_url?: string | null;
  // Add other properties like progressions if they exist in your backend type
}

interface ExerciseInRoutine {
  exercise_name: string;
  progression_level?: string | null;
  sets?: number | string | null;
  reps?: number | string | null;
  duration?: string | number | null;
  rest_after_exercise?: string | number | null;
  notes?: string | null;
}

interface Routine {
  routine_name: string;
  routine_type: string;
  duration?: string | null;
  notes?: string | null;
  exercises_in_routine: ExerciseInRoutine[];
}

interface WorkoutDay {
  day: string;
  focus: string;
  routines: Routine[];
}

interface WorkoutPlanStructure {
  structure_type: string;
  schedule: WorkoutDay[];
}

interface NutritionAdvice {
  overview: string;
  // Add other nutrition properties if they exist
}

interface HydrationAdvice {
  overview: string;
  // Add other hydration properties if they exist
}

export interface WorkoutPlan {
  // Renamed from WorkoutPlanData to match backend more closely
  program_name: string;
  program_goal: string;
  program_description: string;
  required_gear: string[];
  exercises: Exercise[];
  workout_plan: WorkoutPlanStructure;
  nutrition_advice?: NutritionAdvice | null;
  hydration_advice?: HydrationAdvice | null;
}

// Sample data (can be kept for fallback or development)
const sampleWorkoutPlan: WorkoutPlan = {
  program_name: "Sample Basic Calisthenics",
  program_goal: "Build fundamental strength",
  program_description: "A sample bodyweight program.",
  required_gear: ["None"],
  exercises: [
    {
      exercise_name: "Push-up",
      exercise_type: "Basics",
      description: "Standard push-up.",
      target_muscles: ["Chest", "Shoulders", "Triceps"],
    },
    {
      exercise_name: "Squat",
      exercise_type: "Basics",
      description: "Bodyweight squat.",
      target_muscles: ["Quads", "Glutes"],
    },
  ],
  workout_plan: {
    structure_type: "Weekly Split",
    schedule: [
      {
        day: "Day 1",
        focus: "Full Body",
        routines: [
          {
            routine_name: "Circuit A",
            routine_type: "Circuit",
            exercises_in_routine: [
              {
                exercise_name: "Push-up",
                sets: 3,
                reps: 10,
                rest_after_exercise: "60s",
              },
              {
                exercise_name: "Squat",
                sets: 3,
                reps: 15,
                rest_after_exercise: "60s",
              },
            ],
          },
        ],
      },
      { day: "Day 2", focus: "Rest", routines: [] },
      {
        day: "Day 3",
        focus: "Full Body",
        routines: [
          {
            routine_name: "Circuit B",
            routine_type: "Circuit",
            exercises_in_routine: [
              {
                exercise_name: "Push-up",
                sets: 3,
                reps: 12,
                rest_after_exercise: "60s",
              },
              {
                exercise_name: "Squat",
                sets: 3,
                reps: 20,
                rest_after_exercise: "60s",
              },
            ],
          },
        ],
      },
      { day: "Day 4", focus: "Rest", routines: [] },
      {
        day: "Day 5",
        focus: "Full Body",
        routines: [
          {
            routine_name: "Circuit C",
            routine_type: "Circuit",
            exercises_in_routine: [
              {
                exercise_name: "Push-up",
                sets: 3,
                reps: 15,
                rest_after_exercise: "60s",
              },
              {
                exercise_name: "Squat",
                sets: 3,
                reps: 25,
                rest_after_exercise: "60s",
              },
            ],
          },
        ],
      },
    ],
  },
};

export const WorkoutPlanPage: React.FC = () => {
  const location = useLocation();
  // Attempt to get workoutPlan from navigation state, default to sample if not found
  const workoutData =
    (location.state as { workoutPlan?: WorkoutPlan })?.workoutPlan ||
    sampleWorkoutPlan;

  if (!workoutData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>No workout plan data found. Please generate a plan first.</p>
      </div>
    );
  }

  const {
    program_name,
    program_goal,
    program_description,
    required_gear,
    exercises,
    workout_plan,
    nutrition_advice, // Added
    hydration_advice, // Added
  } = workoutData;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto text-center">
          <h1 className="text-3xl font-bold">Workout Plan</h1>
          <p className="text-xl mt-2">{program_name}</p>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4 space-y-8">
        {/* Program Overview Section */}
        <Card>
          <CardHeader>
            <CardTitle>Program Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium text-lg">Goal</h3>
              <p className="text-muted-foreground">{program_goal}</p>
            </div>
            <div>
              <h3 className="font-medium text-lg">Description</h3>
              <p className="text-muted-foreground">{program_description}</p>
            </div>
            {required_gear && required_gear.length > 0 && (
              <div>
                <h3 className="font-medium text-lg">Required Equipment</h3>
                <ul className="list-disc pl-5 mt-2 text-muted-foreground">
                  {required_gear.map((gear, index) => (
                    <li key={index}>{gear}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Exercises Section */}
        {exercises && exercises.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Exercises</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {exercises.map((exercise, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardHeader className="bg-gray-50 dark:bg-gray-800">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">
                          {exercise.exercise_name}
                        </CardTitle>
                        <Badge variant="secondary">
                          {exercise.exercise_type}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {exercise.description}
                      </p>
                      {exercise.target_muscles &&
                        exercise.target_muscles.length > 0 && (
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-xs font-medium text-muted-foreground">
                              Targets:
                            </span>
                            {exercise.target_muscles.map((muscle, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="text-xs"
                              >
                                {muscle}
                              </Badge>
                            ))}
                          </div>
                        )}
                      {exercise.video_url && (
                        <a
                          href={exercise.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Watch Video
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Workout Schedule Section */}
        {workout_plan &&
          workout_plan.schedule &&
          workout_plan.schedule.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Workout Schedule</CardTitle>
                {workout_plan.structure_type && (
                  <CardDescription>
                    Structure: {workout_plan.structure_type}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {workout_plan.schedule.map((day, dayIndex) => (
                    <Card key={dayIndex}>
                      <CardHeader className="bg-gray-50 dark:bg-gray-800">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">{day.day}</CardTitle>
                          {day.focus && (
                            <Badge variant="default">{day.focus}</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        {day.routines && day.routines.length > 0 ? (
                          day.routines.map((routine, routineIndex) => (
                            <div key={routineIndex} className="mb-4 last:mb-0">
                              <h4 className="font-semibold mb-1 capitalize">
                                {routine.routine_name || routine.routine_type}
                                {routine.duration && (
                                  <span className="text-sm text-muted-foreground ml-2">
                                    ({routine.duration})
                                  </span>
                                )}
                              </h4>
                              {routine.notes && (
                                <p className="text-xs text-muted-foreground mb-2">
                                  {routine.notes}
                                </p>
                              )}
                              {routine.exercises_in_routine &&
                              routine.exercises_in_routine.length > 0 ? (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm border-collapse">
                                    <thead className="bg-gray-100 dark:bg-gray-700">
                                      <tr>
                                        <th className="p-2 border text-left font-medium">
                                          Exercise
                                        </th>
                                        <th className="p-2 border text-center font-medium">
                                          Sets
                                        </th>
                                        <th className="p-2 border text-center font-medium">
                                          Reps/Time
                                        </th>
                                        <th className="p-2 border text-center font-medium">
                                          Rest
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {routine.exercises_in_routine.map(
                                        (ex, exIndex) => (
                                          <tr
                                            key={exIndex}
                                            className="border-b dark:border-gray-700"
                                          >
                                            <td className="p-2 border">
                                              {ex.exercise_name}
                                              {ex.progression_level && (
                                                <span className="block text-xs text-muted-foreground">
                                                  ({ex.progression_level})
                                                </span>
                                              )}
                                              {ex.notes && (
                                                <span className="block text-xs text-muted-foreground italic mt-1">
                                                  {ex.notes}
                                                </span>
                                              )}
                                            </td>
                                            <td className="p-2 border text-center">
                                              {ex.sets || "-"}
                                            </td>
                                            <td className="p-2 border text-center">
                                              {ex.reps || ex.duration || "-"}
                                            </td>
                                            <td className="p-2 border text-center">
                                              {ex.rest_after_exercise || "-"}
                                            </td>
                                          </tr>
                                        ),
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  No exercises in this routine.
                                </p>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {day.focus === "Rest" ||
                            day.focus === "Active Recovery"
                              ? "Take it easy today!"
                              : "No routines scheduled for this day."}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Nutrition Advice Section */}
        {nutrition_advice && (
          <Card>
            <CardHeader>
              <CardTitle>Nutrition Advice</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {nutrition_advice.overview ||
                  "General nutrition guidelines will appear here."}
              </p>
              {/* TODO: Add more detailed rendering for nutrition_advice.key_principles, macronutrients_guidelines etc. */}
            </CardContent>
          </Card>
        )}

        {/* Hydration Advice Section */}
        {hydration_advice && (
          <Card>
            <CardHeader>
              <CardTitle>Hydration Advice</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {hydration_advice.overview ||
                  "General hydration guidelines will appear here."}
              </p>
              {/* TODO: Add more detailed rendering for hydration_advice.recommended_intake etc. */}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default WorkoutPlanPage;
