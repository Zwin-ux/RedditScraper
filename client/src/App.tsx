import { Switch, Route } from "wouter";
import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlobalChatbot } from "@/components/global-chatbot";
import Dashboard from "@/pages/dashboard";
import WorkflowBuilder from "@/pages/workflow-builder";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/workflow" component={WorkflowBuilder} />
      <Route path="/workflow-builder" component={WorkflowBuilder} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <GlobalChatbot 
          isOpen={isChatbotOpen} 
          onToggle={() => setIsChatbotOpen(!isChatbotOpen)} 
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
