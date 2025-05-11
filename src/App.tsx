import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import type { FormRule, Landmark, Workout } from "@/types";
import { Plus } from "lucide-react";
import { useState } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import "./App.css";
import { FormRuleComponent } from "./components/form-rule";
import { LandmarkCanvas } from "./components/landmark-canvas";
import { PoseUpload } from "./components/pose-upload";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { useToast } from "./components/ui/use-toast";
import { saveWorkout } from "./lib/supabase";
import DocumentsPage from "./pages/DocumentsPage";

function WorkoutBuilder() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetReps, setTargetReps] = useState(10);
  const [isStartProcessing, setIsStartProcessing] = useState(false);
  const [isEndProcessing, setIsEndProcessing] = useState(false);
  const [startPoseLandmarks, setStartPoseLandmarks] = useState<
    Landmark[] | null
  >(null);
  const [endPoseLandmarks, setEndPoseLandmarks] = useState<Landmark[] | null>(
    null,
  );
  const [formRules, setFormRules] = useState<FormRule[]>([
    { id: 1, joint_name: "", min_angle: 0, max_angle: 180, feedback: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // For canvas visualization
  const [currentImage, setCurrentImage] = useState<HTMLImageElement | null>(
    null,
  );
  const [currentResults, setCurrentResults] = useState<any>(null);

  const handleStartPoseDetected = (landmarks: Landmark[]) => {
    setStartPoseLandmarks(landmarks);
    toast({
      title: "Start Pose Detected",
      description: "Landmarks extracted successfully.",
    });
  };

  const handleEndPoseDetected = (landmarks: Landmark[]) => {
    setEndPoseLandmarks(landmarks);
    toast({
      title: "End Pose Detected",
      description: "Landmarks extracted successfully.",
    });
  };

  const addFormRule = () => {
    const newId =
      formRules.length > 0
        ? Math.max(...formRules.map((rule) => rule.id)) + 1
        : 1;

    setFormRules([
      ...formRules,
      { id: newId, joint_name: "", min_angle: 0, max_angle: 180, feedback: "" },
    ]);
  };

  const updateFormRule = (
    id: number,
    field: keyof FormRule,
    value: string | number,
  ) => {
    setFormRules(
      formRules.map((rule) =>
        rule.id === id ? { ...rule, [field]: value } : rule,
      ),
    );
  };

  const removeFormRule = (id: number) => {
    setFormRules(formRules.filter((rule) => rule.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!name) {
      toast({
        title: "Validation Error",
        description: "Please enter a workout name.",
        variant: "destructive",
      });
      return;
    }

    if (!startPoseLandmarks || !endPoseLandmarks) {
      toast({
        title: "Validation Error",
        description: "Please upload both start and end pose images.",
        variant: "destructive",
      });
      return;
    }

    const validRules = formRules.filter(
      (rule) => rule.joint_name && rule.feedback,
    );
    if (validRules.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one valid form rule.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const workout: Omit<Workout, "id" | "created_at"> = {
        name,
        description,
        target_reps: targetReps,
        start_pose_landmarks: startPoseLandmarks,
        end_pose_landmarks: endPoseLandmarks,
        form_rules: validRules,
      };

      await saveWorkout(workout);

      toast({
        title: "Success!",
        description: "Workout saved successfully.",
      });

      // Reset form
      setName("");
      setDescription("");
      setTargetReps(10);
      setStartPoseLandmarks(null);
      setEndPoseLandmarks(null);
      setFormRules([
        { id: 1, joint_name: "", min_angle: 0, max_angle: 180, feedback: "" },
      ]);
    } catch (error) {
      console.error("Error saving workout:", error);
      toast({
        title: "Error",
        description: "Failed to save workout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isProcessing = isStartProcessing || isEndProcessing || isSubmitting;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto text-center">
          <h1 className="text-3xl font-bold">FormForge</h1>
          <p className="text-xl mt-2">Custom Workout Creator</p>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <form onSubmit={handleSubmit} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-2">
                <label htmlFor="workout-name" className="text-sm font-medium">
                  Workout Name
                </label>
                <Input
                  id="workout-name"
                  placeholder="e.g., Squat, Pushup, Lunge"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isProcessing}
                />
              </div>

              <div className="grid gap-2">
                <label
                  htmlFor="workout-description"
                  className="text-sm font-medium"
                >
                  Description
                </label>
                <Textarea
                  id="workout-description"
                  placeholder="Describe how to perform the exercise correctly..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isProcessing}
                />
              </div>

              <div className="grid gap-2">
                <label htmlFor="target-reps" className="text-sm font-medium">
                  Target Repetitions
                </label>
                <Input
                  id="target-reps"
                  type="number"
                  min={1}
                  value={targetReps}
                  onChange={(e) => setTargetReps(parseInt(e.target.value))}
                  disabled={isProcessing}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pose Images</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">
                Upload images of the start and end positions. We'll detect pose
                landmarks automatically.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <PoseUpload
                  title="Start Position"
                  onPoseDetected={handleStartPoseDetected}
                  isProcessing={isStartProcessing}
                  setIsProcessing={setIsStartProcessing}
                />

                <PoseUpload
                  title="End Position"
                  onPoseDetected={handleEndPoseDetected}
                  isProcessing={isEndProcessing}
                  setIsProcessing={setIsEndProcessing}
                />
              </div>

              <LandmarkCanvas image={currentImage} results={currentResults} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Form Feedback Rules</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addFormRule}
                disabled={isProcessing}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">
                Define rules for proper form and feedback messages to show when
                form is incorrect.
              </p>

              <div className="space-y-4">
                {formRules.map((rule) => (
                  <FormRuleComponent
                    key={rule.id}
                    rule={rule}
                    onChange={updateFormRule}
                    onRemove={removeFormRule}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full md:w-auto"
            size="lg"
            disabled={isProcessing}
          >
            {isSubmitting ? "Saving..." : "Save Workout"}
          </Button>
        </form>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div>
        <nav className="bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 py-2 flex items-center justify-between">
            <Link to="/" className="font-bold text-lg">
              FormForge
            </Link>
            <div className="space-x-4">
              <Link to="/" className="hover:underline">
                Workouts
              </Link>
              <Link to="/documents" className="hover:underline">
                Documents
              </Link>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<WorkoutBuilder />} />
          <Route path="/documents" element={<DocumentsPage />} />
        </Routes>

        <Toaster />
      </div>
    </BrowserRouter>
  );
}
