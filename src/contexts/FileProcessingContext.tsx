import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import axios from "axios";
import {
  socketService,
  type ProcessingStartData,
  type ProcessingProgressData,
  type ProcessingCompleteData,
  type ProcessingErrorData,
  type ProcessingStatus as SocketProcessingStatus,
} from "@/lib/socket";
import { useToast } from "@/components/ui/use-toast";

// Type for UI processing status (slightly different from socket status)
type ProcessingStatus = "idle" | "processing" | "complete" | "error";

// Define interfaces for the processing results
interface ProcessingFileResult {
  fileId: string;
  filename: string;
  chunks: number;
  totalCharacters: number;
}

interface ProcessingResults {
  totalChunks: number;
  totalCharacters: number;
  results: ProcessingFileResult[];
}

// Map socket status to UI status for display
const mapSocketStatusToUiStatus = (
  status?: SocketProcessingStatus,
): ProcessingStatus => {
  if (!status) return "processing";

  switch (status) {
    case "complete":
      return "complete";
    case "error":
    case "partial_error":
      return "error";
    case "partial_complete":
      return "complete"; // Still show as complete in UI
    case "analyzing":
    case "processing":
    case "embedding":
    case "file_complete":
    default:
      return "processing";
  }
};

interface FileProcessingContextState {
  processingId: string | null;
  uploadId: string | null;
  processingStatus: ProcessingStatus;
  processingProgress: number;
  currentFile: string | null;
  processedFiles: number;
  totalFiles: number;
  processingError: string | null;
  processingResults: ProcessingResults | null;
  isModalOpen: boolean;
  currentChunk: number | null;
  totalChunks: number | null;
  embeddingProgress: number | null;
  fileProgress: number | null;
  statusMessage: string | null;
  serverStatus: SocketProcessingStatus | null;
}

interface FileProcessingContextActions {
  startProcessing: (uploadId: string, fileIds: string[]) => Promise<void>;
  setIsModalOpen: (open: boolean) => void;
  resetProcessing: () => void;
}

type FileProcessingContextType = FileProcessingContextState &
  FileProcessingContextActions;

const FileProcessingContext = createContext<
  FileProcessingContextType | undefined
>(undefined);

interface FileProcessingProviderProps {
  children: ReactNode;
}

