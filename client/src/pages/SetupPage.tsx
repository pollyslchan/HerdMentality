import React, { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useGame } from '@/lib/gameContext';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { PLAYER_COLORS } from '@/lib/gameContext';
import { useWebSocket } from '@/lib/websocketContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { GameWithDetails } from '@shared/schema';

export default function SetupPage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/setup');
  const { createGame, addPlayer, startGame, loading, gameId, refreshGameState, game } = useGame();
  const { toast } = useToast();
  const webSocket = useWebSocket();
  
  // Joining game states
  const [isJoiningGame, setIsJoiningGame] = useState(false);
  const [existingGameId, setExistingGameId] = useState<number | null>(null);
  const [existingGameData, setExistingGameData] = useState<GameWithDetails | null>(null);
  const [playerName, setPlayerName] = useState('');
  
  // Creating game states
  const [playerCount, setPlayerCount] = useState(4);
  const [roundCount, setRoundCount] = useState(8);
  const [playerNames, setPlayerNames] = useState<string[]>(Array(8).fill(''));
  
  // Waiting room states
  const [showWaitingRoom, setShowWaitingRoom] = useState(false);
  const [gameCode, setGameCode] = useState('');
  
  // Check if we're joining a game by URL parameter
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const gameId = queryParams.get('gameId');
    
    if (gameId) {
      const id = parseInt(gameId);
      if (!isNaN(id)) {
        setIsJoiningGame(true);
        setExistingGameId(id);
        fetchGameDetails(id);
      }
    }
  }, []);
  
  // Fetch game details for joining
  const fetchGameDetails = async (gameId: number) => {
    try {
      const response = await apiRequest(`/api/games/${gameId}`, { throwOnError: false });
      
      if (response.ok) {
        const gameData = await response.json() as GameWithDetails;
        setExistingGameData(gameData);
        
        // Connect to game via WebSocket
        webSocket.connect();
        webSocket.joinGame(gameId);
      } else {
        toast({
          title: "Error",
          description: "Game not found. Please try again with a valid game code.",
          variant: "destructive"
        });
        setLocation('/');
      }
    } catch (error) {
      console.error("Error fetching game details:", error);
      toast({
        title: "Error",
        description: "Failed to join game. Please try again.",
        variant: "destructive"
      });
      setLocation('/');
    }
  };
  
  const handleDecreasePlayers = () => {
    if (playerCount > 2) {
      setPlayerCount(playerCount - 1);
    }
  };
  
  const handleIncreasePlayers = () => {
    if (playerCount < 8) {
      setPlayerCount(playerCount + 1);
    }
  };
  
  const handlePlayerNameChange = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };
  
  const handleJoinGame = async () => {
    if (!existingGameId) return;
    
    if (!playerName.trim()) {
      toast({
        title: "Error",
        description: "Please enter your name",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Add the player to the existing game
      const nextPlayerIndex = existingGameData?.players.length || 0;
      await addPlayer(playerName, nextPlayerIndex);
      
      // Notify other players via WebSocket
      webSocket.sendGameUpdate(existingGameId, {
        action: 'player_joined',
        playerName,
        playerIndex: nextPlayerIndex
      });
      
      // Enter waiting room instead of starting the game immediately
      setShowWaitingRoom(true);
      setGameCode(existingGameData?.gameCode || '');
      
      // Set up regular refreshes of the game state to see new players
      const intervalId = setInterval(() => {
        refreshGameState();
      }, 2000);
      
      // Clean up the interval when the component unmounts
      return () => clearInterval(intervalId);
    } catch (error) {
      console.error('Failed to join game:', error);
      toast({
        title: "Error",
        description: "Failed to join game. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleCreateGame = async () => {
    try {
      // Create the game
      const gameId = await createGame(roundCount);
      
      // Add the first player (host)
      const hostName = playerNames[0].trim() || `Player 1`;
      await addPlayer(hostName, 0);
      
      // Connect to WebSocket for this game
      webSocket.connect();
      webSocket.joinGame(gameId);
      
      // Fetch updated game details to get the game code
      const response = await apiRequest(`/api/games/${gameId}`);
      const gameData = await response.json();
      setGameCode(gameData.gameCode);
      
      // Move to waiting room
      setShowWaitingRoom(true);
      
      // Set up regular refreshes of the game state to see new players
      const intervalId = setInterval(() => {
        refreshGameState();
      }, 2000);
      
      // Clean up the interval when the component unmounts
      return () => clearInterval(intervalId);
    } catch (error) {
      console.error('Failed to create game:', error);
      toast({
        title: "Error",
        description: "Failed to create game. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleLaunchGame = () => {
    // Start the game when host decides all players have joined
    startGame();
  };
  
  return (
    <section className="min-h-screen flex flex-col justify-center items-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg rounded-2xl overflow-hidden">
        <CardContent className="p-8">
          {/* Waiting Room UI after creating a game */}
          {showWaitingRoom ? (
            <>
              <h1 className="text-3xl font-bold font-sans text-primary mb-4">Waiting Room</h1>
              
              <div className="mb-8">
                <div className="bg-indigo-50 rounded-lg p-6 mb-6">
                  <p className="font-medium text-gray-900 mb-2">Share this game code with your friends:</p>
                  <p className="text-4xl font-bold text-primary tracking-wider text-center">{gameCode}</p>
                </div>
                
                <div className="space-y-2 mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Players ({game?.players.length || 1} joined):</h3>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {game?.players.map((player, index) => (
                      <div key={player.id} className="flex items-center">
                        <PlayerAvatar 
                          number={index + 1} 
                          color={player.color}
                          size="sm"
                        />
                        <span className="ml-2 text-gray-900">{player.name}</span>
                        {index === 0 && (
                          <span className="ml-2 text-xs bg-primary text-white px-2 py-1 rounded-full">Host</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">Waiting for players</h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>
                          Players can join by entering the game code on the home screen.
                          Start the game when everyone has joined.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <Button 
                    onClick={() => {
                      setShowWaitingRoom(false);
                      setLocation('/');
                    }}
                    variant="outline"
                    className="flex-1 border border-primary text-primary font-medium py-3 px-6 rounded-full"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleLaunchGame}
                    disabled={loading || (game?.players.length || 0) < 2}
                    className="flex-1 bg-primary hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-full"
                  >
                    {loading ? 'Starting...' : 'Start Game'}
                  </Button>
                </div>
              </div>
            </>
          ) : isJoiningGame ? (
            <>
              <h1 className="text-3xl font-bold font-sans text-primary mb-4">Join Game</h1>
              
              {existingGameData ? (
                <div className="mb-6">
                  <div className="bg-indigo-50 rounded-lg p-4 mb-4">
                    <p className="font-medium text-gray-900">
                      Game Code: <span className="text-primary font-bold tracking-wider">{existingGameData.gameCode}</span>
                    </p>
                    <p className="text-sm text-gray-700">
                      Rounds: {existingGameData.totalRounds} • 
                      Players: {existingGameData.players.length}
                    </p>
                  </div>
                  
                  <div className="mb-6 space-y-4">
                    <Label htmlFor="playerName">Your Name</Label>
                    <Input
                      id="playerName"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full p-3"
                    />
                  </div>
                  
                  <div className="space-y-2 mb-6">
                    <h3 className="text-lg font-medium text-gray-900">Current Players:</h3>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      {existingGameData.players.map((player, index) => (
                        <div key={index} className="flex items-center">
                          <PlayerAvatar 
                            number={index + 1} 
                            color={PLAYER_COLORS[index % PLAYER_COLORS.length]}
                            size="sm"
                          />
                          <span className="ml-2 text-gray-900">{player.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button 
                      onClick={() => setLocation('/')}
                      variant="outline"
                      className="flex-1 border border-primary text-primary font-medium py-3 px-6 rounded-full"
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={handleJoinGame}
                      disabled={loading || !playerName.trim()}
                      className="flex-1 bg-primary hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-full"
                    >
                      {loading ? 'Joining...' : 'Join Game'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              )}
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold font-sans text-primary mb-4">Game Setup</h1>
              
              <div className="mb-6">
                <Label htmlFor="num-players" className="block text-sm font-medium text-gray-900 mb-2">
                  Number of Players
                </Label>
                <div className="flex justify-between items-center">
                  <Button 
                    onClick={handleDecreasePlayers}
                    disabled={playerCount <= 2}
                    variant="outline"
                    className="bg-gray-200 text-gray-900 font-bold w-10 h-10 rounded-full p-0"
                  >
                    -
                  </Button>
                  <span className="text-xl font-bold font-sans text-gray-900">{playerCount}</span>
                  <Button 
                    onClick={handleIncreasePlayers}
                    disabled={playerCount >= 8}
                    variant="outline"
                    className="bg-gray-200 text-gray-900 font-bold w-10 h-10 rounded-full p-0"
                  >
                    +
                  </Button>
                </div>
              </div>
              
              <div className="mb-6">
                <Label htmlFor="rounds" className="block text-sm font-medium text-gray-900 mb-2">
                  Number of Rounds
                </Label>
                <Select
                  value={roundCount.toString()}
                  onValueChange={(value) => setRoundCount(parseInt(value))}
                >
                  <SelectTrigger className="w-full p-3 bg-gray-100 rounded-lg text-gray-900">
                    <SelectValue placeholder="Select rounds" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 Rounds</SelectItem>
                    <SelectItem value="8">8 Rounds</SelectItem>
                    <SelectItem value="10">10 Rounds</SelectItem>
                    <SelectItem value="15">15 Rounds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Host Name</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <PlayerAvatar 
                      number={1}
                      color={PLAYER_COLORS[0]}
                    />
                    <Input
                      type="text"
                      placeholder="Your Name"
                      value={playerNames[0]}
                      onChange={(e) => handlePlayerNameChange(0, e.target.value)}
                      className="flex-1 p-2 border rounded-lg ml-3"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  onClick={() => setLocation('/')}
                  variant="outline"
                  className="flex-1 border border-primary text-primary font-medium py-3 px-6 rounded-full"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleCreateGame}
                  disabled={loading || !playerNames[0].trim()}
                  className="flex-1 bg-primary hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-full"
                >
                  {loading ? 'Creating...' : 'Create Game'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
