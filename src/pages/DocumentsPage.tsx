import React, { useState } from "react";
import { FileUploadDropzone } from "@/components/file-upload-dropzone";
import { UploadProvider, useUpload } from "@/contexts/UploadContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Inner component that uses the upload context
function DocumentUploader() {
  const {
    files,
    isUploading,
    uploadProgress,
    uploadError,
    setIsUploading,
    setUploadProgress,
    setUploadError,
    clearFiles,
  } = useUpload();
  const { toast } = useToast();
  const [metadata, setMetadata] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        // Add options if provided
        if (metadata) {
          formData.append("options", metadata);
        }

        // Calculate progress for current file
        const fileProgress = (i / files.length) * 100;
        setUploadProgress(fileProgress);

        // Upload the file
        const response = await fetch("http://localhost:3000/api/files/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to upload file");
        }

        // Update progress
        setUploadProgress(((i + 1) / files.length) * 100);
      }

      // All uploads completed successfully
      toast({
        title: "Upload Successful",
        description: `${files.length} file(s) uploaded successfully.`,
      });

      clearFiles();
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
      toast({
        title: "Upload Failed",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FileUploadDropzone />

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
          <Progress value={uploadProgress} />
          <p className="text-sm text-center text-muted-foreground">
            Uploading {uploadProgress.toFixed(0)}%
          </p>
        </div>
      )}

      <Button
        type="submit"
        disabled={isUploading || files.length === 0}
        className="w-full"
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
