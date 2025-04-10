import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  insertGameSchema,
  insertPlayerSchema,
  insertAnswerSchema,
  type Game
} from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";

// Function to generate a random 6-character game code
function generateGameCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

// Map to store active game connections
const gameConnections: Map<string, WebSocket[]> = new Map();

// WebSocket message types
type WebSocketMessage = {
  type: string;
  gameId: number;
  data?: any;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Games
  app.post("/api/games", async (req: Request, res: Response) => {
    try {
      const validatedData = insertGameSchema.parse(req.body);
      
      // Generate a unique game code
      const gameCode = generateGameCode();
      const gameWithCode = { ...validatedData, gameCode };
      
      const game = await storage.createGame(gameWithCode);
      
      // Generate random questions for the game
      const questions = await storage.getRandomQuestions(game.totalRounds);
      
      // Create rounds for the game
      for (let i = 0; i < game.totalRounds; i++) {
        if (questions[i]) {
          await storage.createRound({
            gameId: game.id,
            questionId: questions[i].id,
            roundNumber: i + 1
          });
        }
      }
      
      res.status(201).json(game);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create game" });
      }
    }
  });

  app.get("/api/games/:id", async (req: Request, res: Response) => {
    try {
      const gameId = parseInt(req.params.id);
      if (isNaN(gameId)) {
        return res.status(400).json({ message: "Invalid game ID" });
      }
      
      const game = await storage.getGameWithDetails(gameId);
      
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      res.json(game);
    } catch (error) {
      res.status(500).json({ message: "Failed to get game" });
    }
  });

  // Players
  app.post("/api/players", async (req: Request, res: Response) => {
    try {
      const validatedData = insertPlayerSchema.parse(req.body);
      const player = await storage.createPlayer(validatedData);
      res.status(201).json(player);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create player" });
      }
    }
  });

  app.get("/api/games/:gameId/players", async (req: Request, res: Response) => {
    try {
      const gameId = parseInt(req.params.gameId);
      if (isNaN(gameId)) {
        return res.status(400).json({ message: "Invalid game ID" });
      }
      
      const players = await storage.getPlayersByGame(gameId);
      res.json(players);
    } catch (error) {
      res.status(500).json({ message: "Failed to get players" });
    }
  });

  // Answers
  app.post("/api/answers", async (req: Request, res: Response) => {
    try {
      const validatedData = insertAnswerSchema.parse(req.body);
      
      // Check if player already answered this round
      const existingAnswer = await storage.getAnswerByRoundAndPlayer(
        validatedData.roundId, 
        validatedData.playerId
      );
      
      if (existingAnswer) {
        return res.status(400).json({ message: "Player already submitted an answer for this round" });
      }
      
      const answer = await storage.createAnswer(validatedData);
      res.status(201).json(answer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.errors });
      } else {
        res.status(500).json({ message: "Failed to submit answer" });
      }
    }
  });

  // Process round answers
  app.post("/api/rounds/:id/process", async (req: Request, res: Response) => {
    try {
      const roundId = parseInt(req.params.id);
      if (isNaN(roundId)) {
        return res.status(400).json({ message: "Invalid round ID" });
      }
      
      const round = await storage.getRound(roundId);
      if (!round) {
        return res.status(404).json({ message: "Round not found" });
      }
      
      await storage.processRoundAnswers(roundId);
      const processedRound = await storage.getRoundWithDetails(roundId);
      
      res.json(processedRound);
    } catch (error) {
      res.status(500).json({ message: "Failed to process round answers" });
    }
  });

  // Advance to next round
  app.post("/api/games/:id/next-round", async (req: Request, res: Response) => {
    try {
      const gameId = parseInt(req.params.id);
      if (isNaN(gameId)) {
        return res.status(400).json({ message: "Invalid game ID" });
      }
      
      const game = await storage.getGame(gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      if (game.currentRound >= game.totalRounds) {
        // Game is already at the final round
        await storage.updateGame(gameId, { isComplete: true });
        return res.status(400).json({ message: "Game is already at the final round" });
      }
      
      // Update game to next round
      const updatedGame = await storage.updateGame(gameId, {
        currentRound: game.currentRound + 1
      });
      
      res.json(updatedGame);
    } catch (error) {
      res.status(500).json({ message: "Failed to advance to next round" });
    }
  });

  // Reset game for playing again
  app.post("/api/games/:id/reset", async (req: Request, res: Response) => {
    try {
      const gameId = parseInt(req.params.id);
      if (isNaN(gameId)) {
        return res.status(400).json({ message: "Invalid game ID" });
      }
      
      const game = await storage.getGame(gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      // Reset game to first round and not complete
      const updatedGame = await storage.updateGame(gameId, {
        currentRound: 1,
        isComplete: false
      });
      
      // Reset all player scores
      const players = await storage.getPlayersByGame(gameId);
      for (const player of players) {
        await storage.updatePlayer(player.id, { score: 0 });
      }
      
      // Generate new random questions
      const questions = await storage.getRandomQuestions(game.totalRounds);
      
      // Delete old rounds and create new ones
      const oldRounds = await storage.getRoundsByGame(gameId);
      for (const round of oldRounds) {
        await storage.updateRound(round.id, { isComplete: false });
      }
      
      // Update questions for each round
      const rounds = await storage.getRoundsByGame(gameId);
      for (let i = 0; i < rounds.length; i++) {
        if (questions[i] && rounds[i]) {
          await storage.updateRound(rounds[i].id, { questionId: questions[i].id });
        }
      }
      
      res.json(updatedGame);
    } catch (error) {
      res.status(500).json({ message: "Failed to reset game" });
    }
  });

  // Add API endpoint to find a game by code
  app.get("/api/games/code/:code", async (req: Request, res: Response) => {
    try {
      const code = req.params.code.toUpperCase();
      
      // Find game by code
      const allGames = await storage.getAllGames();
      const game = allGames.find((g: Game) => g.gameCode === code);
      
      if (!game) {
        return res.status(404).json({ message: "Game not found with this code" });
      }
      
      const gameWithDetails = await storage.getGameWithDetails(game.id);
      res.json(gameWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to find game by code" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  // Set up WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // WebSocket connection handler
  wss.on('connection', (ws: WebSocket) => {
    let gameId: number | null = null;
    let gameCode: string | null = null;
    
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message) as WebSocketMessage;
        
        // Join a specific game room
        if (data.type === 'join') {
          gameId = data.gameId;
          const game = await storage.getGame(gameId);
          
          if (game && game.gameCode) {
            gameCode = game.gameCode;
            
            // Add this connection to the game's connection pool
            if (!gameConnections.has(gameCode)) {
              gameConnections.set(gameCode, []);
            }
            gameConnections.get(gameCode)?.push(ws);
            
            // Send confirmation
            ws.send(JSON.stringify({ type: 'joined', gameId, success: true }));
          }
        }
        
        // Handle game state updates
        if (data.type === 'game_update' && gameCode) {
          // Broadcast the update to all clients in this game
          const connections = gameConnections.get(gameCode) || [];
          
          for (const client of connections) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(data));
            }
          }
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });
    
    // Handle disconnection
    ws.on('close', () => {
      if (gameCode && gameConnections.has(gameCode)) {
        // Remove this connection from the game
        const connections = gameConnections.get(gameCode) || [];
        const index = connections.indexOf(ws);
        
        if (index !== -1) {
          connections.splice(index, 1);
        }
        
        // If no connections left for this game, remove the game entry
        if (connections.length === 0) {
          gameConnections.delete(gameCode);
        }
      }
    });
  });
  
  return httpServer;
}
