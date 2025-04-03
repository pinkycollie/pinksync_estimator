import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFoundPage from "@/pages/NotFoundPage";
import Dashboard from "@/pages/Dashboard";
import { AppProvider } from "./contexts/AppContext";
import { useAuth } from "./hooks/useAuth";
import { Button } from "@/components/ui/button";

// AuthWrapper component to handle authentication state
function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading authentication...</div>;
  }
  
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <h1 className="text-2xl font-bold">Welcome to Pinky's AI OS</h1>
        <p className="text-muted-foreground mb-4">A centralized AI-powered personal productivity hub</p>
        <Button 
          className="w-[200px]" 
          onClick={() => window.location.href = "/api/login"}
        >
          Log in with Replit
        </Button>
      </div>
    );
  }
  
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <AuthWrapper>
          <Router />
        </AuthWrapper>
        <Toaster />
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
