import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from './queryClient';
import { useToast } from "@/hooks/use-toast";
import { 
  type Game, 
  type Player, 
  type Question, 
  type PlayerWithAnswer,
  type GameWithDetails,
} from '@shared/schema';
import { getRandomQuestions } from './gameQuestions';
import { webSocketService } from './websocketContext';

// Player colors for the game
export const PLAYER_COLORS = [
  'primary',   // indigo
  'secondary', // pink
  'accent',    // purple
  'success',   // green 
  'warning',   // amber
  'error',     // red
  'dark',      // gray
  'primary'    // restart with primary
];

interface GameContextType {
  gameId: number | null;
  game: GameWithDetails | null;
  players: PlayerWithAnswer[];
  loading: boolean;
  error: string | null;
  currentQuestion: Question | null;
  currentRound: number;
  totalRounds: number;
  timerSeconds: number;
  isTimerRunning: boolean;
  
  // Game setup functions
  createGame: (totalRounds: number) => Promise<number>;
  addPlayer: (name: string, playerIndex: number) => Promise<void>;
  startGame: () => void;
  
  // Game play functions
  submitAnswer: (playerId: number, answer: string) => Promise<void>;
  processRoundAnswers: () => Promise<void>;
  nextRound: () => Promise<void>;
  resetGame: () => Promise<void>;
  playAgain: () => Promise<void>;
  
  // Timer functions
  startTimer: (seconds?: number) => void;
  stopTimer: () => void;
  
  // Game state queries
  refreshGameState: () => Promise<void>;
  isGameComplete: boolean;
  hasEveryoneAnswered: boolean;
  getWinner: () => PlayerWithAnswer | undefined;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [gameId, setGameId] = useState<number | null>(null);
  const [game, setGame] = useState<GameWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Computed properties
  const players = game?.players || [];
  const currentRound = game?.currentRound || 1;
  const totalRounds = game?.totalRounds || 8;
  const currentQuestion = game?.currentQuestion || null;
  const isGameComplete = game?.isComplete || false;
  
  const hasEveryoneAnswered = players.length > 0 && 
    players.every(player => player.hasSubmitted);
  
  // Set up WebSocket listener for real-time updates
  useEffect(() => {
    if (!gameId) return;
    
    // Connect to WebSocket
    webSocketService.connect();
    
    // Join the game room
    webSocketService.joinGame(gameId);
    
    // Add message listener
    const handleWebSocketMessage = (message: any) => {
      if (message.type === 'game_update' && message.gameId === gameId) {
        // Handle different types of game updates
        const { data } = message;
        
        if (data?.action === 'player_joined') {
          toast({
            title: "New Player",
            description: `${data.playerName} has joined the game!`,
          });
          refreshGameState();
        } 
        else if (data?.action === 'answer_submitted') {
          refreshGameState();
        }
        else if (data?.action === 'round_processed') {
          refreshGameState();
          setLocation('/results');
        }
        else if (data?.action === 'next_round') {
          refreshGameState();
          setLocation('/question');
          startTimer(30);
        }
        else if (data?.action === 'game_reset') {
          refreshGameState();
          setLocation('/question');
          startTimer(30);
        }
      }
    };
    
    webSocketService.addMessageListener(handleWebSocketMessage);
    
    // Clean up on unmount
    return () => {
      webSocketService.disconnect();
    };
  }, [gameId]);
  
  // Timer functions
  const startTimer = (seconds = 30) => {
    stopTimer();
    setTimerSeconds(seconds);
    setIsTimerRunning(true);
    
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsTimerRunning(false);
          processRoundAnswers();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setTimerInterval(interval);
  };
  
