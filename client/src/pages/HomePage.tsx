import React from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const [, setLocation] = useLocation();
  
  return (
    <section className="min-h-screen flex flex-col justify-center items-center p-4 text-center">
      <Card className="w-full max-w-md mx-auto shadow-lg rounded-2xl overflow-hidden">
        <CardContent className="p-8">
          <h1 className="text-4xl font-bold font-sans text-primary mb-3">Herd Mentality</h1>
          <p className="text-gray-900 mb-8 font-sans">Think like the herd to win!</p>
          
          <div className="mb-8">
            <svg className="w-full h-48 bg-indigo-50 rounded-lg mb-4 p-4" viewBox="0 0 100 80">
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
          
          <Button 
            onClick={() => setLocation('/setup')}
            className="bg-primary hover:bg-indigo-700 text-white py-3 px-6 rounded-full w-full mb-6 transition duration-200 transform hover:scale-105 font-sans"
          >
            Start Game
          </Button>
          
          <div className="text-left">
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
