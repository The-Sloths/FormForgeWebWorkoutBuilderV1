import React, {
  createContext,
  useContext,
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

// Define types for the context
interface UploadFile {
  id: string; // Internal unique ID for the file in the UI
  file: File; // The actual file object
  uploadId: string; // The upload session ID
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

type UploadContextType = UploadContextState & UploadContextActions;

const UploadContext = createContext<UploadContextType | undefined>(undefined);

interface UploadProviderProps {
  children: ReactNode;
}

export const UploadProvider: React.FC<UploadProviderProps> = ({ children }) => {
  const { toast } = useToast();

  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [allUploadsComplete, setAllUploadsComplete] = useState(false);

  // Set up socket.io event listeners
  useEffect(() => {
    const socket = socketService.getSocket();

    const handleUploadProgress = (data: UploadProgressData) => {
      // Find the file that matches this uploadId
      setFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.uploadId === data.uploadId
            ? { ...file, progress: data.percent, status: "uploading" as const }
            : file,
        ),
      );
    };

    const handleUploadComplete = (data: UploadCompleteData) => {
      console.log("Upload complete data received:", data);

      // Log if fileId is present in the data
      if (data.fileId) {
        console.log(`Received fileId: ${data.fileId}`);
      } else {
        console.warn(
          `No fileId received in upload complete data for uploadId: ${data.uploadId}`,
        );
      }

      // Store the direct response to help with debugging
      const responseFileId = data.fileId;

      setFiles((prevFiles) => {
        const updatedFiles = prevFiles.map((file) => {
          if (file.uploadId === data.uploadId) {
            console.log("Updating file with response:", {
              originalId: file.id,
              uploadId: file.uploadId,
              newFileId: responseFileId,
            });

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
          console.log(`Updated file object:`, completedFile);
          toast({
            title: "Upload Complete",
            description: `"${completedFile.file.name}" was uploaded successfully.`,
          });
        }

        return updatedFiles;
      });

      // Leave the upload room for this file
      socketService.leaveUploadRoom(data.uploadId);
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
      socketService.leaveUploadRoom(data.uploadId);
    };

    socketService.onUploadProgress(handleUploadProgress);
    socketService.onUploadComplete(handleUploadComplete);
    socketService.onUploadError(handleUploadError);

    return () => {
      // Clean up socket listeners
      socket.off("uploadProgress");
      socket.off("uploadComplete");
      socket.off("uploadError");

      // Leave any active upload rooms
      files.forEach((file) => {
        if (file.status === "uploading") {
          socketService.leaveUploadRoom(file.uploadId);
        }
      });
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
        // Generate a unique client file ID
        const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        // Generate a UUID for the upload ID using the socket service
        const uploadId = socketService.generateUploadId();

        return {
          id: fileId,
          file,
          uploadId,
          fileId: null, // Initialize as null, will be populated after successful upload
          progress: 0,
          status: "idle" as const,
        };
      });

      console.log("Created new upload files with UUIDs:", newUploadFiles);
      setFiles((prevFiles) => [...prevFiles, ...newUploadFiles]);
    },
    [toast],
  ); // Add toast to dependencies

  // Upload a single file
  const uploadFile = useCallback(
    async (fileId: string) => {
      const fileToUpload = files.find((f) => f.id === fileId);
      if (!fileToUpload) return;

      // Update file status to uploading
      setFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.id === fileId
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
        console.log(
          `Starting upload for file ${fileToUpload.id} with uploadId ${fileToUpload.uploadId}`,
        );

        // Join the socket.io room for this upload
        socketService.joinUploadRoom(fileToUpload.uploadId);

        // Create FormData for the upload
        const formData = new FormData();
        formData.append("file", fileToUpload.file);

        // Upload the file using axios and CAPTURE THE RESPONSE
        const response = await axios.post(
          `http://localhost:3000/api/files/upload`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              "X-Upload-ID": fileToUpload.uploadId,
            },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total,
                );

                // Update progress via axios (fallback if socket events are delayed)
                setFiles((prevFiles) =>
                  prevFiles.map((file) =>
                    file.id === fileId
                      ? { ...file, progress: percentCompleted }
                      : file,
                  ),
                );
              }
            },
          },
        );

        // Get fileId from the response data
        const serverFileId = response.data.fileId;
        const serverUploadId = response.data.uploadId;

        console.log("Server response:", response.data);
        console.log("Server fileId:", serverFileId);

        // If server returned a different uploadId, update our mapping
        if (serverUploadId && serverUploadId !== fileToUpload.uploadId) {
          console.log(
            `Server returned different uploadId: ${serverUploadId}, mapping to client ID: ${fileToUpload.uploadId}`,
          );
          socketService.mapServerToClientId(
            serverUploadId,
            fileToUpload.uploadId,
          );
        }

        if (serverFileId) {
          // Immediately update the file with the server fileId
          setFiles((prevFiles) =>
            prevFiles.map((file) =>
              file.id === fileId
                ? {
                    ...file,
                    fileId: serverFileId,
                    progress: 100,
                    status: "completed" as const,
                  }
                : file,
            ),
          );

          console.log(
            `Updated file ${fileId} with server fileId: ${serverFileId}`,
          );
        } else {
          console.warn("No fileId received in upload response");
        }
      } catch (error) {
        console.error("Upload error:", error);

        // Set error status if socket.io didn't catch it
        setFiles((prevFiles) =>
          prevFiles.map((file) =>
            file.id === fileId
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

        // Leave the socket room on error as well
        socketService.leaveUploadRoom(fileToUpload.uploadId);
      }
    },
    [files, toast],
  ); // Add files and toast to dependencies

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

      if (fileToRemove && fileToRemove.status === "uploading") {
        // Leave the socket room if the file is uploading
        socketService.leaveUploadRoom(fileToRemove.uploadId);
      }
      return prevFiles.filter((file) => file.id !== fileId);
    });
  }, []);

  // Retry a failed upload
  const retryUpload = useCallback(
    async (fileId: string) => {
      await uploadFile(fileId);
    },
    [uploadFile], // Add uploadFile to dependencies
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

// Custom hook to use the UploadContext
export const useUpload = () => {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error("useUpload must be used within an UploadProvider");
  }
  return context;
};