  const stopTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setIsTimerRunning(false);
  };
  
  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);
  
  // Game API functions
  const refreshGameState = async () => {
    if (!gameId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest(`/api/games/${gameId}`);
      const gameData = await response.json();
      setGame(gameData);
    } catch (err) {
      setError('Failed to load game state');
      toast({
        title: "Error",
        description: "Failed to load game state",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Create a new game
  const createGame = async (totalRounds: number): Promise<number> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('/api/games', {
        method: 'POST',
        data: { totalRounds }
      });
      const gameData = await response.json();
      setGameId(gameData.id);
      await refreshGameState();
      return gameData.id;
    } catch (err) {
      setError('Failed to create game');
      toast({
        title: "Error",
        description: "Failed to create game",
        variant: "destructive"
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Add a player to the game
  const addPlayer = async (name: string, playerIndex: number) => {
    if (!gameId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await apiRequest('/api/players', {
        method: 'POST', 
        data: {
          gameId,
          name,
          color: PLAYER_COLORS[playerIndex % PLAYER_COLORS.length],
          order: playerIndex + 1
        }
      });
      await refreshGameState();
    } catch (err) {
      setError('Failed to add player');
      toast({
        title: "Error",
        description: "Failed to add player",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Start the game - navigate to the question page
  const startGame = () => {
    if (!gameId) return;
    setLocation('/question');
    startTimer(30);
  };
  
  // Submit an answer for a player
  const submitAnswer = async (playerId: number, answer: string) => {
    if (!gameId || !game) return;
    
    const currentRound = game.rounds.find(r => r.roundNumber === game.currentRound);
    if (!currentRound) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await apiRequest('/api/answers', {
        method: 'POST',
        data: {
          roundId: currentRound.id,
          playerId,
          text: answer
        }
      });
      await refreshGameState();
      
      // Send WebSocket notification
      webSocketService.sendGameUpdate(gameId, {
        action: 'answer_submitted',
        playerId,
        roundId: currentRound.id
      });
      
      // If all players have answered, process the round
      if (players.length > 0 && players.filter(p => p.hasSubmitted).length === players.length - 1) {
        await processRoundAnswers();
      }
    } catch (err) {
      setError('Failed to submit answer');
      toast({
        title: "Error",
        description: "Failed to submit answer",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Process round answers to determine common answers and black sheep
  const processRoundAnswers = async () => {
    if (!gameId || !game) return;
    
    const currentRound = game.rounds.find(r => r.roundNumber === game.currentRound);
    if (!currentRound) return;
    
    stopTimer();
    setLoading(true);
    setError(null);
    
    try {
      await apiRequest(`/api/rounds/${currentRound.id}/process`, {
        method: 'POST'
      });
      await refreshGameState();
      
      // Send WebSocket notification
      webSocketService.sendGameUpdate(gameId, {
        action: 'round_processed',
        roundId: currentRound.id
      });
      
      setLocation('/results');
    } catch (err) {
      setError('Failed to process round answers');
      toast({
        title: "Error",
        description: "Failed to process round answers",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Move to the next round
  const nextRound = async () => {
    if (!gameId || !game) return;
    
    setLoading(true);
    setError(null);
    
    try {
      if (currentRound < totalRounds) {
        await apiRequest(`/api/games/${gameId}/next-round`, {
          method: 'POST'
        });
        await refreshGameState();
        
        // Send WebSocket notification
        webSocketService.sendGameUpdate(gameId, {
          action: 'next_round',
          currentRound: currentRound + 1
        });
        
        setLocation('/question');
        startTimer(30);
      } else {
        // Game is complete
        setLocation('/final-results');
      }
    } catch (err) {
      setError('Failed to advance to next round');
      toast({
        title: "Error",
        description: "Failed to advance to next round",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Reset the game to play again with the same players
  const resetGame = async () => {
    if (!gameId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await apiRequest(`/api/games/${gameId}/reset`, {
        method: 'POST'
      });
      await refreshGameState();
      
      // Send WebSocket notification
      webSocketService.sendGameUpdate(gameId, {
        action: 'game_reset'
      });
      
      setLocation('/question');
      startTimer(30);
    } catch (err) {
      setError('Failed to reset game');
      toast({
        title: "Error",
        description: "Failed to reset game",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Play again - go back to setup
  const playAgain = async () => {
    setLocation('/setup');
  };
  
  // Get the player with the highest score (winner)
  const getWinner = () => {
    if (!players.length) return undefined;
    
    return [...players].sort((a, b) => b.score - a.score)[0];
  };
  
  const value: GameContextType = {
    gameId,
    game,
    players,
    loading,
    error,
    currentQuestion,
    currentRound,
    totalRounds,
    timerSeconds,
    isTimerRunning,
    
    createGame,
    addPlayer,
    startGame,
    
    submitAnswer,
    processRoundAnswers,
    nextRound,
    resetGame,
    playAgain,
    
    startTimer,
    stopTimer,
    
    refreshGameState,
    isGameComplete,
    hasEveryoneAnswered,
    getWinner,
  };
  
  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
