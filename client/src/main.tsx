import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { GameProvider } from "./lib/gameContext";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <GameProvider>
      <App />
    </GameProvider>
  </QueryClientProvider>
);
