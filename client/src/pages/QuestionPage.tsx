import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimerCircle } from '@/components/TimerCircle';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { useGame } from '@/lib/gameContext';
import { useWebSocket } from '@/lib/websocketContext';

export default function QuestionPage() {
  const { 
    game, 
    players, 
    currentQuestion, 
    currentRound, 
    totalRounds, 
    timerSeconds, 
    isTimerRunning,
    submitAnswer,
    processRoundAnswers,
    hasEveryoneAnswered,
    gameId,
    refreshGameState
  } = useGame();
  
  const webSocket = useWebSocket();
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const currentPlayer = players[currentPlayerIndex];
  
  // Connect to WebSocket when component mounts
  useEffect(() => {
    if (!gameId) return;
    
    webSocket.connect();
    webSocket.joinGame(gameId);
    
    // Add message listener for real-time updates
    const handleWebSocketMessage = (message: any) => {
      if (message.type === 'game_update' && message.gameId === gameId) {
        const { data } = message;
        
        if (data?.action === 'answer_submitted') {
          refreshGameState();
        }
      }
    };
    
    webSocket.addMessageListener(handleWebSocketMessage);
  }, [gameId, webSocket, refreshGameState]);
  
  // Effect to auto-advance to next player after submitting an answer
  useEffect(() => {
    if (players.length > 0) {
      // Find the first player who hasn't submitted an answer yet
      const nextPlayerIndex = players.findIndex(p => !p.hasSubmitted);
      if (nextPlayerIndex !== -1) {
        setCurrentPlayerIndex(nextPlayerIndex);
      }
    }
  }, [players]);
  
  // Effect to automatically process answers when everyone has submitted
  useEffect(() => {
    if (hasEveryoneAnswered && players.length > 0) {
      processRoundAnswers();
    }
  }, [hasEveryoneAnswered, players.length, processRoundAnswers]);
  
  const handleSubmitAnswer = async () => {
    if (!currentPlayer || !answer.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await submitAnswer(currentPlayer.id, answer.trim());
      setAnswer("");
      
      // Notify other players via WebSocket
      if (gameId) {
        webSocket.sendGameUpdate(gameId, {
          action: 'answer_submitted',
          playerId: currentPlayer.id,
          playerName: currentPlayer.name
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // If game or current question isn't loaded yet, show loading state
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
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold font-sans text-gray-900">
              Round <span>{currentRound}</span>/<span>{totalRounds}</span>
            </h2>
            
            <TimerCircle 
              seconds={timerSeconds} 
              isRunning={isTimerRunning} 
              maxTime={30}
            />
          </div>
          
          <div className="bg-indigo-50 p-5 rounded-xl mb-8">
            <h3 className="text-2xl font-semibold font-sans text-primary mb-2">
              {currentQuestion.text}
            </h3>
          </div>
          
          {/* Current Player Input */}
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-3">
              {currentPlayer && (
                <>
                  <PlayerAvatar 
                    number={currentPlayer.order} 
                    color={currentPlayer.color} 
                  />
                  <h3 className="font-medium text-gray-900 font-sans">
                    {currentPlayer.name}
                  </h3>
                </>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder="Enter your answer..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmitAnswer();
                }}
                className="flex-1 p-3 border rounded-lg font-sans"
              />
              <Button 
                onClick={handleSubmitAnswer}
                disabled={!answer.trim()}
                className="bg-primary hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg"
              >
                Submit
              </Button>
            </div>
          </div>
          
          {/* Player Progress */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2 font-sans">Player Progress</h4>
            <div className="grid grid-cols-2 gap-3">
              {players.map((player) => (
                <div 
                  key={player.id} 
                  className="flex items-center p-2 rounded-lg bg-gray-100"
                >
                  <PlayerAvatar 
                    number={player.order} 
                    color={player.color} 
                    size="sm"
                  />
                  <span className="text-sm font-medium font-sans ml-2">
                    {player.name}
                  </span>
                  <span className="ml-auto">
                    {player.hasSubmitted ? '✓' : '...'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
