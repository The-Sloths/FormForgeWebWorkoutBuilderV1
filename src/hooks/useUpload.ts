import { useContext } from "react";
import { UploadContext } from "@/contexts/upload-context";

// Custom hook to use the UploadContext
export const useUpload = () => {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error("useUpload must be used within an UploadProvider");
  }
  return context;
};