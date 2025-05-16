import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  RefreshCw,
  FileText,
  Info,
  Layers,
  ClipboardList,
  DumbbellIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useFileProcessing } from "@/hooks/useFileProcessing";
import axios from "axios";
import { io, Socket } from "socket.io-client"; // Import Socket type
import { useNavigate } from "react-router-dom";
// Assuming WorkoutPlan type is exported from your types or a shared location
// If not, you might need to define a similar type here or import it
// For example, if your backend types are in a shared package or duplicated:
// import type { WorkoutPlan } from "../../../../FormForgeRAGServer/src/types/workoutPlanTypes";

// Define a simple WorkoutPlan type here if not importing from backend
interface WorkoutPlan {
  program_name: string;
  program_goal: string;
  program_description: string;
  required_gear: string[];
  exercises: Array<{
    exercise_name: string;
    exercise_type: string;
    description: string;
    target_muscles: string[];
    video_url?: string | null;
    // Add other exercise properties as needed
  }>;
  workout_plan: {
    structure_type: string;
    schedule: Array<{
      day: string;
      focus: string;
      routines: Array<{
        routine_name: string;
        routine_type: string;
        exercises_in_routine: Array<{
          exercise_name: string;
          sets?: number | string | null;
          reps?: number | string | null;
          duration?: string | number | null;
          rest_after_exercise?: string | number | null;
          // Add other exercise_in_routine properties
        }>;
      }>;
    }>;
  };
  // Add nutrition_advice, hydration_advice if needed
}

// Create socket instance - ensure this uses VITE_API_URL
const socketUrl = import.meta.env.VITE_API_URL;
const socket: Socket = io(socketUrl);

// Training Plan Modal Component
interface TrainingPlanModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  fileIds: string[];
}

