import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Cloud, Database, FileText, Folder, MessageSquare, LogIn, ArrowRight } from "lucide-react";

export default function Dashboard() {
  const { user, isLoading, isAuthenticated, login } = useAuth();

  const modules = [
    {
      title: "Platform Sync",
      description: "Manage file synchronization across multiple platforms",
      icon: <Cloud className="h-8 w-8 text-primary" />,
      href: "/sync",
      status: "Active"
    },
    {
      title: "Documents",
      description: "Organize documents with AI-powered version tracking",
      icon: <FileText className="h-8 w-8 text-primary" />,
      href: "/documents",
      status: "Coming Soon"
    },
    {
      title: "Local Files",
      description: "Browse and manage local file system with AI assistance",
      icon: <Folder className="h-8 w-8 text-primary" />,
      href: "/files",
      status: "Coming Soon"
    },
    {
      title: "Communication",
      description: "Track emails and messages with git-like versioning",
      icon: <MessageSquare className="h-8 w-8 text-primary" />,
      href: "/communication",
      status: "Coming Soon"
    },
    {
      title: "Database",
      description: "Manage your centralized productivity database",
      icon: <Database className="h-8 w-8 text-primary" />,
      href: "/database",
      status: "Coming Soon"
    }
  ];

  // Show loading state
  if (isLoading) {
    return (
      <div className="container py-10">
        <div className="flex flex-col gap-8">
          <div>
            <Skeleton className="h-10 w-64 mb-4" />
            <Skeleton className="h-4 w-80" />
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-8 w-8 rounded" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-5/6 mb-6" />
                  
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-8 w-24 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="container py-10">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Welcome to Pinky's AI OS</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Your AI-powered personal productivity hub for cross-platform file management, 
            document organization, and workflow automation.
          </p>
          
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Key Features</CardTitle>
              <CardDescription>Enhance your productivity with these powerful capabilities</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-left">
              <div className="flex items-start gap-2">
                <ArrowRight className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Multi-Platform Synchronization</p>
                  <p className="text-sm text-muted-foreground">Seamlessly sync files across Ubuntu, Windows, iOS, and cloud services</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">AI-Powered Document Management</p>
                  <p className="text-sm text-muted-foreground">Automatic categorization and version tracking with intelligent tagging</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Deaf-Centric Visual Workflows</p>
                  <p className="text-sm text-muted-foreground">Visual-centric interfaces with SignYapse API integration for accessibility</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Business Intelligence Tools</p>
                  <p className="text-sm text-muted-foreground">Opportunity scanning and real estate lifecycle tracking for entrepreneurs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Button size="lg" onClick={login} className="gap-2">
            <LogIn className="h-5 w-5" />
            Log in with Replit to Get Started
          </Button>
        </div>
      </div>
    );
  }

  // Authenticated dashboard view
  return (
    <div className="container py-10">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.username || "User"}!</h1>
          <p className="text-muted-foreground mt-2">
            Your AI-powered personal productivity hub
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <Card key={module.title} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xl">{module.title}</CardTitle>
                {module.icon}
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm text-muted-foreground mb-4">
                  {module.description}
                </CardDescription>
                
                <div className="flex justify-between items-center">
                  <span className={module.status === "Active" 
                    ? "text-sm font-medium text-green-500" 
                    : "text-sm font-medium text-amber-500"}>
                    {module.status}
                  </span>
                  
                  {module.status === "Active" ? (
                    <Button asChild>
                      <Link href={module.href}>
                        Open
                      </Link>
                    </Button>
                  ) : (
                    <Button disabled variant="outline">
                      Not Available
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}