import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGame } from '@/lib/gameContext';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { useWebSocket } from '@/lib/websocketContext';

export default function FinalResultsPage() {
  const { 
    players, 
    getWinner,
    resetGame,
    playAgain,
    loading,
    gameId
  } = useGame();
  const webSocket = useWebSocket();
  const [isResetting, setIsResetting] = useState(false);
  
  // Connect to WebSocket when component mounts
  useEffect(() => {
    if (!gameId) return;
    
    webSocket.connect();
    webSocket.joinGame(gameId);
  }, [gameId, webSocket]);
  
  const winner = getWinner();
  
  // Sort players by score (highest first)
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  
  return (
    <section className="min-h-screen flex flex-col justify-center items-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg rounded-2xl overflow-hidden">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold font-sans text-primary mb-2">Game Over!</h1>
            <div className="inline-block bg-indigo-100 text-primary font-medium px-4 py-2 rounded-full mb-6">
              Final Scores
            </div>
            
            {winner && (
              <div className="flex justify-center mb-6">
                <div className="w-32 h-32 rounded-full bg-accent text-white flex flex-col items-center justify-center">
                  <div className="text-sm">Winner</div>
                  <div className="text-xl font-bold">{winner.name}</div>
                  <div className="text-2xl font-bold">{winner.score}</div>
                </div>
              </div>
            )}
          </div>
          
          <div className="mb-8">
            <h3 className="text-lg font-semibold font-sans text-gray-900 mb-3">Final Standings:</h3>
            <div className="space-y-3">
              {sortedPlayers.map((player) => (
                <div key={player.id} className="p-3 rounded-lg bg-gray-100 flex items-center">
                  <PlayerAvatar 
                    number={player.order} 
                    color={player.color} 
                  />
                  <div className="flex-1 ml-3">
                    <div className="font-medium text-gray-900 font-sans">{player.name}</div>
                  </div>
                  <div className="font-bold text-gray-900 font-sans">{player.score}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Button 
              onClick={playAgain}
              disabled={loading || isResetting}
              variant="outline"
              className="flex-1 border border-primary text-primary font-medium py-3 px-6 rounded-full"
            >
              New Game
            </Button>
            <Button 
              onClick={() => {
                setIsResetting(true);
                // Notify other players via WebSocket that the game is being reset
                if (gameId) {
                  webSocket.sendGameUpdate(gameId, {
                    action: 'game_reset'
                  });
                }
                resetGame();
              }}
              disabled={loading || isResetting}
              className="flex-1 bg-primary hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-full"
            >
              {isResetting ? 'Restarting...' : 'Play Again'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