const TrainingPlanModal: React.FC<TrainingPlanModalProps> = ({
  isOpen,
  setIsOpen,
  fileIds,
}) => {
  const navigate = useNavigate();
  const [planId, setPlanId] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<
    "idle" | "creating" | "generating" | "complete" | "error"
  >("idle");
  const [planProgress, setPlanProgress] = useState<number>(0);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planResult, setPlanResult] = useState<WorkoutPlan | null>(null); // Use WorkoutPlan type
  const [currentStep, setCurrentStep] = useState<string | null>(null);

  // Set up socket listeners when planId is available and modal is open
  useEffect(() => {
    // Only run if the modal is open and we have a planId - Placeholder edit
    if (!isOpen || !planId) {
      // If the modal is closing or there's no planId, the cleanup function (return)
      // from a previous run (when isOpen was true and planId was set) should handle leaving the room.
      // No need to emit leave here directly as it might lead to duplicate leave calls
      // if the cleanup function also runs.
      return;
    }

    // --- Join Room ---
    socket.emit("joinWorkoutPlanRoom", planId);

    // --- Define Handlers ---
    // These handlers will use the state values (planProgress, currentStep) as they are
    // at the time the event occurs, due to closure.
    const handleProgress = (data: unknown) => {
      // Type check the incoming data
      if (typeof data !== "object" || data === null) {
        console.error("Invalid data received for workoutPlanProgress");
        return;
      }
      const progressData = data as {
        planId?: string;
        progress?: number;
        step?: string;
        status?: string;
        message?: string;
      }; // Type assertion based on expected data structure

      if (progressData.planId === planId) {
        // Ensure event is for our current plan
        setPlanProgress(
          progressData.progress !== undefined
            ? progressData.progress
            : planProgress, // Use existing if undefined
        );
        setCurrentStep(progressData.step || currentStep); // Update step

        // More robust status update:
        if (progressData.status) {
          // Only update status if it's explicitly provided in the event
          setPlanStatus(
            progressData.status === "accepted" ||
              progressData.status === "generating"
              ? "generating"
              : (progressData.status as
                  | "idle"
                  | "creating"
                  | "generating"
                  | "complete"
                  | "error"),
          );
        } else if (planStatus === "creating" || planStatus === "generating") {
          // If no status in event, but we were already creating/generating, stay in "generating"
          setPlanStatus("generating");
        }
        // If data.status is undefined AND current planStatus is idle/complete/error, don't change it.

        if (progressData.message) setCurrentStep(progressData.message); // Update message if present
      }
    };

    const handleComplete = (data: unknown) => {
      // Type check the incoming data
      if (typeof data !== "object" || data === null) {
        console.error("Invalid data received for workoutPlanComplete");
        return;
      }
      const completeData = data as {
        planId?: string;
        result?: WorkoutPlan;
        message?: string;
      }; // Type assertion

      if (completeData.planId === planId) {
        setPlanProgress(100);
        setPlanStatus("complete");
        setPlanResult(completeData.result || null); // Handle potentially missing result
        setCurrentStep(completeData.message || "Plan generation completed!");
      }
    };

    const handleError = (data: unknown) => {
      // Type check the incoming data
      if (typeof data !== "object" || data === null) {
        console.error("Invalid data received for workoutPlanError");
        return;
      }
      const errorData = data as {
        planId?: string;
        error?: string;
        message?: string;
        step?: string;
      }; // Type assertion

      if (errorData.planId === planId) {
        console.error(
          "[TrainingPlanModal] Workout Plan Error Received:",
          errorData,
        );
        setPlanStatus("error");
        setPlanError(errorData.error || "An unknown error occurred.");
        setCurrentStep(
          errorData.message || errorData.step || "Generation failed.",
        );
      }
    };

    // --- Register Listeners ---
    socket.on("workoutPlanProgress", handleProgress);
    socket.on("workoutPlanComplete", handleComplete);
    socket.on("workoutPlanError", handleError);

    // --- Cleanup Function ---
    return () => {
      socket.off("workoutPlanProgress", handleProgress);
      socket.off("workoutPlanComplete", handleComplete);
      socket.off("workoutPlanError", handleError);
      // Only leave room if we had a planId we were listening for.
      // This check is important because if planId becomes null (e.g. modal reset)
      // before isOpen becomes false, we don't want to emit leave with a null planId.
      if (planId) {
        socket.emit("leaveWorkoutPlanRoom", planId);
      }
    };
  }, [planId, isOpen, currentStep, planProgress, planStatus]);

  const createWorkoutPlan = async () => {
    try {
      setPlanStatus("creating");
      setPlanProgress(0);
      setPlanError(null);
      setCurrentStep("Initiating plan creation...");

      const payload = {
        query:
          "Create a comprehensive calisthenics program for strength and muscle gain", // Example query
        fileIds: fileIds,
        options: {
          topK: 10,
          fitnessLevel: "intermediate",
          specificGoals: ["strength", "hypertrophy", "skill development"],
          includeNutrition: true,
          includeHydration: true,
        },
      };

      // Use the VITE_API_URL for the POST request
      const response = await axios.post(
        `${socketUrl}/api/workout-plans`, // Use socketUrl which respects VITE_API_URL
        payload,
      );
      console.log("Workout plan creation initiated:", response.data);

      if (response.data && response.data.planId) {
        setPlanId(response.data.planId);
        // The 'accepted' status comes from the HTTP response
        if (response.data.status === "accepted") {
          setPlanStatus("generating"); // Transition to generating as backend starts work
          setCurrentStep(
            response.data.message || "Request accepted by server.",
          );
        }
      } else {
        throw new Error("Invalid response from server: missing planId.");
      }
    } catch (error: unknown) {
      console.error("Error creating workout plan:", error);
      setPlanStatus("error");
      let errorMessage = "An unknown error occurred.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "data" in error.response &&
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "message" in error.response.data &&
        typeof error.response.data.message === "string"
      ) {
        errorMessage = error.response.data.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      setPlanError(errorMessage || "Failed to create workout plan");
      setCurrentStep("Failed to initiate plan creation.");
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    // Optionally reset state if modal is closed before completion
    if (planStatus !== "complete") {
      setPlanStatus("idle");
      setPlanId(null);
      setPlanProgress(0);
      setPlanError(null);
      setPlanResult(null);
      setCurrentStep(null);
    }
  };

  const handleShowPlans = () => {
    if (planResult) {
      console.log("Navigating to workout plan page with ID:", planId);
      navigate(`/workout-plan/${planId}`); // Navigate with planId as URL parameter
      setIsOpen(false); // Close modal after navigation
    } else {
      console.error("Cannot navigate: planId or planResult is null/undefined.");
      // Optionally show a toast or message
    }
  };

  const getStatusIcon = () => {
    switch (planStatus) {
      case "complete":
        return <CheckCircle className="h-10 w-10 text-green-500 mb-4" />;
      case "error":
        return <AlertCircle className="h-10 w-10 text-red-500 mb-4" />;
      case "creating":
      case "generating":
        return (
          <RefreshCw className="h-10 w-10 text-blue-500 animate-spin mb-4" />
        );
      default: // idle
        return <DumbbellIcon className="h-10 w-10 text-gray-400 mb-4" />;
    }
  };

  const getStatusTitle = () => {
    switch (planStatus) {
      case "complete":
        return "Training Plan Ready!";
      case "error":
        return "Training Plan Error";
      case "creating":
        return "Requesting Training Plan";
      case "generating":
        return "Generating Your Plan";
      default: // idle
        return "Create Training Plan";
    }
  };

  const getStatusDescription = () => {
    switch (planStatus) {
      case "complete":
        return (
          planResult?.program_name ||
          "Your personalized training plan has been created."
        );
      case "error":
        return planError || "An error occurred.";
      case "creating":
        return "Sending request to the server...";
      case "generating":
        return currentStep || "Working on your plan...";
      default: // idle
        return "Ready to create a plan from your documents.";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex items-center flex-col sm:items-start">
          <div className="flex justify-center w-full mb-2">
            {getStatusIcon()}
          </div>
          <DialogTitle>{getStatusTitle()}</DialogTitle>
          <DialogDescription>{getStatusDescription()}</DialogDescription>
        </DialogHeader>

        {(planStatus === "creating" || planStatus === "generating") && (
          <div className="my-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(planProgress)}% {/* Ensure progress is rounded */}
              </span>
            </div>
            <Progress value={planProgress} className="h-2" />
          </div>
        )}

        {planStatus === "complete" && planResult && (
          <div className="my-4 text-sm max-h-60 overflow-y-auto">
            <div className="flex flex-col space-y-2 text-muted-foreground">
              <div className="flex items-center">
                <ClipboardList className="h-4 w-4 mr-2" />
                <p className="font-medium text-card-foreground">
                  {planResult.program_name || "Custom Workout Program"}
                </p>
              </div>
              <p className="text-xs">
                Goal: {planResult.program_goal || "Not specified."}
              </p>
              <p className="text-xs">
                Description:{" "}
                {planResult.program_description || "No description."}
              </p>
              {planResult.required_gear &&
                planResult.required_gear.length > 0 && (
                  <div className="text-xs">
                    <p className="font-medium">Required Gear:</p>
                    <ul className="ml-4 mt-1 space-y-1 list-disc">
                      {planResult.required_gear.map(
                        (item: string, index: number) => (
                          <li key={index}>{item}</li>
                        ),
                      )}
                    </ul>
                  </div>
                )}
            </div>
          </div>
        )}

        <details className="text-xs text-muted-foreground mt-2 mb-2">
          <summary className="flex items-center cursor-pointer">
            <Info className="h-3 w-3 mr-1" />
            Debug Info
          </summary>
          <div className="mt-1 pl-4 border-l-2 border-muted max-h-20 overflow-y-auto">
            <p>Plan ID: {planId || "None"}</p>
            <p>Client Status: {planStatus}</p>
            <p>Server Step: {currentStep || "N/A"}</p>
            <p>Progress: {Math.round(planProgress)}%</p>
            <p>Files for plan: {fileIds.length}</p>
            {planError && <p className="text-red-500">Error: {planError}</p>}
          </div>
        </details>

        <DialogFooter className="mt-4">
          {planStatus === "complete" ? (
            <Button onClick={handleShowPlans} className="w-full">
              View Full Plan
            </Button>
          ) : planStatus === "error" ? (
            <Button onClick={handleClose} className="w-full" variant="outline">
              Close
            </Button>
          ) : planStatus === "creating" || planStatus === "generating" ? (
            <Button disabled className="w-full">
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </Button>
          ) : (
            // Idle state
            <Button
              onClick={createWorkoutPlan}
              className="w-full"
              disabled={fileIds.length === 0}
            >
              Start Plan Creation
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
// Main Processing Modal (the rest of the component remains the same)
// ... (rest of ProcessingModal component) ...

// Main Processing Modal
const ProcessingModal: React.FC = () => {
  const {
    processingId,
    uploadId,
    processingStatus,
    processingProgress,
    currentFile,
    processedFiles,
    totalFiles,
    processingError,
    processingResults,
    isModalOpen,
    setIsModalOpen,
    resetProcessing,
    // New fields from AsyncAPI
    currentChunk,
    totalChunks,
    embeddingProgress,
    fileProgress,
    statusMessage,
    serverStatus,
  } = useFileProcessing();

  // State for training plan modal
  const [isTrainingPlanModalOpen, setIsTrainingPlanModalOpen] = useState(false);
  const [fileIdsForPlan, setFileIdsForPlan] = useState<string[]>([]); // Renamed to avoid conflict

  // Debug - last update timestamp
  const [lastUpdate, setLastUpdate] = useState<string>("");

  // Update timestamp whenever any processing state changes
  useEffect(() => {
    setLastUpdate(new Date().toISOString());
  }, [
    processingStatus,
    processingProgress,
    currentFile,
    processedFiles,
    totalFiles,
    currentChunk,
    totalChunks,
    embeddingProgress,
    fileProgress,
    statusMessage,
    serverStatus,
  ]);

  // Automatically open training plan modal when processing is complete
  useEffect(() => {
    if (
      processingStatus === "complete" &&
      processingResults && // Ensure processingResults itself is not null
      Array.isArray(processingResults.results) && // Ensure .results is an array
      !isTrainingPlanModalOpen
    ) {
      // Extract file IDs from processing results
      const extractedFileIds = processingResults.results.map(
        (result) => result.fileId,
      );

      if (extractedFileIds.length > 0) {
        setFileIdsForPlan(extractedFileIds);
        setTimeout(() => {
          setIsModalOpen(false);
          setIsTrainingPlanModalOpen(true);
        }, 1000);
      } else {
        // This case means processingResults.results was an empty array.
        console.warn(
          "Processing complete, but no file IDs found in processingResults.results. Training plan modal will not open.",
        );
        // Optionally, still close the current modal or show a message
        // setIsModalOpen(false); // Example: close the current modal anyway
      }
    } else if (
      processingStatus === "complete" &&
      processingResults &&
      !Array.isArray(processingResults.results)
    ) {
      // Log if processingResults is set but results is not an array
      console.warn(
        "Processing complete, but processingResults.results is not an array:",
        processingResults.results,
      );
      // setIsModalOpen(false); // Example: close the current modal
    }
  }, [
    processingStatus,
    processingResults,
    isModalOpen,
    setIsModalOpen,
    isTrainingPlanModalOpen,
  ]); // Added dependencies

  const getStatusIcon = () => {
    switch (processingStatus) {
      case "complete":
        return <CheckCircle className="h-10 w-10 text-green-500 mb-4" />;
      case "error":
        return <AlertCircle className="h-10 w-10 text-red-500 mb-4" />;
      case "processing":
        return (
          <RefreshCw className="h-10 w-10 text-blue-500 animate-spin mb-4" />
        );
      default:
        return null;
    }
  };

  const getStatusTitle = () => {
    switch (processingStatus) {
      case "complete":
        return "Document Learning Complete";
      case "error":
        return "Document Learning Error";
      case "processing":
        // Use detailed server status if available
        if (serverStatus) {
          switch (serverStatus) {
            case "analyzing":
              return "Analyzing Documents";
            case "processing":
              return "Processing Documents";
            case "embedding":
              return "Organising Knowledge";
            case "file_complete":
              return "Learnt a thing or two";
            default:
              return "Processing Files";
          }
        }
        return "Processing Files";
      default:
        return "Processing";
    }
  };

  const getStatusDescription = () => {
    // Use status message from the server if available
    if (statusMessage) {
      return statusMessage;
    }

    switch (processingStatus) {
      case "complete":
        return `All ${processedFiles} files have been processed. Ready to create a training plan.`;
      case "error":
        return processingError || "An error occurred during processing.";
      case "processing":
        if (currentFile && currentChunk && totalChunks) {
          return `Processing ${currentFile}: Chunk ${currentChunk}/${totalChunks} (${processedFiles}/${totalFiles} files)`;
        } else if (currentFile) {
          return `Processing ${currentFile}... (${processedFiles}/${totalFiles} files)`;
        }
        return "Your files are being processed. This may take a moment...";
      default:
        return "";
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    if (processingStatus === "complete" || processingStatus === "error") {
      resetProcessing();
    }
  };

  // Function to render additional progress bars based on available data
  const renderDetailedProgress = () => {
    return (
      <div className="space-y-3 mt-4">
        {/* File progress if available */}
        {fileProgress !== null && typeof fileProgress === "number" && (
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-medium">
                Current File ({currentFile || "N/A"})
              </span>
              <span className="text-muted-foreground">{fileProgress}%</span>
            </div>
            <Progress value={fileProgress} className="h-1" />
          </div>
        )}

        {/* Embedding progress if available */}
        {embeddingProgress !== null &&
          typeof embeddingProgress === "number" && (
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-medium">Knowledge Embedding</span>
                <span className="text-muted-foreground">
                  {embeddingProgress}%
                </span>
              </div>
              <Progress value={embeddingProgress} className="h-1" />
            </div>
          )}
      </div>
    );
  };

  return (
    <>
      {/* Processing Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="flex items-center flex-col sm:items-start">
            <div className="flex justify-center w-full mb-2">
              {getStatusIcon()}
            </div>
            <DialogTitle>{getStatusTitle()}</DialogTitle>
            <DialogDescription>{getStatusDescription()}</DialogDescription>
          </DialogHeader>

          {/* Only show progress for processing state */}
          {processingStatus === "processing" && (
            <div className="my-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">
                  {processingProgress}%
                </span>
              </div>
              <Progress value={processingProgress} className="h-2 mb-2" />

              {/* Display current status message more prominently if available during processing */}
              {statusMessage && (
                <p className="text-xs text-center text-muted-foreground mb-3">
                  {statusMessage}
                </p>
              )}

              {/* Show detailed progress bars */}
              {renderDetailedProgress()}

              {/* Show file progress if available */}
              {totalFiles > 0 && (
                <div className="flex items-center mt-2 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3 mr-1" />
                  <span>
                    {processedFiles} of {totalFiles} files processed
                  </span>
                </div>
              )}

              {/* Show chunk information if available and not already in statusMessage */}
              {/* The getStatusDescription in DialogDescription might already show this,
                  but this provides an alternative place if needed or for more direct display */}
              {currentChunk !== null &&
                totalChunks !== null &&
                (!statusMessage ||
                  !statusMessage.toLowerCase().includes("chunk")) && (
                  <div className="flex items-center mt-1 text-xs text-muted-foreground">
                    <Layers className="h-3 w-3 mr-1" />
                    <span>
                      Current Chunk: {currentChunk} of {totalChunks}
                    </span>
                  </div>
                )}
            </div>
          )}

          {/* Show results summary when complete */}
          {processingStatus === "complete" && processingResults && (
            <div className="my-4 text-sm">
              <div className="flex flex-col space-y-1 text-muted-foreground">
                <p>Total chunks created: {processingResults.totalChunks}</p>
                <p>
                  Total characters processed:{" "}
                  {processingResults.totalCharacters}
                </p>
                {processingResults.results &&
                  processingResults.results.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer">File details</summary>
                      <ul className="ml-4 mt-1 space-y-1 list-disc">
                        {processingResults.results.map((result, index) => (
                          <li key={index}>
                            {result.filename}: {result.chunks} chunks,{" "}
                            {result.totalCharacters} characters
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
              </div>
            </div>
          )}

          {/* Debug info in collapsible section */}
          <details className="text-xs text-muted-foreground mt-2 mb-2">
            <summary className="flex items-center cursor-pointer">
              <Info className="h-3 w-3 mr-1" />
              Debug Info
            </summary>
            <div className="mt-1 pl-4 border-l-2 border-muted  max-h-20 overflow-y-auto">
              <p>Upload ID: {uploadId || "None"}</p>
              <p>Processing ID: {processingId || "None"}</p>
              <p>Status: {processingStatus}</p>
              <p>Server Status: {serverStatus || "None"}</p>
              <p>Last Update: {lastUpdate}</p>
            </div>
          </details>

          <DialogFooter className="mt-4">
            {processingStatus === "complete" ? (
              <div className="w-full text-center text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 mx-auto mb-2 animate-spin" />
                Preparing Training Plan Creation...
              </div>
            ) : processingStatus === "error" ? (
              <Button
                onClick={handleClose}
                className="w-full"
                variant="outline"
              >
                Close
              </Button>
            ) : (
              <Button disabled className="w-full">
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Learning from documents...
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Training Plan Modal */}
      <TrainingPlanModal
        isOpen={isTrainingPlanModalOpen}
        setIsOpen={setIsTrainingPlanModalOpen}
        fileIds={fileIdsForPlan} // Use renamed state
      />
    </>
  );
};

export default ProcessingModal;
