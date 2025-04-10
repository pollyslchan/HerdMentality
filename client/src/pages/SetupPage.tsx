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
  const { createGame, addPlayer, startGame, loading } = useGame();
  const { toast } = useToast();
  const webSocket = useWebSocket();
  
  const [isJoiningGame, setIsJoiningGame] = useState(false);
  const [existingGameId, setExistingGameId] = useState<number | null>(null);
  const [existingGameData, setExistingGameData] = useState<GameWithDetails | null>(null);
  const [playerName, setPlayerName] = useState('');
  
  const [playerCount, setPlayerCount] = useState(4);
  const [roundCount, setRoundCount] = useState(8);
  const [playerNames, setPlayerNames] = useState<string[]>(Array(8).fill(''));
  
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
      
      // Start the game for this player
      startGame();
    } catch (error) {
      console.error('Failed to join game:', error);
      toast({
        title: "Error",
        description: "Failed to join game. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  const handleStartGame = async () => {
    try {
      // Create the game
      const gameId = await createGame(roundCount);
      
      // Add all players
      for (let i = 0; i < playerCount; i++) {
        const name = playerNames[i].trim() || `Player ${i + 1}`;
        await addPlayer(name, i);
      }
      
      // Connect to WebSocket for this game
      webSocket.connect();
      webSocket.joinGame(gameId);
      
      // Start the game
      startGame();
    } catch (error) {
      console.error('Failed to start game:', error);
      toast({
        title: "Error",
        description: "Failed to create game. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <section className="min-h-screen flex flex-col justify-center items-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg rounded-2xl overflow-hidden">
        <CardContent className="p-8">
          <h1 className="text-3xl font-bold font-sans text-primary mb-4">
            {isJoiningGame ? 'Join Game' : 'Game Setup'}
          </h1>
          
          {isJoiningGame ? (
            <>
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
                <h3 className="text-lg font-medium text-gray-900 mb-3">Player Names</h3>
                <div className="space-y-3">
                  {Array.from({ length: playerCount }).map((_, index) => (
                    <div key={index} className="flex items-center">
                      <PlayerAvatar 
                        number={index + 1} 
                        color={PLAYER_COLORS[index % PLAYER_COLORS.length]}
                      />
                      <Input
                        type="text"
                        placeholder={`Player ${index + 1}`}
                        value={playerNames[index]}
                        onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                        className="flex-1 p-2 border rounded-lg ml-3"
                      />
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
                  onClick={handleStartGame}
                  disabled={loading}
                  className="flex-1 bg-primary hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-full"
                >
                  {loading ? 'Starting...' : 'Start Game'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
