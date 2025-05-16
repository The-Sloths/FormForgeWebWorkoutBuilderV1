import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

// Ensure VITE_API_URL is used, with a fallback for development if not set
const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Types based on the AsyncAPI specification
export interface UploadProgressData {
  uploadId: string;
  bytesReceived: number;
  bytesExpected: number;
  percent: number;
  completed: boolean;
}

export interface UploadCompleteData {
  uploadId: string;
  message: string;
  filename: string;
  fileId: string;
  status: string;
  completed: boolean;
  bytesReceived: number;
  bytesExpected: number;
  percent: number;
}

export interface UploadErrorData {
  uploadId: string;
  error: string;
}

// Updated according to AsyncAPI spec
export type ProcessingStatus =
  | "analyzing"
  | "processing"
  | "embedding"
  | "file_complete"
  | "complete"
  | "error"
  | "partial_complete"
  | "partial_error";

export interface ProcessingStartData {
  uploadId: string;
  processingId: string;
  totalFiles: number;
  status?: ProcessingStatus;
  message?: string;
  files: Array<{
    fileId: string;
    filename: string;
  }>;
}

// Updated according to AsyncAPI spec
export interface ProcessingProgressData {
  uploadId: string;
  processingId: string;
  currentFile: string | null;
  fileId: string | null;
  fileIndex?: number;
  processedFiles: number;
  totalFiles: number;
  percent: number;
  fileProgress?: number;
  overallProgress?: number;
  embeddingProgress?: number;
  currentChunk?: number;
  totalChunks?: number;
  processedChunks?: number;
  chunkSize?: number;
  status?: ProcessingStatus;
  message?: string;
}

// Updated according to AsyncAPI spec
export interface ProcessingCompleteData {
  uploadId: string;
  processingId: string;
  processedFiles: number;
  totalFiles: number;
  processedChunks?: number;
  totalChunks: number;
  totalCharacters: number;
  overallProgress?: number;
  status?: "complete" | "partial_complete" | "error";
  message?: string;
  results: Array<{
    fileId: string;
    filename: string;
    chunks: number;
    totalCharacters: number;
  }>;
}

// Updated according to AsyncAPI spec
export interface ProcessingErrorData {
  uploadId: string;
  processingId: string;
  fileId: string | null;
  filename: string | null;
  fileIndex?: number | null;
  processedFiles?: number | null;
  totalFiles?: number | null;
  error: string;
  status?: "error" | "partial_error";
  message?: string;
}

// Map to track relationship between client IDs and server IDs
class SocketService {
  private socket: Socket | null = null;
  private initialized = false;
  private isConnected = false; // Add missing property

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  // Track active rooms to avoid duplicate joins/leaves
  private activeRooms = new Set<string>();
  // Map to track client-to-server ID relationships
  private idMappings = new Map<string, string>(); // Add missing property

  initialize(): Socket {
    if (!this.initialized) {
      // Connect with reconnection options
      this.socket = io(SOCKET_URL, {
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      // Add connection event handlers
      this.socket.on("connect", () => {
        this.isConnected = true;
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
      });

      this.socket.on("disconnect", () => {
        // console.log(`Socket.IO disconnected: ${reason}`); // Can be noisy
        this.isConnected = false;
        this.activeRooms.clear();
      });

      this.socket.on("connect_error", (error: Error) => {
        console.error("Socket.IO connection error:", error);
        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error(
            `Max reconnection attempts (${this.maxReconnectAttempts}) reached.`,
          );
        }
      });

      this.socket.io.on("reconnect", () => {
        this.isConnected = true;
      });

      this.socket.io.on("reconnect_attempt", () => {
        // console.log(`Socket.IO reconnection attempt`); // Can be noisy
      });

      this.socket.io.on("reconnect_error", (error: Error) => {
        console.error("Socket.IO reconnection error:", error);
      });

      this.socket.io.on("reconnect_failed", () => {
        console.error("Socket.IO failed to reconnect");
      });

      this.initialized = true;
    }

    return this.socket!;
  }

  getSocket(): Socket {
    if (!this.initialized) {
      return this.initialize();
    }
    return this.socket!;
  }

  joinUploadRoom(uploadId: string): void {
    const socket = this.getSocket();

    if (!this.isConnected) {
      console.warn(`SocketService: Cannot join room for ${uploadId}, socket not connected.`);
      return;
    }

    if (this.activeRooms.has(uploadId)) {
      // console.log(`SocketService: Already in room: ${uploadId}`);
      return;
    }
    this.activeRooms.add(uploadId);
    socket.emit("joinUploadRoom", uploadId);
  }

  leaveUploadRoom(uploadId: string): void {
    const socket = this.getSocket();

    if (!this.isConnected) {
      // console.warn(`SocketService: Cannot leave room for ${uploadId}, socket not connected.`);
      return;
    }

    if (!this.activeRooms.has(uploadId)) {
      // console.log(`SocketService: Not in room: ${uploadId}, no need to leave.`);
      return;
    }
    this.activeRooms.delete(uploadId);
    socket.emit("leaveUploadRoom", uploadId);
  }

  onUploadProgress(callback: (data: UploadProgressData) => void): void {
    const socket = this.getSocket();
    // Remove any existing listeners for this event to prevent duplicates
    socket.off("uploadProgress");
    socket.on("uploadProgress", callback);
  }

  onUploadComplete(callback: (data: UploadCompleteData) => void): void {
    const socket = this.getSocket();
    socket.off("uploadComplete");
    socket.on("uploadComplete", callback);
  }

  onUploadError(callback: (data: UploadErrorData) => void): void {
    const socket = this.getSocket();
    socket.off("uploadError");
    socket.on("uploadError", callback);
  }

  // Processing files
  onProcessingStart(callback: (data: ProcessingStartData) => void): void {
    const socket = this.getSocket();
    socket.off("processingStart");
    socket.on("processingStart", callback);
  }

  onProcessingProgress(callback: (data: ProcessingProgressData) => void): void {
    const socket = this.getSocket();
    socket.off("processingProgress");
    socket.on("processingProgress", callback);
  }

  onProcessingComplete(callback: (data: ProcessingCompleteData) => void): void {
    const socket = this.getSocket();
    socket.off("processingComplete");
    socket.on("processingComplete", callback);
  }

  onProcessingError(callback: (data: ProcessingErrorData) => void): void {
    const socket = this.getSocket();
    socket.off("processingError");
    socket.on("processingError", callback);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.initialized = false;
      this.isConnected = false;
      this.activeRooms.clear();
      this.idMappings.clear();
      // console.log("Socket disconnected"); // Can be noisy
    }
  }

  // Generate a unique upload ID that matches UUID v4 format
  generateUploadId(): string {
    // Using UUID format compatible with the backend
    return uuidv4();
  }

  // enableDebugMode can be uncommented if needed for deep debugging
  // enableDebugMode(): void {
  //   const socket = this.getSocket();
  //   socket.onAny((eventName, ...args) => {
  //     console.log(`[SOCKET_DEBUG] Event: ${eventName}`, args);
  //   });
  //   console.log("Socket debug mode enabled");
  // }
}

// Create a singleton instance
export const socketService = new SocketService();
