import { io, Socket } from "socket.io-client";

const SOCKET_URL = "http://localhost:3000";

// Types based on the WebSocket API documentation
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
  chunks: number;
  totalCharacters: number;
  completed: boolean;
  bytesReceived: number;
  bytesExpected: number;
  percent: number;
}

export interface UploadErrorData {
  uploadId: string;
  error: string;
}

class SocketService {
  private socket: Socket | null = null;
  private initialized = false;
  private isConnected = false;

  initialize(): Socket {
    if (!this.initialized) {
      this.socket = io(SOCKET_URL);

      // Add connection event handlers for debugging
      this.socket.on("connect", () => {
        console.log("Socket.IO connected");
        this.isConnected = true;
      });

      this.socket.on("disconnect", () => {
        console.log("Socket.IO disconnected");
        this.isConnected = false;
      });

      this.socket.on("connect_error", (error) => {
        console.error("Socket.IO connection error:", error);
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

  joinUploadRoom(uploadId: string): void {
    const socket = this.getSocket();
    // Check connection status before emitting
    if (!this.isConnected) {
      console.warn(`Cannot join room for ${uploadId}, socket not connected`);
      return;
    }
    socket.emit("joinUploadRoom", uploadId);
    console.log(`Joined upload room: ${uploadId}`);

    // Debug listener to confirm room joining
    socket.once("ACK:joinUploadRoom", (data) => {
      console.log("Successfully joined room:", data);
    });
  }

  leaveUploadRoom(uploadId: string): void {
    const socket = this.getSocket();
    if (!this.isConnected) {
      console.warn(`Cannot leave room for ${uploadId}, socket not connected`);
      return;
    }
    socket.emit("leaveUploadRoom", uploadId);
    console.log(`Left upload room: ${uploadId}`);
  }

  onUploadProgress(callback: (data: UploadProgressData) => void): void {
    const socket = this.getSocket();
    socket.on("uploadProgress", (data: UploadProgressData) => {
      console.log("Progress event received:", data);
      callback(data);
    });
  }

  onUploadComplete(callback: (data: UploadCompleteData) => void): void {
    const socket = this.getSocket();
    socket.on("uploadComplete", (data: UploadCompleteData) => {
      console.log("Complete event received:", data);
      callback(data);
    });
  }

  onUploadError(callback: (data: UploadErrorData) => void): void {
    const socket = this.getSocket();
    socket.on("uploadError", (data: UploadErrorData) => {
      console.log("Error event received:", data);
      callback(data);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.initialized = false;
      this.isConnected = false;
      console.log("Socket disconnected");
    }
  }

  // Generate a unique upload ID
  generateUploadId(): string {
    return `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Create a singleton instance
export const socketService = new SocketService();
