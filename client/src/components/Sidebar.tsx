import { useAppContext } from '@/contexts/AppContext';
import { Link, useLocation } from 'wouter';
import { BrainCog, FolderOpen, Home, Settings, ChevronRight, CheckSquare, LineChart, LogOut } from 'lucide-react';
import { SiNotion, SiDropbox, SiGoogledrive } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function Sidebar() {
  const { sidebarOpen } = useAppContext();
  const [location] = useLocation();
  const { toast } = useToast();
  const { user: authUser, isAuthenticated } = useAuth();
  
  // Fetch user info
  const { data: user } = useQuery({
    queryKey: ['/api/user'],
  });
  
  // Fetch integrations for the navigation items
  const { data: integrations } = useQuery({
    queryKey: ['/api/integrations'],
  });
  
  // Handle logout
  const handleLogout = () => {
    window.location.href = '/api/logout';
  };
  
  // Main navigation items
  const mainNavItems = [
    { icon: <Home className="h-5 w-5" />, label: 'Dashboard', path: '/' },
    { icon: <FolderOpen className="h-5 w-5" />, label: 'Files', path: '/files' },
    { icon: <CheckSquare className="h-5 w-5" />, label: 'Tasks', path: '/tasks' },
    { icon: <LineChart className="h-5 w-5" />, label: 'Analytics', path: '/analytics' },
  ];
  
  // Handle search keyboard shortcut
  const handleSearchKeydown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      toast({
        title: "Search",
        description: "Global search functionality coming soon!",
      });
    }
  };
  
  // If sidebar is closed, don't render
  if (!sidebarOpen) {
    return null;
  }
  
  return (
    <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 h-screen fixed z-20 transition-all duration-300">
      <div className="flex items-center p-4 h-16 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-white">
            <BrainCog className="h-5 w-5" />
          </div>
          <h1 className="font-bold text-lg">Pinky's AI OS</h1>
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-4 mb-4">
          <button 
            className="w-full flex items-center justify-between p-3 rounded-lg text-white bg-secondary hover:bg-opacity-90 transition-colors"
            onKeyDown={handleSearchKeydown}
            onClick={() => {
              toast({
                title: "Search",
                description: "Global search functionality coming soon!",
              });
            }}
          >
            <div className="flex items-center">
              <Search className="h-5 w-5 mr-3" />
              <span>Search Everything</span>
            </div>
            <span className="text-xs opacity-70">⌘K</span>
          </button>
        </div>
        
        <div className="px-3">
          <div className="text-neutral-500 dark:text-neutral-400 text-xs font-semibold uppercase tracking-wider px-3 mb-2">Main</div>
          <ul>
            {mainNavItems.map((item) => (
              <li className="mb-1" key={item.path}>
                <Link href={item.path}>
                  <a 
                    className={`flex items-center px-3 py-2 rounded-md ${
                      location === item.path 
                        ? 'text-foreground dark:text-darkText bg-neutral-100 dark:bg-neutral-700' 
                        : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    <span>{item.label}</span>
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="px-3 mt-6">
          <div className="text-neutral-500 dark:text-neutral-400 text-xs font-semibold uppercase tracking-wider px-3 mb-2">Integrations</div>
          <ul>
            <li className="mb-1">
              <Link href="/integrations/notion">
                <a className="flex items-center px-3 py-2 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                  <div className="w-5 h-5 mr-3 rounded bg-black flex items-center justify-center">
                    <SiNotion className="text-white text-sm" />
                  </div>
                  <span>Notion</span>
                </a>
              </Link>
            </li>
            <li className="mb-1">
              <Link href="/integrations/dropbox">
                <a className="flex items-center px-3 py-2 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                  <div className="w-5 h-5 mr-3 rounded bg-blue-500 flex items-center justify-center">
                    <SiDropbox className="text-white text-sm" />
                  </div>
                  <span>Dropbox</span>
                </a>
              </Link>
            </li>
            <li className="mb-1">
              <Link href="/integrations/google-drive">
                <a className="flex items-center px-3 py-2 rounded-md text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                  <div className="w-5 h-5 mr-3 rounded bg-green-500 flex items-center justify-center">
                    <SiGoogledrive className="text-white text-sm" />
                  </div>
                  <span>Google Drive</span>
                </a>
              </Link>
            </li>
          </ul>
        </div>
      </nav>
      
      <div className="border-t border-neutral-200 dark:border-neutral-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
              {authUser?.profile_image_url ? (
                <img 
                  src={authUser.profile_image_url} 
                  alt={authUser.username || "User"} 
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <span className="text-sm font-semibold">{authUser?.username?.substring(0, 2) || user?.displayName?.substring(0, 2) || 'PK'}</span>
              )}
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium">{authUser?.username || user?.displayName || 'User'}</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400">{authUser?.email || user?.email || ''}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Log out">
              <LogOut className="h-5 w-5" />
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Settings</DialogTitle>
                  <DialogDescription>
                    Adjust your personal preferences and integration settings.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input id="name" defaultValue={authUser?.username || user?.displayName || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" defaultValue={authUser?.email || user?.email || ''} />
                  </div>
                </div>
                <DialogFooter>
                  <Button>Save changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Search(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
