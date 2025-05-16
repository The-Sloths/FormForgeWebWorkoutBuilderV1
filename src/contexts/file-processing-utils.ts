import { createContext } from "react";
import {
  type ProcessingStatus as SocketProcessingStatus,
} from "@/lib/socket";

// Type for UI processing status (slightly different from socket status)
export type ProcessingStatus = "idle" | "processing" | "complete" | "error";

// Define interfaces for the processing results
export interface ProcessingFileResult {
  fileId: string;
  filename: string;
  chunks: number;
  totalCharacters: number;
}

export interface ProcessingResults {
  totalChunks: number;
  totalCharacters: number;
  results: ProcessingFileResult[];
}

// Map socket status to UI status for display
export const mapSocketStatusToUiStatus = (
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

export interface FileProcessingContextState {
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

export interface FileProcessingContextActions {
  startProcessing: (uploadId: string, fileIds: string[]) => Promise<void>;
  setIsModalOpen: (open: boolean) => void;
  resetProcessing: () => void;
}

export type FileProcessingContextType = FileProcessingContextState &
  FileProcessingContextActions;

export const FileProcessingContext = createContext<
  FileProcessingContextType | undefined
>(undefined);