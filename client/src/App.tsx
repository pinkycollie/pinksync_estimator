import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFoundPage from "@/pages/NotFoundPage";
import Dashboard from "@/pages/Dashboard";
import PlatformConnections from "@/pages/PlatformConnections";
import Estimator from "@/pages/Estimator";
import { AppProvider } from "./contexts/AppContext";
import Layout from "@/components/Layout";
import { useAuth } from "./hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

function ProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="container py-10">
        <div className="flex flex-col gap-8">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-4 w-80" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      </div>
    );
  }
  
  // Redirect handled by the component itself
  return <Component />;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/estimator" component={Estimator} />
        <Route path="/sync">
          <ProtectedRoute component={PlatformConnections} />
        </Route>
        <Route path="/documents">
          <ProtectedRoute component={() => <div className="container py-10"><h1 className="text-3xl font-bold">Documents</h1><p className="text-muted-foreground mt-2">Coming soon</p></div>} />
        </Route>
        <Route path="/files">
          <ProtectedRoute component={() => <div className="container py-10"><h1 className="text-3xl font-bold">Local Files</h1><p className="text-muted-foreground mt-2">Coming soon</p></div>} />
        </Route>
        <Route path="/communication">
          <ProtectedRoute component={() => <div className="container py-10"><h1 className="text-3xl font-bold">Communication</h1><p className="text-muted-foreground mt-2">Coming soon</p></div>} />
        </Route>
        <Route path="/database">
          <ProtectedRoute component={() => <div className="container py-10"><h1 className="text-3xl font-bold">Database</h1><p className="text-muted-foreground mt-2">Coming soon</p></div>} />
        </Route>
        <Route component={NotFoundPage} />
      </Switch>
    </Layout>
  );
}

function App() {
  const { isLoading } = useAuth();
  
  // Show minimal loading screen only during initial auth load
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        <p className="text-muted-foreground">Loading application...</p>
      </div>
    );
  }
  
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <Router />
        <Toaster />
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
