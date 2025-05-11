import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge"; // We'll need to create this component if it doesn't exist

// Interface for the workout plan data structure
interface WorkoutPlanData {
  planId: string;
  message: string;
  status: string;
  plan: {
    program_name: string;
    program_goal: string;
    program_description: string;
    required_gear: string[];
    exercises: Array<{
      name: string;
      category: string;
      description: string;
      primary_muscles: string[];
    }>;
    workout_plan: {
      structure_type: string;
      schedule: Array<{
        day: string;
        focus: string;
        routines: Array<{
          routine_type: string;
          exercises: Array<{
            exercise_name: string;
            sets: number;
            reps: number;
            rest: string;
          }>;
        }>;
      }>;
    };
  };
}

// Sample data from the provided JSON
const sampleWorkoutPlan: WorkoutPlanData = {
  planId: "0cc3f2bd-77ad-4cbc-88a8-80501cc3b065",
  message: "Workout plan generation initiated",
  status: "queued",
  plan: {
    program_name: "Basic Calisthenics Training Program",
    program_goal: "Build fundamental strength and movement skills",
    program_description:
      "A simplified program focusing on essential bodyweight exercises to develop basic strength and movement patterns.",
    required_gear: ["None - bodyweight only"],
    exercises: [
      {
        name: "Push-up",
        category: "Basics",
        description:
          "Standard push-up with hands shoulder-width apart, body in a straight line, and lowering the chest to the ground.",
        primary_muscles: ["Chest", "Shoulders", "Triceps", "Core"],
      },
      {
        name: "Bodyweight Squat",
        category: "Basics",
        description:
          "Standing with feet shoulder-width apart, lower your body by bending knees and hips as if sitting in a chair, then return to standing.",
        primary_muscles: ["Quadriceps", "Glutes", "Hamstrings", "Core"],
      },
      {
        name: "Plank",
        category: "Static Hold",
        description:
          "Support your body on forearms and toes, maintaining a straight line from head to heels.",
        primary_muscles: ["Core", "Shoulders", "Back"],
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
              routine_type: "Circuit",
              exercises: [
                {
                  exercise_name: "Push-up",
                  sets: 3,
                  reps: 10,
                  rest: "60 seconds",
                },
                {
                  exercise_name: "Bodyweight Squat",
                  sets: 3,
                  reps: 15,
                  rest: "60 seconds",
                },
                {
                  exercise_name: "Plank",
                  sets: 3,
                  reps: 0,
                  rest: "60 seconds",
                },
              ],
            },
          ],
        },
        {
          day: "Day 2",
          focus: "Rest",
          routines: [
            {
              routine_type: "Other",
              exercises: [],
            },
          ],
        },
        {
          day: "Day 3",
          focus: "Full Body",
          routines: [
            {
              routine_type: "Circuit",
              exercises: [
                {
                  exercise_name: "Push-up",
                  sets: 3,
                  reps: 10,
                  rest: "60 seconds",
                },
                {
                  exercise_name: "Bodyweight Squat",
                  sets: 3,
                  reps: 15,
                  rest: "60 seconds",
                },
                {
                  exercise_name: "Plank",
                  sets: 3,
                  reps: 0,
                  rest: "60 seconds",
                },
              ],
            },
          ],
        },
        {
          day: "Day 4",
          focus: "Rest",
          routines: [
            {
              routine_type: "Other",
              exercises: [],
            },
          ],
        },
        {
          day: "Day 5",
          focus: "Full Body",
          routines: [
            {
              routine_type: "Circuit",
              exercises: [
                {
                  exercise_name: "Push-up",
                  sets: 3,
                  reps: 10,
                  rest: "60 seconds",
                },
                {
                  exercise_name: "Bodyweight Squat",
                  sets: 3,
                  reps: 15,
                  rest: "60 seconds",
                },
                {
                  exercise_name: "Plank",
                  sets: 3,
                  reps: 0,
                  rest: "60 seconds",
                },
              ],
            },
          ],
        },
      ],
    },
  },
};

export const WorkoutPlanPage: React.FC<{ data?: WorkoutPlanData }> = ({
  data = sampleWorkoutPlan, // Default to sample data if none provided
}) => {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto text-center">
          <h1 className="text-3xl font-bold">Workout Plan</h1>
          <p className="text-xl mt-2">{data.plan.program_name}</p>
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
              <p>{data.plan.program_goal}</p>
            </div>
            <div>
              <h3 className="font-medium text-lg">Description</h3>
              <p>{data.plan.program_description}</p>
            </div>
            <div>
              <h3 className="font-medium text-lg">Required Equipment</h3>
              <ul className="list-disc pl-5 mt-2">
                {data.plan.required_gear.map((gear, index) => (
                  <li key={index}>{gear}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Exercises Section */}
        <Card>
          <CardHeader>
            <CardTitle>Exercises</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {data.plan.exercises.map((exercise, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader className="bg-gray-50">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{exercise.name}</CardTitle>
                      <div className="text-sm font-medium text-gray-500">
                        {exercise.category}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <p className="mb-2">{exercise.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-sm font-medium">
                        Target muscles:
                      </span>
                      {exercise.primary_muscles.map((muscle, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                        >
                          {muscle}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Workout Schedule Section */}
        <Card>
          <CardHeader>
            <CardTitle>Workout Schedule</CardTitle>
            <CardDescription>
              Structure: {data.plan.workout_plan.structure_type}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {data.plan.workout_plan.schedule.map((day, dayIndex) => (
                <Card key={dayIndex}>
                  <CardHeader className="bg-gray-50">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">{day.day}</CardTitle>
                      <div className="text-sm font-medium text-gray-500">
                        Focus: {day.focus}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {day.routines.map((routine, routineIndex) => (
                        <div key={routineIndex}>
                          <h3 className="font-medium mb-2">
                            {routine.routine_type}
                          </h3>
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-gray-50 text-left">
                                <th className="p-2 border">Exercise</th>
                                <th className="p-2 border text-center">Sets</th>
                                <th className="p-2 border text-center">Reps</th>
                                <th className="p-2 border text-center">Rest</th>
                              </tr>
                            </thead>
                            <tbody>
                              {routine.exercises.map((ex, exIndex) => (
                                <tr key={exIndex} className="border-b">
                                  <td className="p-2 border font-medium">
                                    {ex.exercise_name}
                                  </td>
                                  <td className="p-2 border text-center">
                                    {ex.sets}
                                  </td>
                                  <td className="p-2 border text-center">
                                    {ex.reps}
                                  </td>
                                  <td className="p-2 border text-center">
                                    {ex.rest}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default WorkoutPlanPage;