export const FileProcessingProvider: React.FC<FileProcessingProviderProps> = ({
  children,
}) => {
  const { toast } = useToast();

  // Processing state
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] =
    useState<ProcessingStatus>("idle");
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [processedFiles, setProcessedFiles] = useState<number>(0);
  const [totalFiles, setTotalFiles] = useState<number>(0);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [processingResults, setProcessingResults] =
    useState<ProcessingResults | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Additional state for detailed progress
  const [currentChunk, setCurrentChunk] = useState<number | null>(null);
  const [totalChunks, setTotalChunks] = useState<number | null>(null);
  const [embeddingProgress, setEmbeddingProgress] = useState<number | null>(
    null,
  );
  const [fileProgress, setFileProgress] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [serverStatus, setServerStatus] =
    useState<SocketProcessingStatus | null>(null);

  // Use refs for event handlers to avoid dependency issues with useEffect
  const handlersRef = useRef({
    handleProcessingStart: (data: ProcessingStartData) => {
      console.log(
        `Processing start event received for uploadId: ${data.uploadId}`,
      );

      // IMPORTANT FIX: Be more lenient in accepting events
      // Accept the event if it matches our uploadId OR if we don't have an uploadId yet
      if (data.uploadId === uploadId || (data.uploadId && !uploadId)) {
        console.log("Processing start event matches our uploadId", data);

        // If our uploadId isn't set yet, set it now
        if (!uploadId && data.uploadId) {
          setUploadId(data.uploadId);
        }

        // Set processing information
        setProcessingStatus("processing");
        setProcessingProgress(0);
        setProcessedFiles(0);
        setTotalFiles(data.totalFiles);
        setProcessingId(data.processingId);

        // Set additional information if available
        if (data.status) {
          setServerStatus(data.status);
        }
        if (data.message) {
          setStatusMessage(data.message);
        }

        // Show toast notification
        toast({
          title: "Processing Started",
          description: `Started processing ${data.totalFiles} files`,
        });
      } else {
        console.log(
          `UploadId mismatch in processingStart: event=${data.uploadId}, state=${uploadId}`,
        );
      }
    },

    handleProcessingProgress: (data: ProcessingProgressData) => {
      console.log(
        `Processing progress event received for uploadId: ${data.uploadId}`,
      );

      // IMPORTANT FIX: Be more lenient in accepting events
      // Accept the event if it matches our uploadId OR if we don't have an uploadId yet
      if (data.uploadId === uploadId || (data.uploadId && !uploadId)) {
        console.log("Updating processing progress state", data);

        // If our uploadId isn't set yet, set it now
        if (!uploadId && data.uploadId) {
          setUploadId(data.uploadId);
        }

        // Update file information
        if (data.currentFile !== undefined) {
          setCurrentFile(data.currentFile);
        }

        // Update counts
        if (data.processedFiles !== undefined) {
          setProcessedFiles(data.processedFiles);
        }
        if (data.totalFiles !== undefined) {
          setTotalFiles(data.totalFiles);
        }

        // Update progress
        // Use overallProgress if available, otherwise use percent
        const progress =
          data.overallProgress !== undefined
            ? data.overallProgress
            : data.percent;
        setProcessingProgress(progress);

        // Update chunk information
        if (data.currentChunk !== undefined) {
          setCurrentChunk(data.currentChunk);
        }
        if (data.totalChunks !== undefined) {
          setTotalChunks(data.totalChunks);
        }

        // Update detailed progress
        if (data.fileProgress !== undefined) {
          setFileProgress(data.fileProgress);
        }
        if (data.embeddingProgress !== undefined) {
          setEmbeddingProgress(data.embeddingProgress);
        }

        // Update status information
        if (data.status) {
          setServerStatus(data.status);
          setProcessingStatus(mapSocketStatusToUiStatus(data.status));
        }
        if (data.message) {
          setStatusMessage(data.message);
        }
      } else {
        console.log(
          `UploadId mismatch in processingProgress: event=${data.uploadId}, state=${uploadId}`,
        );
      }
    },

    handleProcessingComplete: (data: ProcessingCompleteData) => {
      console.log(
        `Processing complete event received for uploadId: ${data.uploadId}`,
      );

      // IMPORTANT FIX: Be more lenient in accepting events
      // Accept the event if it matches our uploadId OR if we don't have an uploadId yet
      if (data.uploadId === uploadId || (data.uploadId && !uploadId)) {
        console.log("Processing complete event matches our uploadId", data);

        // If our uploadId isn't set yet, set it now
        if (!uploadId && data.uploadId) {
          setUploadId(data.uploadId);
        }

        // Update processing status
        setProcessingStatus("complete");
        setProcessingProgress(100);
        setProcessedFiles(data.processedFiles);
        setTotalFiles(data.totalFiles);

        // Store the results
        setProcessingResults({
          totalChunks: data.totalChunks,
          totalCharacters: data.totalCharacters,
          results: data.results,
        });

        // Set additional information if available
        if (data.status) {
          setServerStatus(data.status);
        }
        if (data.message) {
          setStatusMessage(data.message);
        }

        // Show toast notification
        toast({
          title: "Processing Complete",
          description: `Successfully processed ${data.processedFiles} files with ${data.totalChunks} chunks`,
        });
      } else {
        console.log(
          `UploadId mismatch in processingComplete: event=${data.uploadId}, state=${uploadId}`,
        );
      }
    },

    handleProcessingError: (data: ProcessingErrorData) => {
      console.log(
        `Processing error event received for uploadId: ${data.uploadId}`,
      );

      // IMPORTANT FIX: Be more lenient in accepting events
      // Accept the event if it matches our uploadId OR if we don't have an uploadId yet
      if (data.uploadId === uploadId || (data.uploadId && !uploadId)) {
        console.log("Processing error event matches our uploadId", data);

        // If our uploadId isn't set yet, set it now
        if (!uploadId && data.uploadId) {
          setUploadId(data.uploadId);
        }

        // Update processing status
        setProcessingStatus("error");
        setProcessingError(data.error);

        // Set additional information if available
        if (data.status) {
          setServerStatus(data.status);
        }
        if (data.message) {
          setStatusMessage(data.message);
        }

        // Show toast notification
        toast({
          title: "Processing Error",
          description: data.error,
          variant: "destructive",
        });
      } else {
        console.log(
          `UploadId mismatch in processingError: event=${data.uploadId}, state=${uploadId}`,
        );
      }
    },
  });

  // Set up socket event listeners when uploadId changes
  useEffect(() => {
    if (!uploadId) {
      console.log("No uploadId, skipping socket event setup");
      return;
    }

    console.log(`Setting up socket event listeners for uploadId: ${uploadId}`);

    // Enable debug mode to track all socket events
    if (typeof socketService.enableDebugMode === "function") {
      socketService.enableDebugMode();
    }

    // Ensure we're using reference stable handlers
    const handlers = handlersRef.current;

    // Register event listeners
    socketService.onProcessingStart(handlers.handleProcessingStart);
    socketService.onProcessingProgress(handlers.handleProcessingProgress);
    socketService.onProcessingComplete(handlers.handleProcessingComplete);
    socketService.onProcessingError(handlers.handleProcessingError);

    return () => {
      console.log(
        `Cleaning up socket event listeners for uploadId: ${uploadId}`,
      );

      // Get a reference to the socket for cleanup
      const socket = socketService.getSocket();

      // Clean up listeners
      socket.off("processingStart");
      socket.off("processingProgress");
      socket.off("processingComplete");
      socket.off("processingError");
    };
  }, [uploadId]);

  // Start processing files
  const startProcessing = useCallback(
    async (uploadId: string, fileIds: string[]) => {
      if (
        processingStatus === "processing" ||
        !uploadId ||
        fileIds.length === 0
      ) {
        console.error("Cannot start processing:", {
          processingStatus,
          uploadId,
          fileIds,
        });
        return;
      }

      // Store the original client-generated uploadId
      const clientUploadId = uploadId;

      try {
        console.log("Starting processing with:", {
          uploadId: clientUploadId,
          fileIds,
        });

        // IMPORTANT FIX: Set the uploadId in the state immediately
        // This ensures that when socket events arrive, they will match the uploadId in the state
        setUploadId(clientUploadId);

        // Enable socket debug mode to see all events
        if (typeof socketService.enableDebugMode === "function") {
          socketService.enableDebugMode();
        }

        // Make sure we're in the upload room with the correct ID
        console.log(`Joining upload room for processing: ${clientUploadId}`);
        socketService.joinUploadRoom(clientUploadId);

        // Reset other state values
        setProcessingStatus("processing");
        setProcessingProgress(0);
        setProcessingError(null);
        setCurrentChunk(null);
        setTotalChunks(null);
        setEmbeddingProgress(null);
        setFileProgress(null);
        setStatusMessage(null);
        setServerStatus(null);
        setIsModalOpen(true);

        // Call the API to start processing
        console.log("Making API call to start processing");
        const response = await axios.post<{
          message: string;
          processingId: string;
          uploadId: string;
          totalFiles: number;
          files: Array<{
            fileId: string;
            filename: string;
          }>;
        }>("http://localhost:3000/api/files/process", {
          uploadId: clientUploadId,
          fileIds: fileIds,
        });

        console.log("Processing API response:", response.data);

        // Extract the server-assigned uploadId and processingId from the response
        const serverUploadId = response.data.uploadId;
        const serverProcessingId = response.data.processingId;

        // Check if the server returned a different uploadId than what we sent
        if (serverUploadId && serverUploadId !== clientUploadId) {
          console.log(`Server assigned different uploadId: ${serverUploadId}`);

          // Add mapping between server and client IDs
          socketService.mapServerToClientId(serverUploadId, clientUploadId);

          // CRITICAL CHANGE: DON'T leave the room with the client ID
          // We need to stay in both rooms to ensure we get all events
          // Just join the additional room with the server ID
          console.log(
            `Joining additional room with server ID: ${serverUploadId}`,
          );
          socketService.joinUploadRoom(serverUploadId);

          // Update state with server-assigned IDs (already set the client ID earlier)
          setUploadId(serverUploadId);
        }

        // Always set the processingId if available
        if (serverProcessingId) {
          setProcessingId(serverProcessingId);
        }
      } catch (error) {
        console.error("Error starting processing:", error);
        setProcessingStatus("error");
        setProcessingError(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        );
      }
    },
    [processingStatus, toast],
  );

  // Reset processing state
  const resetProcessing = useCallback(() => {
    setProcessingId(null);
    setUploadId(null);
    setProcessingStatus("idle");
    setProcessingProgress(0);
    setCurrentFile(null);
    setProcessedFiles(0);
    setTotalFiles(0);
    setProcessingError(null);
    setProcessingResults(null);
    setCurrentChunk(null);
    setTotalChunks(null);
    setEmbeddingProgress(null);
    setFileProgress(null);
    setStatusMessage(null);
    setServerStatus(null);
  }, []);

  const contextValue: FileProcessingContextType = {
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
    startProcessing,
    resetProcessing,
    currentChunk,
    totalChunks,
    embeddingProgress,
    fileProgress,
    statusMessage,
    serverStatus,
  };

  return (
    <FileProcessingContext.Provider value={contextValue}>
      {children}
    </FileProcessingContext.Provider>
  );
};

// Custom hook to use the FileProcessingContext
export const useFileProcessing = (): FileProcessingContextType => {
  const context = useContext(FileProcessingContext);
  if (context === undefined) {
    throw new Error(
      "useFileProcessing must be used within a FileProcessingProvider",
    );
  }
  return context;
};
