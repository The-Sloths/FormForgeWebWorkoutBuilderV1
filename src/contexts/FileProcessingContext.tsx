import React, {
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
import {
  type ProcessingStatus,
  type ProcessingResults,
  type FileProcessingContextType,
} from "./file-processing-utils";
import {
  mapSocketStatusToUiStatus,
  FileProcessingContext,
} from "./file-processing-utils";
import { useToast } from "@/components/ui/use-toast";

// Define the base URL for API calls, respecting VITE_API_URL
const API_BASE_URL = import.meta.env.VITE_API_URL;

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
      // IMPORTANT FIX: Be more lenient in accepting events
      // Accept the event if it matches our uploadId OR if we don't have an uploadId yet
      if (data.uploadId === uploadId || (data.uploadId && !uploadId)) {
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
      }
    },

    handleProcessingProgress: (data: ProcessingProgressData) => {
      // IMPORTANT FIX: Be more lenient in accepting events
      // Accept the event if it matches our uploadId OR if we don't have an uploadId yet
      if (data.uploadId === uploadId || (data.uploadId && !uploadId)) {
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
      }
    },

    handleProcessingComplete: (data: ProcessingCompleteData) => {
      // IMPORTANT FIX: Be more lenient in accepting events
      // Accept the event if it matches our uploadId OR if we don't have an uploadId yet
      if (data.uploadId === uploadId || (data.uploadId && !uploadId)) {
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
        const newProcessingResults = {
          totalChunks: data.totalChunks,
          totalCharacters: data.totalCharacters,
          results: data.results,
        };
        setProcessingResults(newProcessingResults);

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
      }
    },

    handleProcessingError: (data: ProcessingErrorData) => {
      // IMPORTANT FIX: Be more lenient in accepting events
      // Accept the event if it matches our uploadId OR if we don't have an uploadId yet
      if (data.uploadId === uploadId || (data.uploadId && !uploadId)) {
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
      }
    },
  });

  // Set up socket event listeners when uploadId changes
  useEffect(() => {
    if (!uploadId) {
      return;
    }

    // Enable debug mode to track all socket events
    // No longer calling enableDebugMode() here to reduce console noise in production.
    // It can be called manually from DocumentsPage or elsewhere if specific debugging is needed.\n    // if (typeof socketService.enableDebugMode === \"function\") {\n    //   socketService.enableDebugMode();\n    // }\n\n    const currentHandlers = handlersRef.current;\n\n    // Register event listeners\n    socketService.onProcessingStart(currentHandlers.handleProcessingStart);\n    socketService.onProcessingProgress(currentHandlers.handleProcessingProgress);\n    socketService.onProcessingComplete(currentHandlers.handleProcessingComplete);\n    socketService.onProcessingError(currentHandlers.handleProcessingError);\n\n    return () => {\n      console.log(\n        `Cleaning up socket event listeners for uploadId: ${uploadId}`,\n      );\n\n      // Get a reference to the socket for cleanup\n      const socket = socketService.getSocket();\n\n      // Clean up listeners\n      socket.off(\"processingStart\");\n      socket.off(\"processingProgress\");\n      socket.off(\"processingComplete\");\n      socket.off(\"processingError\");\n    };\n  }, [uploadId]);
    // It can be called manually from DocumentsPage or elsewhere if specific debugging is needed.
    // if (typeof socketService.enableDebugMode === "function") {
    //   socketService.enableDebugMode();
    // }
    const currentHandlers = handlersRef.current;

    // Register event listeners
    socketService.onProcessingStart(currentHandlers.handleProcessingStart);
    socketService.onProcessingProgress(
      currentHandlers.handleProcessingProgress,
    );
    socketService.onProcessingComplete(
      currentHandlers.handleProcessingComplete,
    );
    socketService.onProcessingError(currentHandlers.handleProcessingError);

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

      try {
        // IMPORTANT FIX: Set the uploadId in the state immediately
        // This ensures that when socket events arrive, they will match the uploadId in the state
        setUploadId(uploadId);

        // Make sure we're in the upload room with the correct ID
        socketService.joinUploadRoom(uploadId);

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
        const response = await axios.post(`${API_BASE_URL}/api/files/process`, {
          uploadId: uploadId,
          fileIds: fileIds,
        });

        // Extract the server-assigned uploadId and processingId from the response
        const serverUploadId = response.data.uploadId;
        const serverProcessingId = response.data.processingId;

        // Check if the server returned a different uploadId than what we sent
        if (serverUploadId && serverUploadId !== uploadId) {
          // Add mapping between server and client IDs
          // socketService.mapServerToClientId(serverUploadId, uploadId); // Method removed from socketService

          // CRITICAL CHANGE: DON\'T leave the room with the client ID
          // We need to stay in both rooms to ensure we get all events
          // Just join the additional room with the server ID
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
    [processingStatus],
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

  // Define the context value object inside the component
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
