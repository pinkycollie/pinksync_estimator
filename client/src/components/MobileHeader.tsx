import { useAppContext } from '@/contexts/AppContext';
import ThemeToggle from './ThemeToggle';
import { Button } from '@/components/ui/button';
import { Menu, Search } from 'lucide-react';

export default function MobileHeader() {
  const { toggleSidebar } = useAppContext();

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 z-10 flex items-center justify-between px-4">
      <div className="flex items-center space-x-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-white">
            <span className="material-icons text-sm">hub</span>
          </div>
          <h1 className="font-bold">Pinky's AI OS</h1>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" aria-label="Search">
          <Search className="h-5 w-5" />
        </Button>
        <ThemeToggle />
      </div>
    </div>
  );
}
