import React, { useRef, useState } from "react";
import {
  Upload,
  X,
  File,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

// Import the custom hooks and providers
import { UploadProvider } from "@/contexts/UploadContext";
import { useUpload } from "@/hooks/useUpload";
import { useFileProcessing } from "@/hooks/useFileProcessing";
import { FileProcessingProvider } from "@/contexts/FileProcessingContext";
import ProcessingModal from "@/components/processing-modal";

// Define UploadFile interface
interface UploadFile {
  id: string;
  file: File;
  uploadId: string;
  fileId?: string | null; // Add fileId property to match UploadContext
  progress: number;
  status: "idle" | "uploading" | "completed" | "error";
  error?: string;
}

interface DocumentUploadProps {
  onGeneratePlans?: () => void;
}

// Wrapper component to provide the contexts
const DocumentUploadWithProvider: React.FC<DocumentUploadProps> = ({
  onGeneratePlans,
}) => {
  return (
    <UploadProvider>
      <FileProcessingProvider>
        <DocumentUploadContent onGeneratePlans={onGeneratePlans} />
        <ProcessingModal />
      </FileProcessingProvider>
    </UploadProvider>
  );
};

// The main component content, consuming the context
const DocumentUploadContent: React.FC<DocumentUploadProps> = () => {
  // Use the custom hook to access context state and actions
  const { toast } = useToast();
  const {
    files,
    isUploading,
    overallProgress,
    allUploadsComplete,
    addFiles,
    uploadFiles,
    removeFile,
    retryUpload,
  } = useUpload();

  const { startProcessing } = useFileProcessing();

  const [isDragging, setIsDragging] = useState(false);

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const dropAreaRef = useRef<HTMLDivElement>(null); // Keep ref here

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Only set isDragging to false if we're leaving the drop area entirely
    if (
      dropAreaRef.current &&
      !dropAreaRef.current.contains(e.relatedTarget as Node)
    ) {
      setIsDragging(false);
    }
  };

  // Handle file drop - use addFiles from context
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles); // Use addFiles from context
  };

  const fileInputRef = useRef<HTMLInputElement>(null); // Keep ref here

  // Handle file input change - use addFiles from context
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles); // Use addFiles from context

      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type === "application/pdf") {
      return <File className="h-5 w-5 text-red-500" />;
    }
    return <File className="h-5 w-5 text-blue-500" />;
  };

  // Get status icon (can remain here as it's presentation logic)
  const getStatusIcon = (status: UploadFile["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "uploading":
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  // Handle generate plans button click
  const handleGeneratePlans = async () => {
    // Get all completed files
    const completedFiles = files.filter((file) => file.status === "completed");

    if (completedFiles.length === 0) {
      console.error("No successfully uploaded files to process");
      return;
    }

    // Get the uploadId (should be the same for all files in a session)
    const uploadId = completedFiles[0].uploadId;

    // Extract server fileIds from completedFiles
    const fileIds = completedFiles
      .filter(
        (file): file is UploadFile & { fileId: string } => file.fileId != null,
      ) // Filter out files without a valid fileId
      .map((file) => file.fileId); // Now map only the fileId, which is guaranteed to be string here

    console.log("Files to process:", {
      totalFiles: completedFiles.length,
      uploadId,
      fileIds,
    });

    if (fileIds.length === 0) {
      console.error("No valid file IDs available for processing");
      toast({
        title: "Processing Error",
        description:
          "File IDs not available. Please try uploading the files again.",
        variant: "destructive",
      });
      return;
    }

    // Make sure we're calling startProcessing with all file IDs
    if (uploadId) {
      await startProcessing(uploadId, fileIds);
    } else {
      console.error("Upload ID is missing.");
      toast({
        title: "Processing Error",
        description:
          "Upload ID not available. Please try uploading the files again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Document Upload</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Drag and drop area */}
        <div
          ref={dropAreaRef}
          className={cn(
            "border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center cursor-pointer transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50",
          )}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {isDragging ? "Drop files here" : "Drag & Drop Files"}
          </h3>
          <p className="text-sm text-muted-foreground mb-2">
            Or click to browse files
          </p>
          <p className="text-xs text-muted-foreground">
            Supported file types: PDF, Markdown
          </p>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept=".pdf,.md,application/pdf,text/markdown"
            onChange={handleFileInputChange}
            disabled={isUploading}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Files to Upload</h3>
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center p-2 border rounded-md"
                >
                  <div className="flex items-center mr-2">
                    {getFileIcon(file.file)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium truncate">
                        {file.file.name}
                      </p>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(file.status)}
                        <span className="text-xs text-muted-foreground">
                          {Math.round(file.file.size / 1024)} KB
                        </span>
                      </div>
                    </div>
                    <Progress value={file.progress} className="h-1 mt-1" />
                    {file.error && (
                      <p className="text-xs text-red-500 mt-1">{file.error}</p>
                    )}
                  </div>
                  <div className="ml-2 flex space-x-1">
                    {file.status === "error" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          retryUpload(file.id); // Use retryUpload from context
                        }}
                        disabled={isUploading}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.id); // Use removeFile from context
                      }}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overall progress */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Overall Progress</h3>
              <span className="text-sm text-muted-foreground">
                {overallProgress}%
              </span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        {!allUploadsComplete ? (
          <Button
            onClick={uploadFiles} // Use uploadFiles from context
            disabled={isUploading || files.length === 0}
            className="w-full"
          >
            {isUploading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </>
            )}
          </Button>
        ) : (
          <Button onClick={handleGeneratePlans} className="w-full">
            Generate Plans
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

// Export the wrapper component
export default DocumentUploadWithProvider;
