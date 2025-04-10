import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGame } from '@/lib/gameContext';
import { useWebSocket } from '@/lib/websocketContext';
import { PlayerAvatar } from '@/components/PlayerAvatar';

export default function ResultsPage() {
  const { 
    game, 
    players, 
    currentQuestion, 
    currentRound,
    totalRounds,
    nextRound,
    loading,
    refreshGameState,
    gameId
  } = useGame();
  const webSocket = useWebSocket();
  const [waitingForOthers, setWaitingForOthers] = useState(false);
  
  // Refresh game state when component mounts
  useEffect(() => {
    refreshGameState();
  }, [refreshGameState]);
  
  // Connect to WebSocket when component mounts
  useEffect(() => {
    if (!gameId) return;
    
    webSocket.connect();
    webSocket.joinGame(gameId);
    
    // Cleanup on unmount
    return () => {
      // Only disconnect if navigating away from the game
      // In real games, we would keep the connection across pages
    };
  }, [gameId, webSocket]);
  
  // If game isn't loaded yet, show loading state
  if (!game || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto shadow-lg rounded-2xl overflow-hidden">
          <CardContent className="p-8 text-center">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-24 bg-gray-200 rounded mb-6"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <section className="min-h-screen flex flex-col justify-center items-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-lg rounded-2xl overflow-hidden">
        <CardContent className="p-8">
          <h2 className="text-2xl font-bold font-sans text-primary mb-2">Round Results</h2>
          <div className="bg-indigo-50 p-4 rounded-xl mb-6">
            <h3 className="text-lg font-medium text-gray-900 font-sans">
              {currentQuestion.text}
            </h3>
          </div>
          
          <div className="mb-8">
            <h3 className="text-lg font-semibold font-sans text-gray-900 mb-3">Answers:</h3>
            <div className="space-y-3">
              {players.map((player) => (
                <div key={player.id} className="p-3 rounded-lg bg-gray-100 flex items-center">
                  <PlayerAvatar 
                    number={player.order} 
                    color={player.color} 
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900 font-sans">{player.name}</div>
                    <div className="text-gray-600 font-sans">{player.answer || '(No answer submitted)'}</div>
                  </div>
                  <div className="ml-auto">
                    {player.isCommon && (
                      <span className="bg-emerald-500 text-white px-2 py-1 rounded-full text-xs font-medium">+1</span>
                    )}
                    {player.isBlackSheep && (
                      <div className="flex items-center">
                        <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium">-1</span>
                        <span className="ml-1 inline-block">🐑</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-lg font-semibold font-sans text-gray-900 mb-3">Scoreboard:</h3>
            <div className="grid grid-cols-2 gap-3">
              {players.map((player) => (
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
          
          <Button 
            onClick={() => {
              setWaitingForOthers(true);
              nextRound();
              // Notify other players via WebSocket
              if (gameId) {
                webSocket.sendGameUpdate(gameId, {
                  action: 'next_round',
                  currentRound: currentRound + 1
                });
              }
            }}
            disabled={loading || waitingForOthers}
            className="w-full bg-primary hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-full"
          >
            {waitingForOthers 
              ? 'Moving to next round...' 
              : currentRound < totalRounds 
                ? 'Next Round' 
                : 'See Final Results'
            }
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
