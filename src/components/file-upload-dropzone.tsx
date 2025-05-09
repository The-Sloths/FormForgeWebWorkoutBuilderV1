import React, { useCallback, useState } from 'react';
import { Upload, X, File as FileIcon, Loader2 } from 'lucide-react';
import { useUpload } from '@/contexts/UploadContext';
import { cn } from '@/lib/utils';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

export function FileUploadDropzone() {
  const { files, addFiles, removeFile, isUploading } = useUpload();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = ''; // Reset the input
    }
  }, [addFiles]);

  return (
    <div className="space-y-4">
      <Card
        className={cn(
          "border-2 border-dashed border-gray-300 rounded-lg p-6",
          isDragging && "border-primary bg-primary/5",
          isUploading && "opacity-50 cursor-not-allowed"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-6 text-center">
          <Upload className="h-10 w-10 mb-4 text-gray-400" />
          <h3 className="text-lg font-medium">Drag and drop files here</h3>
          <p className="text-sm text-muted-foreground mt-2 mb-4">
            Or click to browse your files
          </p>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileChange}
            multiple
            disabled={isUploading}
            accept=".pdf,.md,.txt"
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById('file-upload')?.click()}
            disabled={isUploading}
          >
            Select Files
          </Button>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Selected Files</h4>
          <div className="border rounded-md divide-y">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3">
                <div className="flex items-center space-x-3">
                  <FileIcon className="h-5 w-5 text-blue-500" />
                  <span className="text-sm truncate max-w-[20rem]">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
