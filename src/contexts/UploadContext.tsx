import React, {

  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import axios from "axios";
import {
  socketService,
  type UploadProgressData,
  type UploadCompleteData,
  type UploadErrorData,
} from "@/lib/socket";
import { useToast } from "@/components/ui/use-toast";
import { UploadContext } from "./upload-context";

// Define types for the API response file
interface UploadApiResponseFile {
  fileId: string;
  filename: string;
}

// Define types for the context
interface UploadFile {
  id: string; // Internal unique ID for the file in the UI
  file: File; // The actual file object
  uploadId: string | null; // Server-generated uploadId for socket events, initially null
  fileId: string | null; // The server-generated file ID after successful upload
  progress: number;
  status: "idle" | "uploading" | "completed" | "error";
  error?: string;
}

interface UploadContextState {
  files: UploadFile[];
  isUploading: boolean;
  overallProgress: number;
  allUploadsComplete: boolean;
}

interface UploadContextActions {
  addFiles: (newFiles: File[]) => void;
  uploadFiles: () => Promise<void>;
  removeFile: (fileId: string) => void;
  retryUpload: (fileId: string) => Promise<void>;
}

export type UploadContextType = UploadContextState & UploadContextActions;

interface UploadProviderProps {
  children: ReactNode;
}

export const UploadProvider: React.FC<UploadProviderProps> = ({ children }) => {
  const { toast } = useToast();

  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [allUploadsComplete, setAllUploadsComplete] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  // Set up socket.io event listeners
  useEffect(() => {
    const socket = socketService.getSocket();

    const handleUploadProgress = (data: UploadProgressData) => {
      // Find the file that matches this uploadId (server-generated)
      setFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.uploadId === data.uploadId && file.status !== "completed" // Ensure not to revert a completed file
            ? { ...file, progress: data.percent, status: "uploading" as const }
            : file,
        ),
      );
    };

    const handleUploadComplete = (data: UploadCompleteData) => {
      // Log if fileId is present in the data
      if (!data.fileId) {
        console.warn(
          `No fileId received in upload complete data for uploadId: ${data.uploadId}`,
        );
      }

      const responseFileId = data.fileId;

      setFiles((prevFiles) => {
        const updatedFiles = prevFiles.map((file) => {
          if (file.uploadId === data.uploadId) {
            return {
              ...file,
              progress: 100,
              status: "completed" as const,
              fileId: responseFileId, // Explicitly use the fileId from the response
            };
          }
          return file;
        });

        const completedFile = updatedFiles.find(
          (f) => f.uploadId === data.uploadId,
        );
        if (completedFile) {
          toast({
            title: "Upload Complete",
            description: `"${completedFile.file.name}" was uploaded successfully.`,
          });
        }

        return updatedFiles;
      });

      // Leave the upload room for this file
      // socketService.leaveUploadRoom(data.uploadId); // Moved to FileProcessingContext or similar
    };

    const handleUploadError = (data: UploadErrorData) => {
      setFiles((prevFiles) => {
        const updatedFiles = prevFiles.map((file) =>
          file.uploadId === data.uploadId
            ? { ...file, status: "error" as const, error: data.error }
            : file,
        );

        const errorFile = updatedFiles.find(
          (f) => f.uploadId === data.uploadId,
        );
        if (errorFile) {
          toast({
            title: "Upload Error",
            description: `"${errorFile.file.name}" failed to upload: ${data.error}`,
            variant: "destructive",
          });
        }
        return updatedFiles;
      });

      // Leave the upload room for this file
      // socketService.leaveUploadRoom(data.uploadId); // Moved to FileProcessingContext or similar
    };

    socketService.onUploadProgress(handleUploadProgress);
    socketService.onUploadComplete(handleUploadComplete);
    socketService.onUploadError(handleUploadError);

    return () => {
      // Clean up socket listeners
      socket.off("uploadProgress");
      socket.off("uploadComplete");
      socket.off("uploadError");

      // Room leaving is now handled by onUploadComplete/onUploadError for individual files
      // to prevent premature room leaving during file state updates.
    };
  }, [files, toast]); // Add toast to dependencies as it's used inside effects

  // Calculate overall progress whenever files change
  useEffect(() => {
    if (files.length === 0) {
      setOverallProgress(0);
      setAllUploadsComplete(false); // Ensure this is false if no files
      return;
    }

    const totalProgress = files.reduce((sum, file) => sum + file.progress, 0);
    const newOverallProgress = Math.round(totalProgress / files.length);
    setOverallProgress(newOverallProgress);

    // Check if all uploads are complete (status is completed or error)
    const allComplete = files.every(
      (file) => file.status === "completed" || file.status === "error",
    );

    setAllUploadsComplete(allComplete);

    if (allComplete && isUploading) {
      setIsUploading(false);
    }
  }, [files, isUploading]);

  // Add files to the list
  const addFiles = useCallback(
    (newFiles: File[]) => {
      // Validate file types (only accept PDF and Markdown)
      const validFiles = newFiles.filter((file) => {
        const isValid =
          file.type === "application/pdf" ||
          file.name.endsWith(".md") ||
          file.type === "text/markdown";

        if (!isValid) {
          toast({
            title: "Invalid File",
            description: `"${file.name}" is not a supported file type. Only PDF and Markdown files are supported.`,
            variant: "destructive",
          });
        }

        return isValid;
      });

      if (validFiles.length === 0) return;

      // Create UploadFile objects for each valid file
      const newUploadFiles = validFiles.map((file) => {
        // Generate a unique client file ID for UI management
        const clientFileId = `client-file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        return {
          id: clientFileId, // This is the client-side unique ID
          file,
          uploadId: null, // Server-generated uploadId, initially null
          fileId: null,   // Server-generated fileId, initially null
          progress: 0,
          status: "idle" as const,
        };
      });

      setFiles((prevFiles) => [...prevFiles, ...newUploadFiles]);
    },
    [toast],
  ); // Add toast to dependencies

  // Upload a single file
  const uploadFile = useCallback(
    async (clientFileId: string) => { // Parameter is the client-side unique ID
      const fileToUpload = files.find((f) => f.id === clientFileId);
      if (!fileToUpload || fileToUpload.status === "uploading" || fileToUpload.status === "completed") {
        // Optionally keep a log for this case if it's important for operational monitoring
        // console.log("UploadFile: File not found, already uploading, or completed:", clientFileId, fileToUpload?.status);
        return;
      }

      // Update file status to uploading
      setFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.id === clientFileId
            ? {
                ...file,
                status: "uploading" as const,
                progress: 0,
                error: undefined,
              }
            : file,
        ),
      );

      try {
        // console.log(
        //   `Starting upload for client file ID ${clientFileId} (${fileToUpload.file.name})`,
        // );

        // Create FormData for the upload
        const formData = new FormData();
        formData.append("file", fileToUpload.file);

        // Upload the file using axios
        const response = await axios.post<{
          message: string;
          filename: string;
          fileId: string; // Server-generated fileId
          uploadId: string; // Server-generated uploadId for this upload session
          status: string;
          files: UploadApiResponseFile[];
        }>(
          `${API_URL}/api/files/upload`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
            // Note: onUploadProgress via axios is for the HTTP request itself.
            // Socket events will provide more granular progress from the server's processing.
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total,
                );
                // Optionally update a temporary progress for the HTTP part
                // but rely on socket for the server's true progress.
                setFiles((prevFiles) =>
                  prevFiles.map((f) =>
                    f.id === clientFileId && f.status === "uploading"
                      ? { ...f, progress: percentCompleted > 95 ? 95 : percentCompleted } // Cap at 95 to show server processing
                      : f,
                  ),
                );
              }
            },
          },
        );

        const serverGeneratedUploadId = response.data.uploadId;
        const serverGeneratedFileId = response.data.fileId;

        if (serverGeneratedUploadId && serverGeneratedFileId) {
          // Update the file in state with server-generated IDs
          setFiles((prevFiles) =>
            prevFiles.map((file) =>
              file.id === clientFileId
                ? {
                    ...file,
                    uploadId: serverGeneratedUploadId, // Store server's uploadId
                    fileId: serverGeneratedFileId,   // Store server's fileId
                    // Status remains 'uploading'; 'completed' will be set by socket event
                  }
                : file,
            ),
          );

          // Join the socket.io room for this specific upload using server's uploadId
          socketService.joinUploadRoom(serverGeneratedUploadId);
        } else {
          console.warn("Server response missing uploadId or fileId", response.data);
          throw new Error("Invalid server response: Missing uploadId or fileId.");
        }
      } catch (error) {
        console.error(`Upload error for clientFileId ${clientFileId}:`, error);

        setFiles((prevFiles) =>
          prevFiles.map((file) =>
            file.id === clientFileId
              ? {
                  ...file,
                  status: "error" as const,
                  error:
                    error instanceof Error
                      ? error.message
                      : "Unknown upload error",
                }
              : file,
          ),
        );

        toast({
          title: "Upload Failed",
          description: `Failed to upload "${fileToUpload.file.name}". ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          variant: "destructive",
        });

        // Leave the socket room on error if an uploadId was associated with it
        // (though at this stage, if HTTP fails, room joining might not have happened)
        if (fileToUpload.uploadId) {
          socketService.leaveUploadRoom(fileToUpload.uploadId);
        }
      }
    },
    [files, toast, API_URL],
  ); // Add files, toast, and API_URL to dependencies

  // Upload all files with idle or error status
  const uploadFiles = useCallback(async () => {
    if (files.length === 0 || isUploading) return;

    setIsUploading(true);
    setAllUploadsComplete(false);

    // Find files that need to be uploaded (idle or error status)
    const filesToUpload = files.filter(
      (file) => file.status === "idle" || file.status === "error",
    );

    if (filesToUpload.length === 0) {
      setIsUploading(false);
      return;
    }

    // Upload each file sequentially for simplicity, could be parallelized
    for (const file of filesToUpload) {
      await uploadFile(file.id);
    }
    // isUploading state is set to false in the files useEffect when allComplete becomes true
  }, [files, isUploading, uploadFile]); // Add files, isUploading, and uploadFile to dependencies

  // Remove a file from the list
  const removeFile = useCallback((fileId: string) => {
    setFiles((prevFiles) => {
      const fileToRemove = prevFiles.find((f) => f.id === fileId);

      if (fileToRemove && fileToRemove.uploadId && (fileToRemove.status === "uploading" || fileToRemove.status === "error")) {
        // Leave the socket room if the file was attempting/failed an upload
        socketService.leaveUploadRoom(fileToRemove.uploadId);
      }
      return prevFiles.filter((file) => file.id !== fileId);
    });
  }, []);

  // Retry a failed upload by calling uploadFile with the client-side ID
  const retryUpload = useCallback(
    async (clientFileId: string) => {
      // Reset progress and error for the specific file before retrying
      setFiles(prev => prev.map(f => f.id === clientFileId ? {...f, progress: 0, error: undefined, status: 'idle', uploadId: null, fileId: null} : f));
      // Then call uploadFile for this specific clientFileId
      await uploadFile(clientFileId);
    },
    [uploadFile],
  );

  const contextValue = {
    files,
    isUploading,
    overallProgress,
    allUploadsComplete,
    addFiles,
    uploadFiles,
    removeFile,
    retryUpload,
  };

  return (
    <UploadContext.Provider value={contextValue}>
      {children}
    </UploadContext.Provider>
  );
};


