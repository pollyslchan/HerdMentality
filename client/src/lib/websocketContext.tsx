import React from 'react';

// Define WebSocket message type
export type WebSocketMessage = {
  type: string;
  gameId: number;
  data?: any;
};

// Create a websocket helper for direct use
class WebSocketService {
  private socket: WebSocket | null = null;
  private isConnected = false;

  connect() {
    if (this.socket) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      this.socket = new WebSocket(wsUrl);
      
      this.socket.onopen = () => {
        console.log('WebSocket connection established');
        this.isConnected = true;
      };
      
      this.socket.onclose = () => {
        console.log('WebSocket connection closed');
        this.isConnected = false;
        this.socket = null;
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnected = false;
      };
      
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }
  
  // Send a message to the server
  sendMessage(message: WebSocketMessage) {
    if (!this.socket) {
      this.connect();
    }
    
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected');
    }
  }
  
  // Join a specific game
  joinGame(gameId: number) {
    this.sendMessage({
      type: 'join',
      gameId
    });
  }
  
  // Send a game update
  sendGameUpdate(gameId: number, data: any) {
    this.sendMessage({
      type: 'game_update',
      gameId,
      data
    });
  }
  
  // Close the connection
  disconnect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
  }
  
  // Add message listener
  addMessageListener(callback: (message: WebSocketMessage) => void) {
    if (!this.socket) {
      this.connect();
    }
    
    if (this.socket) {
      this.socket.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          callback(message);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      });
    }
  }
  
  // Check connection status
  getConnectionStatus() {
    return this.isConnected;
  }
}

// Export a singleton instance
export const webSocketService = new WebSocketService();

// Function to use in components
export function useWebSocket() {
  return webSocketService;
}