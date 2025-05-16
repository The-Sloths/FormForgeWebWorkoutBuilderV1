import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

import type { WorkoutPlan } from "@/types";

export const WorkoutPlanPage: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();

  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkoutPlan = async () => {
      if (!planId) {
        setError("No workout plan ID provided.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setWorkoutPlan(null); // Clear previous data

      try {
        // Fetch all workout plans and find the one matching the ID
        // A more efficient API would be GET /api/workout-plans/{planId}
        const response = await fetch("http://localhost:3000/api/workout-plans");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: WorkoutPlan[] = await response.json();

        const foundPlan = data.find((plan) => plan.id === planId);

        if (foundPlan) {
          setWorkoutPlan(foundPlan);
        } else {
          setError("Workout plan not found.");
        }
      } catch (e) {
        console.error("Failed to fetch workout plan:", e);
        setError(
          `Failed to load workout plan: ${e instanceof Error ? e.message : String(e)}`,
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkoutPlan();
  }, [planId]); // Re-run effect if planId changes

  // Conditional rendering based on state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading workout plan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!workoutPlan) {
    // Check if workoutPlan is null after loading
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Workout plan not found.</p>
      </div>
    );
  }

  // Destructure from fetched workoutPlan
  const {
    program_name,
    program_goal,
    program_description,
    required_gear,
    exercises,
    workout_plan: schedule_data, // Renamed to avoid conflict with state variable
    nutrition_advice,
    hydration_advice,
  } = workoutPlan;

  return (
    <div className="min-h-screen">
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
        {schedule_data &&
          schedule_data.schedule &&
          schedule_data.schedule.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Workout Schedule</CardTitle>
                {schedule_data.structure_type && (
                  <CardDescription>
                    Structure: {schedule_data.structure_type}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {schedule_data.schedule.map((day, dayIndex) => (
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
