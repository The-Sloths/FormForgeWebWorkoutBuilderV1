import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight } from "lucide-react";
import type { WorkoutPlan } from "@/types";

const WorkoutPlansListPage: React.FC = () => {
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWorkoutPlans = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
        const response = await fetch(`${API_URL}/api/workout-plans`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: WorkoutPlan[] = await response.json();
        setWorkoutPlans(data);
      } catch (e) {
        console.error("Failed to fetch workout plans:", e);
        setError(
          `Failed to load workout plans: ${e instanceof Error ? e.message : String(e)}`,
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkoutPlans();
  }, []); // Empty dependency array means this effect runs once on mount

  const handleTileClick = (planId: string | undefined) => {
    if (planId) {
      navigate(`/workout-plan/${planId}`);
    }
  };

  const trimDescription = (
    description: string | undefined,
    maxLength = 150,
  ) => {
    if (!description) return "";
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + "...";
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto text-center">
          <h1 className="text-3xl font-bold">Gradatrim</h1>
          <p className="text-xl mt-2">Generated Workout Plans</p>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <h2 className="text-2xl font-bold mb-6 text-card-foreground">
          Available Plans
        </h2>
        {isLoading && (
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" />
            <p className="text-muted-foreground">Loading plans...</p>
          </div>
        )}
        {error && (
          <div className="text-red-500 text-center">
            <p>{error}</p>
          </div>
        )}
        {!isLoading && !error && workoutPlans.length === 0 && (
          <div className="text-muted-foreground text-center">
            <p>No workout plans found. Upload documents to generate one!</p>
          </div>
        )}
        <div className="flex flex-col gap-4">
          {!isLoading &&
            !error &&
            workoutPlans.map(
              (plan) =>
                // Ensure plan.id exists before creating the tile
                plan.id && (
                  <Card
                    key={plan.id}
                    className="flex items-center justify-between p-4 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleTileClick(plan.id)}
                  >
                    <div className="mr-4 flex-shrink-0">
                      <Button
                        variant="default"
                        size="icon"
                        aria-label={`View ${plan.program_name}`}
                      >
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    </div>
                    <CardHeader className="p-0 flex-grow">
                      <CardTitle className="text-lg">
                        {plan.program_name}
                      </CardTitle>
                      <CardContent className="p-0 mt-2 space-y-1">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-bold">Goal:</span>{" "}
                          {plan.program_goal || "Not specified"}
                        </p>
                        <CardDescription className="text-sm">
                          {trimDescription(plan.program_description)}
                        </CardDescription>
                      </CardContent>
                    </CardHeader>
                  </Card>
                ),
            )}
        </div>
        ```
      </main>
    </div>
  );
};

export default WorkoutPlansListPage;
