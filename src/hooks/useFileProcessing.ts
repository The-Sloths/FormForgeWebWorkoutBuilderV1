import { useContext } from "react";
import { type FileProcessingContextType, FileProcessingContext } from "@/contexts/file-processing-utils";

// Custom hook to use the FileProcessingContext
export const useFileProcessing = (): FileProcessingContextType => {
  const context = useContext(FileProcessingContext);
  if (context === undefined) {
    throw new Error(
      "useFileProcessing must be used within a FileProcessingProvider",
    );
  }
  return context;
};