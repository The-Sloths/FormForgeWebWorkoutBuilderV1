import React, {
  createContext,
  useState,
  useContext,
  type ReactNode,
  useEffect,
} from "react";
import {
  socketService,
  type UploadProgressData,
  type UploadCompleteData,
  type UploadErrorData,
} from "@/lib/socket";

export interface FileUploadStatus {
  id: string;
  file: File;
  uploadId: string;
  status: "pending" | "uploading" | "completed" | "error";
  progress: number;
  error?: string;
  result?: unknown;
}

interface UploadContextType {
  fileStatuses: FileUploadStatus[];
  isUploading: boolean;
  overallProgress: number;
  uploadError: string | null;
  addFiles: (newFiles: FileList | File[]) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  uploadFiles: (metadata?: string) => Promise<void>;
  cancelUpload: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error("useUpload must be used within an UploadProvider");
  }
  return context;
};

export const UploadProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [fileStatuses, setFileStatuses] = useState<FileUploadStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [aborter, setAborter] = useState<AbortController | null>(null);

  // Calculate overall progress based on individual file progress
  const overallProgress =
    fileStatuses.length > 0
      ? fileStatuses.reduce((sum, file) => sum + file.progress, 0) /
        fileStatuses.length
      : 0;

  // Initialize socket handlers
  useEffect(() => {
    const socket = socketService.getSocket();

    // Set up event listeners
    socketService.onUploadProgress(handleUploadProgress);
    socketService.onUploadComplete(handleUploadComplete);
    socketService.onUploadError(handleUploadError);

    return () => {
      // Clean up socket listeners
      socket.off("uploadProgress");
      socket.off("uploadComplete");
      socket.off("uploadError");

      // Ensure we leave any active upload rooms
      fileStatuses.forEach((file) => {
        if (file.status === "uploading") {
          socketService.leaveUploadRoom(file.uploadId);
        }
      });
    };
  }, []); // Only run on component mount/unmount, not on every fileStatuses change

  // Handle upload progress events
  const handleUploadProgress = (data: UploadProgressData) => {
    console.log(`Progress event for ${data.uploadId}: ${data.percent}%`);
    setFileStatuses((prevStatuses) =>
      prevStatuses.map((fileStatus) =>
        fileStatus.uploadId === data.uploadId
          ? { ...fileStatus, progress: data.percent, status: "uploading" }
          : fileStatus,
      ),
    );
  };

  // Handle upload completion events
  const handleUploadComplete = (data: UploadCompleteData) => {
    console.log(`Completion event for ${data.uploadId}`);
    setFileStatuses((prevStatuses) =>
      prevStatuses.map((fileStatus) =>
        fileStatus.uploadId === data.uploadId
          ? {
              ...fileStatus,
              progress: 100,
              status: "completed",
              result: data,
            }
          : fileStatus,
      ),
    );

    // Leave the upload room for this file
    socketService.leaveUploadRoom(data.uploadId);

    // Check if all uploads are completed
    checkAllUploadsCompleted();
  };

  // Handle upload error events
  const handleUploadError = (data: UploadErrorData) => {
    console.log(`Error event for ${data.uploadId}: ${data.error}`);
    setFileStatuses((prevStatuses) =>
      prevStatuses.map((fileStatus) =>
        fileStatus.uploadId === data.uploadId
          ? {
              ...fileStatus,
              status: "error",
              error: data.error,
            }
          : fileStatus,
      ),
    );

    // Leave the upload room for this file
    socketService.leaveUploadRoom(data.uploadId);

    // Check if all uploads are completed
    checkAllUploadsCompleted();
  };

  // Check if all uploads are completed or have errors
  const checkAllUploadsCompleted = () => {
    const allCompleted = fileStatuses.every(
      (file) => file.status === "completed" || file.status === "error",
    );

    if (allCompleted && isUploading) {
      setIsUploading(false);
    }
  };

  // Add files to the upload queue
  const addFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const newFileStatuses = fileArray.map((file) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      file,
      uploadId: socketService.generateUploadId(),
      status: "pending" as const,
      progress: 0,
    }));

    setFileStatuses((prevStatuses) => [...prevStatuses, ...newFileStatuses]);
    setUploadError(null);
  };

  // Remove a file from the queue
  const removeFile = (id: string) => {
    setFileStatuses((prevStatuses) => {
      const fileToRemove = prevStatuses.find((f) => f.id === id);

      // If the file is uploading, leave its socket room
      if (fileToRemove && fileToRemove.status === "uploading") {
        socketService.leaveUploadRoom(fileToRemove.uploadId);
      }

      return prevStatuses.filter((f) => f.id !== id);
    });
  };

  // Clear all files
  const clearFiles = () => {
    // Leave all socket rooms first
    fileStatuses.forEach((file) => {
      if (file.status === "uploading") {
        socketService.leaveUploadRoom(file.uploadId);
      }
    });

    setFileStatuses([]);
    setUploadError(null);
  };

  // Upload all pending files
  const uploadFiles = async (metadata?: string) => {
    if (fileStatuses.length === 0 || isUploading) {
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    // Create abort controller for cancellation
    const controller = new AbortController();
    setAborter(controller);

    // Mark all pending files as uploading with 0 progress
    setFileStatuses((prevStatuses) =>
      prevStatuses.map((file) =>
        file.status === "pending"
          ? { ...file, status: "uploading", progress: 0 }
          : file,
      ),
    );

    // Find all pending files to upload
    const filesToUpload = fileStatuses.filter(
      (file) => file.status === "pending",
    );

    try {
      // Process each file
      for (const fileStatus of filesToUpload) {
        // Join the WebSocket room for this upload
        socketService.joinUploadRoom(fileStatus.uploadId);

        const formData = new FormData();
        formData.append("file", fileStatus.file);
        formData.append("uploadId", fileStatus.uploadId);

        // Add metadata if provided
        if (metadata) {
          formData.append("metadata", metadata);
        }

        // Upload the file using XHR to handle progress and cancellation
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          // Add upload progress event handler
          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const percentComplete = Math.round(
                (event.loaded / event.total) * 100,
              );
              // Update file progress locally (not waiting for WebSocket)
              setFileStatuses((prevStatuses) =>
                prevStatuses.map((file) =>
                  file.uploadId === fileStatus.uploadId
                    ? { ...file, progress: percentComplete }
                    : file,
                ),
              );
              console.log(
                `XHR progress for ${fileStatus.uploadId}: ${percentComplete}%`,
              );
            }
          });

          xhr.open("POST", "http://localhost:3000/api/files/upload");

          // Set up abort handling
          controller.signal.addEventListener("abort", () => {
            xhr.abort();
            reject(new Error("Upload cancelled"));
          });

          xhr.onerror = () => {
            console.error(`XHR error for ${fileStatus.uploadId}`);
            reject(new Error("Network error occurred during upload"));
          };

          xhr.onload = () => {
            console.log(
              `XHR completed for ${fileStatus.uploadId} with status ${xhr.status}`,
            );
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              try {
                const errorData = JSON.parse(xhr.responseText);
                reject(new Error(errorData.message || "Upload failed"));
              } catch {
                reject(new Error(`Upload failed with status: ${xhr.status}`));
              }
            }
          };

          xhr.send(formData);
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    } finally {
      setAborter(null);
    }
  };

  // Cancel ongoing uploads
  const cancelUpload = () => {
    if (aborter) {
      aborter.abort();
    }

    // Leave all active upload rooms
    fileStatuses.forEach((file) => {
      if (file.status === "uploading") {
        socketService.leaveUploadRoom(file.uploadId);
      }
    });

    // Mark uploading files as errored
    setFileStatuses((prevStatuses) =>
      prevStatuses.map((file) =>
        file.status === "uploading"
          ? { ...file, status: "error", error: "Upload cancelled" }
          : file,
      ),
    );

    setIsUploading(false);
  };

  return (
    <UploadContext.Provider
      value={{
        fileStatuses,
        isUploading,
        overallProgress,
        uploadError,
        addFiles,
        removeFile,
        clearFiles,
        uploadFiles,
        cancelUpload,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
};
