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

// Helper function to generate UUID v4 compatible with backend
function generateUUIDv4(): string {
  // Implementation based on RFC4122 version 4
  const hexDigits = "0123456789abcdef";
  let uuid = "";

  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += "-";
    } else if (i === 14) {
      uuid += "4"; // version 4
    } else if (i === 19) {
      uuid += hexDigits[(Math.random() * 4) | 8]; // variant bits
    } else {
      uuid += hexDigits[Math.floor(Math.random() * 16)];
    }
  }

  return uuid;
}

// Map to track relationship between client IDs and server IDs
class SocketService {
  private socket: Socket | null = null;
  private initialized = false;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  // Track active rooms to avoid duplicate joins/leaves
  private activeRooms = new Set<string>();
  // Map to track client-to-server ID relationships
  private idMappings = new Map<string, string>();

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

      // Add connection event handlers for debugging
      this.socket.on("connect", () => {
        console.log("Socket.IO connected");
        this.isConnected = true;
        this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
      });

      this.socket.on("disconnect", (reason) => {
        console.log(`Socket.IO disconnected: ${reason}`);
        this.isConnected = false;
        // Clear active rooms on disconnect
        this.activeRooms.clear();
      });

      this.socket.on("connect_error", (error) => {
        console.error("Socket.IO connection error:", error);
        this.reconnectAttempts++;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error(
            `Max reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`,
          );
          // You could show a user-friendly message here or try alternative communication
        }
      });

      this.socket.io.on("reconnect", (attempt) => {
        console.log(`Socket.IO reconnected after ${attempt} attempts`);
        this.isConnected = true;
      });

      this.socket.io.on("reconnect_attempt", (attempt) => {
        console.log(`Socket.IO reconnection attempt #${attempt}`);
      });

      this.socket.io.on("reconnect_error", (error) => {
        console.error("Socket.IO reconnection error:", error);
      });

      this.socket.io.on("reconnect_failed", () => {
        console.error("Socket.IO failed to reconnect");
      });

      this.initialized = true;
      console.log("Socket.IO initialized");
    }

    return this.socket!;
  }

  getSocket(): Socket {
    if (!this.initialized) {
      return this.initialize();
    }
    return this.socket!;
  }

  // Map a server ID to a client ID
  mapServerToClientId(serverId: string, clientId: string): void {
    this.idMappings.set(serverId, clientId);
    console.log(`Mapped server ID ${serverId} to client ID ${clientId}`);
  }

  // Get the client ID for a server ID (or return the server ID if no mapping exists)
  getClientId(serverId: string): string {
    return this.idMappings.get(serverId) || serverId;
  }

  // Get the server ID for a client ID (or return the client ID if no mapping exists)
  getServerId(clientId: string): string {
    // Check if this is a direct server ID
    if (this.activeRooms.has(clientId)) {
      return clientId;
    }

    // Find the mapping
    for (const [serverId, mappedClientId] of this.idMappings.entries()) {
      if (mappedClientId === clientId) {
        return serverId;
      }
    }

    // No mapping found, return the input ID
    return clientId;
  }

  joinUploadRoom(uploadId: string): void {
    const socket = this.getSocket();

    if (!this.isConnected) {
      console.warn(`Cannot join room for ${uploadId}, socket not connected`);
      return;
    }

    // Don't join if already in this room
    if (this.activeRooms.has(uploadId)) {
      console.log(`[SocketService DEBUG] joinUploadRoom: Already in activeRooms for ${uploadId}. Current activeRooms:`, new Set(this.activeRooms));
      // Even if already in activeRooms, ensure server knows, in case of client/server desync
      // socket.emit("joinUploadRoom", uploadId); // Re-emitting might cause issues if server doesn't handle it well
      return;
    }

    console.log(`[SocketService DEBUG] joinUploadRoom: Attempting to join room for ${uploadId}. isConnected: ${this.isConnected}. Current activeRooms:`, new Set(this.activeRooms));
    // Add to active rooms - store without prefix
    this.activeRooms.add(uploadId);
    console.log(`[SocketService DEBUG] joinUploadRoom: Added ${uploadId} to activeRooms. New activeRooms:`, new Set(this.activeRooms));

    // Emit join event - server will add prefix
    socket.emit("joinUploadRoom", uploadId);
    console.log(`[SocketService] Client ${socket.id} emitted joinUploadRoom for: ${uploadId}`);

    // Debug listener to confirm room joining
    socket.once("ACK:joinUploadRoom", (data) => {
      console.log(`[SocketService] ACK:joinUploadRoom received for ${uploadId}:`, data);
    });
  }

  leaveUploadRoom(uploadId: string): void {
    const socket = this.getSocket();

    if (!this.isConnected) {
      console.warn(`[SocketService DEBUG] leaveUploadRoom: Cannot leave room for ${uploadId}, socket not connected.`);
      return;
    }

    console.log(`[SocketService DEBUG] leaveUploadRoom: Attempting to leave room for ${uploadId}. isConnected: ${this.isConnected}. Current activeRooms:`, new Set(this.activeRooms));
    // Don't leave if not in this room
    if (!this.activeRooms.has(uploadId)) {
      console.log(`[SocketService DEBUG] leaveUploadRoom: Not in activeRooms for ${uploadId}, no need to leave. Current activeRooms:`, new Set(this.activeRooms));
      return;
    }

    // Remove from active rooms
    this.activeRooms.delete(uploadId);
    console.log(`[SocketService DEBUG] leaveUploadRoom: Removed ${uploadId} from activeRooms. New activeRooms:`, new Set(this.activeRooms));

    // Emit leave event - server will handle the prefix
    socket.emit("leaveUploadRoom", uploadId);
    console.log(`[SocketService] Client ${socket.id} emitted leaveUploadRoom for: ${uploadId}`);
  }

  onUploadProgress(callback: (data: UploadProgressData) => void): void {
    const socket = this.getSocket();
    // Remove any existing listeners for this event to prevent duplicates
    socket.off("uploadProgress");

    socket.on("uploadProgress", (data: UploadProgressData) => {
      console.log("Upload progress event received:", data);

      // Check if we have a client ID mapped for this server ID
      const clientId = this.getClientId(data.uploadId);

      callback({
        ...data,
        uploadId: clientId, // Use the client ID if available
      });
    });

    console.log("Registered uploadProgress event listener");
  }

  onUploadComplete(callback: (data: UploadCompleteData) => void): void {
    const socket = this.getSocket();
    // Remove any existing listeners for this event to prevent duplicates
    socket.off("uploadComplete");

    socket.on("uploadComplete", (data: UploadCompleteData) => {
      console.log("Upload complete event received:", data);

      // Check if we have a client ID mapped for this server ID
      const clientId = this.getClientId(data.uploadId);

      callback({
        ...data,
        uploadId: clientId, // Use the client ID if available
      });
    });

    console.log("Registered uploadComplete event listener");
  }

  onUploadError(callback: (data: UploadErrorData) => void): void {
    const socket = this.getSocket();
    // Remove any existing listeners for this event to prevent duplicates
    socket.off("uploadError");

    socket.on("uploadError", (data: UploadErrorData) => {
      console.log("Upload error event received:", data);

      // Check if we have a client ID mapped for this server ID
      const clientId = this.getClientId(data.uploadId);

      callback({
        ...data,
        uploadId: clientId, // Use the client ID if available
      });
    });

    console.log("Registered uploadError event listener");
  }

  // Processing files
  onProcessingStart(callback: (data: ProcessingStartData) => void): void {
    const socket = this.getSocket();
    // Remove any existing listeners for this event to prevent duplicates
    socket.off("processingStart");

    socket.on("processingStart", (data: ProcessingStartData) => {
      console.log("Processing start event received:", data);

      // Store the server's uploadId and the processing ID relationship
      // If we have an existing client ID for this upload, use that mapping
      const clientId = this.getClientId(data.uploadId);

      // If different, store the new relationship
      if (clientId !== data.uploadId) {
        console.log(
          `Using existing mapping: server ${data.uploadId} -> client ${clientId}`,
        );
      }

      callback({
        ...data,
        uploadId: clientId, // Use the client ID in the callback
      });
    });

    console.log("Registered processingStart event listener");
  }

  onProcessingProgress(callback: (data: ProcessingProgressData) => void): void {
    const socket = this.getSocket();
    // Remove any existing listeners for this event to prevent duplicates
    socket.off("processingProgress");

    socket.on("processingProgress", (data: ProcessingProgressData) => {
      console.log("Processing progress event received:", data);

      // Check if we have a client ID mapped for this server ID
      const clientId = this.getClientId(data.uploadId);

      callback({
        ...data,
        uploadId: clientId, // Use the client ID if available
      });
    });

    console.log("Registered processingProgress event listener");
  }

  onProcessingComplete(callback: (data: ProcessingCompleteData) => void): void {
    const socket = this.getSocket();
    // Remove any existing listeners for this event to prevent duplicates
    socket.off("processingComplete");

    socket.on("processingComplete", (data: ProcessingCompleteData) => {
      console.log("Processing complete event received:", data);

      // Check if we have a client ID mapped for this server ID
      const clientId = this.getClientId(data.uploadId);

      callback({
        ...data,
        uploadId: clientId, // Use the client ID if available
      });
    });

    console.log("Registered processingComplete event listener");
  }

  onProcessingError(callback: (data: ProcessingErrorData) => void): void {
    const socket = this.getSocket();
    // Remove any existing listeners for this event to prevent duplicates
    socket.off("processingError");

    socket.on("processingError", (data: ProcessingErrorData) => {
      console.log("Processing error event received:", data);

      // Check if we have a client ID mapped for this server ID
      const clientId = this.getClientId(data.uploadId);

      callback({
        ...data,
        uploadId: clientId, // Use the client ID if available
      });
    });

    console.log("Registered processingError event listener");
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.initialized = false;
      this.isConnected = false;
      this.activeRooms.clear(); // Clear active rooms on disconnect
      this.idMappings.clear(); // Clear ID mappings on disconnect
      console.log("Socket disconnected");
    }
  }

  // Generate a unique upload ID that matches UUID v4 format
  generateUploadId(): string {
    // Using UUID format compatible with the backend
    return uuidv4();
  }

  // Debugging mode for all socket events
  enableDebugMode(): void {
    const socket = this.getSocket();

    // Listen for all events for debugging purposes
    socket.onAny((eventName, ...args) => {
      console.log(`[SOCKET] Event received: ${eventName}`, args);
    });

    console.log("Socket debug mode enabled");
  }
}

// Create a singleton instance
export const socketService = new SocketService();
