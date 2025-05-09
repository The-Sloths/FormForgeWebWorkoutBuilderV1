import React, { createContext, useState, useContext, ReactNode } from 'react';

interface UploadContextType {
  files: File[];
  isUploading: boolean;
  uploadProgress: number;
  uploadError: string | null;
  addFiles: (newFiles: FileList | File[]) => void;
  removeFile: (index: number) => void;
  clearFiles: () => void;
  setIsUploading: (value: boolean) => void;
  setUploadProgress: (value: number) => void;
  setUploadError: (error: string | null) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
};

export const UploadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const addFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    setFiles((prevFiles) => [...prevFiles, ...fileArray]);
    setUploadError(null);
  };

  const removeFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setFiles([]);
    setUploadProgress(0);
    setUploadError(null);
  };

  return (
    <UploadContext.Provider
      value={{
        files,
        isUploading,
        uploadProgress,
        uploadError,
        addFiles,
        removeFile,
        clearFiles,
        setIsUploading,
        setUploadProgress,
        setUploadError
      }}
    >
      {children}
    </UploadContext.Provider>
  );
};
