import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [gameCode, setGameCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a game code",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await apiRequest(`/api/games/code/${gameCode.trim()}`, { method: 'GET' });
      if (response.ok) {
        const gameData = await response.json();
        setLocation(`/setup?gameId=${gameData.id}`);
      } else {
        toast({
          title: "Error",
          description: "Game not found. Please check the code and try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error joining game:", error);
      toast({
        title: "Error",
        description: "Failed to join game. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <section className="min-h-screen flex flex-col justify-center items-center p-4 text-center">
      <Card className="w-full max-w-md mx-auto shadow-lg rounded-2xl overflow-hidden">
        <CardContent className="p-8">
          <h1 className="text-4xl font-bold font-sans text-primary mb-3">Herd Mentality</h1>
          <p className="text-gray-900 mb-6 font-sans">Think like the herd to win!</p>
          
          <div className="mb-8">
            <svg className="w-full h-36 bg-indigo-50 rounded-lg mb-4 p-4" viewBox="0 0 100 80">
              <g transform="translate(10, 15)">
                <path d="M12,20 C17,20 20,15 20,10 C20,5 17,0 12,0 C7,0 4,5 4,10 C4,15 7,20 12,20 Z" fill="#E0E0E0" />
                <circle cx="12" cy="7" r="4" fill="#FFFFFF" />
              </g>
              <g transform="translate(25, 20)">
                <path d="M12,20 C17,20 20,15 20,10 C20,5 17,0 12,0 C7,0 4,5 4,10 C4,15 7,20 12,20 Z" fill="#E0E0E0" />
                <circle cx="12" cy="7" r="4" fill="#FFFFFF" />
              </g>
              <g transform="translate(40, 10)">
                <path d="M12,20 C17,20 20,15 20,10 C20,5 17,0 12,0 C7,0 4,5 4,10 C4,15 7,20 12,20 Z" fill="#E0E0E0" />
                <circle cx="12" cy="7" r="4" fill="#FFFFFF" />
              </g>
              <g transform="translate(55, 20)">
                <path d="M12,20 C17,20 20,15 20,10 C20,5 17,0 12,0 C7,0 4,5 4,10 C4,15 7,20 12,20 Z" fill="#E0E0E0" />
                <circle cx="12" cy="7" r="4" fill="#FFFFFF" />
              </g>
              <g transform="translate(70, 15)">
                <path d="M12,20 C17,20 20,15 20,10 C20,5 17,0 12,0 C7,0 4,5 4,10 C4,15 7,20 12,20 Z" fill="#6366F1" />
                <circle cx="12" cy="7" r="4" fill="#FFFFFF" />
              </g>
              <text x="50" y="65" textAnchor="middle" fontSize="6" fill="#666">The black sheep stands out from the herd!</text>
            </svg>
          </div>
          
          <Tabs defaultValue="create" className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create Game</TabsTrigger>
              <TabsTrigger value="join">Join Game</TabsTrigger>
            </TabsList>
            
            <TabsContent value="create" className="mt-4">
              <Button 
                onClick={() => setLocation('/setup')}
                className="bg-primary hover:bg-indigo-700 text-white py-3 px-6 rounded-full w-full transition duration-200 transform hover:scale-105 font-sans"
              >
                Create New Game
              </Button>
            </TabsContent>
            
            <TabsContent value="join" className="mt-4">
              <form onSubmit={handleJoinGame} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gameCode">Enter Game Code</Label>
                  <Input 
                    id="gameCode"
                    value={gameCode}
                    onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                    className="text-center tracking-widest uppercase"
                    placeholder="ENTER CODE"
                    maxLength={6}
                  />
                </div>
                <Button 
                  type="submit"
                  className="bg-primary hover:bg-indigo-700 text-white py-3 px-6 rounded-full w-full transition duration-200 transform hover:scale-105 font-sans"
                  disabled={isLoading}
                >
                  {isLoading ? "Joining..." : "Join Game"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          <div className="text-left mt-6">
            <h2 className="text-xl font-semibold font-sans text-gray-900 mb-3">How to Play:</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-900 font-sans text-sm">
              <li>Answer questions trying to match what most players will say</li>
              <li>Everyone submits answers within the time limit</li>
              <li>Get points when your answer matches the most common response</li>
              <li>The player with the least common answer (the "black sheep") loses a point</li>
              <li>The first player to reach 8 points wins!</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
