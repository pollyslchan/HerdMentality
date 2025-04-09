import React from 'react';
import { Switch, Route } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Toaster } from '@/components/ui/toaster';

import { GameProvider } from './lib/gameContext';
import HomePage from './pages/HomePage';
import SetupPage from './pages/SetupPage';
import QuestionPage from './pages/QuestionPage';
import ResultsPage from './pages/ResultsPage';
import FinalResultsPage from './pages/FinalResultsPage';
import NotFound from './pages/not-found';

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/setup" component={SetupPage} />
      <Route path="/question" component={QuestionPage} />
      <Route path="/results" component={ResultsPage} />
      <Route path="/final-results" component={FinalResultsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GameProvider>
        <Router />
        <Toaster />
      </GameProvider>
    </QueryClientProvider>
  );
}

export default App;
