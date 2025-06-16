import { Switch, Route } from "wouter";
import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlobalChatbot } from "@/components/global-chatbot";
import Dashboard from "@/pages/dashboard";
import WorkflowBuilder from "@/pages/workflow-builder";
import DataScienceAnalyzer from "@/pages/data-science-analyzer";
import EnhancedSearch from "@/pages/enhanced-search";
import CreatorAnalytics from "@/pages/creator-analytics";
import TrendsAnalysis from "@/pages/trends-analysis";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/workflow" component={WorkflowBuilder} />
      <Route path="/workflow-builder" component={WorkflowBuilder} />
      <Route path="/data-science" component={DataScienceAnalyzer} />
      <Route path="/enhanced-search" component={EnhancedSearch} />
      <Route path="/analytics" component={CreatorAnalytics} />
      <Route path="/trends" component={TrendsAnalysis} />
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
