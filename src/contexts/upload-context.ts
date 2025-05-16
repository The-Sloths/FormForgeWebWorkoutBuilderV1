import { createContext } from "react";
import { type UploadContextType } from "./UploadContext";

export const UploadContext = createContext<UploadContextType | undefined>(undefined);