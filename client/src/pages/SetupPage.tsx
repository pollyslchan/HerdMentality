import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGame } from '@/lib/gameContext';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { PLAYER_COLORS } from '@/lib/gameContext';

export default function SetupPage() {
  const [, setLocation] = useLocation();
  const { createGame, addPlayer, startGame, loading } = useGame();
  
  const [playerCount, setPlayerCount] = useState(4);
  const [roundCount, setRoundCount] = useState(8);
  const [playerNames, setPlayerNames] = useState<string[]>(Array(8).fill(''));
  
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
  
  const handleStartGame = async () => {
    try {
      // Create the game
      const gameId = await createGame(roundCount);
      
      // Add all players
      for (let i = 0; i < playerCount; i++) {
        const name = playerNames[i].trim() || `Player ${i + 1}`;
        await addPlayer(name, i);
      }
      
      // Start the game
      startGame();
    } catch (error) {
      console.error('Failed to start game:', error);
    }
  };
  
  return (
    <section className="min-h-screen flex flex-col justify-center items-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg rounded-2xl overflow-hidden">
        <CardContent className="p-8">
          <h1 className="text-3xl font-bold font-sans text-primary mb-6">Game Setup</h1>
          
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
        </CardContent>
      </Card>
    </section>
  );
}
