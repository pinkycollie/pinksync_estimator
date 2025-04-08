import { Switch, Route } from "wouter";
import { queryClient, getBaseUrl } from "./lib/queryClient";
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
  
  // Handle login redirect with custom domain support
  const handleLogin = () => {
    const loginUrl = `${getBaseUrl()}/api/login`;
    window.location.href = loginUrl;
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground">Loading authentication...</p>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="text-center max-w-md px-4">
          <h1 className="text-3xl font-bold mb-2">Welcome to Pinky's AI OS</h1>
          <p className="text-muted-foreground mb-6">A centralized AI-powered personal productivity hub</p>
          <p className="text-sm text-muted-foreground mb-6">
            Using secure domain: <span className="font-mono text-primary">pinkyaihub.mbtquniverse.com</span>
          </p>
          <Button 
            className="w-[200px] py-6 text-lg" 
            onClick={handleLogin}
          >
            Log in with Replit
          </Button>
        </div>
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
