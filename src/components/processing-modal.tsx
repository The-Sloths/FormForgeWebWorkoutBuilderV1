import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  RefreshCw,
  FileText,
  Info,
  Layers,
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
import { useFileProcessing } from "@/contexts/FileProcessingContext";

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
        return "Processing Complete";
      case "error":
        return "Processing Error";
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
        return `All ${processedFiles} files have been processed successfully.`;
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

  const handleComplete = () => {
    setIsModalOpen(false);
    resetProcessing();
    // Show alert to indicate we should redirect to plans
    alert("Now we should redirect to plans");
  };

  // Function to render additional progress bars based on available data
  const renderDetailedProgress = () => {
    return (
      <div className="space-y-3 mt-4">
        {/* File progress if available */}
        {fileProgress !== null && (
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-medium">Current File</span>
              <span className="text-muted-foreground">{fileProgress}%</span>
            </div>
            <Progress value={fileProgress} className="h-1" />
          </div>
        )}

        {/* Embedding progress if available */}
        {embeddingProgress !== null && (
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-medium">Embeddings</span>
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
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {processingProgress}%
              </span>
            </div>
            <Progress value={processingProgress} className="h-2" />

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

            {/* Show chunk information if available */}
            {currentChunk !== null && totalChunks !== null && (
              <div className="flex items-center mt-1 text-xs text-muted-foreground">
                <Layers className="h-3 w-3 mr-1" />
                <span>
                  Chunk {currentChunk} of {totalChunks}
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
                Total characters processed: {processingResults.totalCharacters}
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
          <div className="mt-1 pl-4 border-l-2 border-muted">
            <p>Upload ID: {uploadId || "None"}</p>
            <p>Processing ID: {processingId || "None"}</p>
            <p>Status: {processingStatus}</p>
            <p>Server Status: {serverStatus || "None"}</p>
            <p>Last Update: {lastUpdate}</p>
          </div>
        </details>

        <DialogFooter className="mt-4">
          {processingStatus === "complete" ? (
            <Button onClick={handleComplete} className="w-full">
              OK
            </Button>
          ) : processingStatus === "error" ? (
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          ) : (
            <Button disabled className="w-full">
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProcessingModal;
