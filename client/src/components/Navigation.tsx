import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, Home, Cloud, Database, FileText, Folder, MessageSquare, UserCircle, LogOut, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export function Navigation() {
  const [location] = useLocation();
  const { user, isLoading, isAuthenticated, login, logout } = useAuth();

  // Navigation items
  const navigationItems = [
    {
      title: "Dashboard",
      href: "/",
      icon: <Home className="h-5 w-5 mr-2" />,
    },
    {
      title: "Platform Sync",
      href: "/sync",
      icon: <Cloud className="h-5 w-5 mr-2" />,
    },
    {
      title: "Documents",
      href: "/documents",
      icon: <FileText className="h-5 w-5 mr-2" />,
    },
    {
      title: "Local Files",
      href: "/files",
      icon: <Folder className="h-5 w-5 mr-2" />,
    },
    {
      title: "Communication",
      href: "/communication",
      icon: <MessageSquare className="h-5 w-5 mr-2" />,
    },
    {
      title: "Database",
      href: "/database",
      icon: <Database className="h-5 w-5 mr-2" />,
    },
  ];

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-screen border-r bg-background">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold flex items-center">
            <span className="text-primary">Pinky's AI OS</span>
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-auto">
          {navigationItems.map((item, i) => (
            <Skeleton key={i} className="w-full h-10 rounded" />
          ))}
        </nav>
        
        <div className="p-4 border-t">
          <div className="flex items-center mb-4">
            <Skeleton className="h-8 w-8 rounded-full mr-2" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="w-full h-10 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen border-r bg-background">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold flex items-center">
          <span className="text-primary">Pinky's AI OS</span>
        </h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-auto">
        {navigationItems.map((item) => {
          const isActive = item.href === location || 
            (item.href !== "/" && location.startsWith(item.href));
            
          return (
            <Button
              key={item.href}
              variant={isActive ? "default" : "ghost"}
              className={`w-full justify-start ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              asChild
            >
              <Link href={item.href} className="flex items-center">
                {item.icon}
                {item.title}
              </Link>
            </Button>
          );
        })}
      </nav>
      
      <div className="p-4 border-t">
        {isAuthenticated ? (
          <>
            <div className="flex items-center mb-4">
              <Avatar className="h-8 w-8 mr-2">
                {user?.profile_image_url && (
                  <AvatarImage src={user.profile_image_url} alt={user.username || 'User'} />
                )}
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.username?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user?.username || "User"}</p>
                <p className="text-xs text-muted-foreground">{user?.email || ""}</p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={logout}
            >
              <LogOut className="h-5 w-5 mr-2" />
              Log Out
            </Button>
          </>
        ) : (
          <Button 
            variant="default" 
            className="w-full justify-start"
            onClick={login}
          >
            <LogIn className="h-5 w-5 mr-2" />
            Log in with Replit
          </Button>
        )}
      </div>
    </div>
  );
}

export default Navigation;