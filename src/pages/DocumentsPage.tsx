// FormForgeWebWorkoutBuilderV1/src/pages/DocumentsPage.tsx
import React, { useState } from "react";
import { FileUploadDropzone } from "@/components/file-upload-dropzone";
import {
  UploadProvider,
  useUpload,
  type FileUploadStatus,
} from "@/contexts/UploadContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2,
  Upload,
  CheckCircle,
  AlertCircle,
  X,
  FileText,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// File item component to display individual file status
function FileItem({ fileStatus }: { fileStatus: FileUploadStatus }) {
  const { removeFile } = useUpload();

  const getStatusIcon = () => {
    switch (fileStatus.status) {
      case "uploading":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <FileText className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="border rounded-md p-3 mb-2 bg-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <span className="text-sm font-medium truncate max-w-[18rem]">
            {fileStatus.file.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {(fileStatus.file.size / 1024).toFixed(1)} KB
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => removeFile(fileStatus.id)}
          disabled={fileStatus.status === "uploading"}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {(fileStatus.status === "uploading" ||
        fileStatus.status === "completed") && (
        <div className="space-y-1">
          <Progress value={fileStatus.progress} />
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>
              {fileStatus.status === "completed" ? "Completed" : "Uploading"}
            </span>
            <span>{fileStatus.progress.toFixed(0)}%</span>
          </div>
        </div>
      )}

      {fileStatus.status === "error" && (
        <div className="text-xs text-destructive mt-1">
          {fileStatus.error || "Error uploading file"}
        </div>
      )}

      {fileStatus.status === "completed" &&
        fileStatus.result !== null &&
        fileStatus.result !== undefined &&
        typeof fileStatus.result === "object" &&
        "chunks" in fileStatus.result && (
          <div className="text-xs text-muted-foreground mt-1">
            {String(fileStatus.result.chunks)} chunks created
          </div>
        )}
    </div>
  );
}

// Inner component that uses the upload context
function DocumentUploader() {
  const {
    fileStatuses,
    isUploading,
    overallProgress,
    uploadError,
    uploadFiles,
    cancelUpload,
  } = useUpload();
  const { toast } = useToast();
  const [metadata, setMetadata] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (fileStatuses.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload.",
        variant: "destructive",
      });
      return;
    }

    try {
      await uploadFiles(metadata);
    } catch (error) {
      console.error("Upload error:", error);
      // Error handling is done in the context
    }
  };

  const pendingCount = fileStatuses.filter(
    (f) => f.status === "pending",
  ).length;
  const uploadingCount = fileStatuses.filter(
    (f) => f.status === "uploading",
  ).length;
  const completedCount = fileStatuses.filter(
    (f) => f.status === "completed",
  ).length;
  const errorCount = fileStatuses.filter((f) => f.status === "error").length;

  const renderSummary = () => {
    if (fileStatuses.length === 0) return null;

    return (
      <div className="text-sm mb-4">
        <span className="font-medium">
          {fileStatuses.length} file{fileStatuses.length !== 1 && "s"} total:
        </span>{" "}
        {pendingCount > 0 && <span>{pendingCount} pending </span>}
        {uploadingCount > 0 && <span>{uploadingCount} uploading </span>}
        {completedCount > 0 && (
          <span className="text-green-600">{completedCount} completed </span>
        )}
        {errorCount > 0 && (
          <span className="text-destructive">{errorCount} failed</span>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FileUploadDropzone />

      {renderSummary()}

      {fileStatuses.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Files</h4>
          <div className="space-y-2">
            {fileStatuses.map((fileStatus) => (
              <FileItem key={fileStatus.id} fileStatus={fileStatus} />
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Processing Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="metadata">Metadata (Optional JSON)</Label>
              <Textarea
                id="metadata"
                placeholder='{"category": "technical", "source": "manual"}'
                value={metadata}
                onChange={(e) => setMetadata(e.target.value)}
                disabled={isUploading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {uploadError && (
        <div className="bg-destructive/10 p-4 rounded-md flex items-center space-x-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p>{uploadError}</p>
        </div>
      )}

      {isUploading && (
        <div className="space-y-2">
          <Progress value={overallProgress} />
          <p className="text-sm text-center text-muted-foreground">
            Overall Progress: {overallProgress.toFixed(0)}%
          </p>
        </div>
      )}

      <div className="flex space-x-3">
        <Button
          type="submit"
          disabled={
            isUploading || fileStatuses.length === 0 || pendingCount === 0
          }
          className="flex-1"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </>
          )}
        </Button>

        {isUploading && (
          <Button type="button" variant="outline" onClick={cancelUpload}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

// Wrapper component that provides the context
export default function DocumentsPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto text-center">
          <h1 className="text-3xl font-bold">FormForge</h1>
          <p className="text-xl mt-2">RAG Document Uploader</p>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <UploadProvider>
          <DocumentUploader />
        </UploadProvider>
      </main>

      <footer className="bg-primary text-primary-foreground py-6 mt-12">
        <div className="container mx-auto text-center">
          <p>&copy; 2025 FormForge</p>
        </div>
      </footer>
    </div>
  );
}
