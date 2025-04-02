import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '@/components/Sidebar';
import MobileHeader from '@/components/MobileHeader';
import SystemStatus from '@/components/dashboard/SystemStatus';
import QuickActions from '@/components/dashboard/QuickActions';
import AIRecommendations from '@/components/dashboard/AIRecommendations';
import RecentFiles from '@/components/dashboard/RecentFiles';
import Integrations from '@/components/dashboard/Integrations';
import ThemeToggle from '@/components/ThemeToggle';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { queryClient } from '@/lib/queryClient';

export default function Dashboard() {
  const { sidebarOpen } = useAppContext();
  
  // Pre-fetch data for the dashboard
  useEffect(() => {
    queryClient.prefetchQuery({ queryKey: ['/api/system/status'] });
    queryClient.prefetchQuery({ queryKey: ['/api/files/recent'] });
    queryClient.prefetchQuery({ queryKey: ['/api/recommendations', { active: true }] });
    queryClient.prefetchQuery({ queryKey: ['/api/integrations'] });
  }, []);
  
  // Fetch user data
  const { data: user } = useQuery({
    queryKey: ['/api/user'],
  });

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <MobileHeader />
      
      <main className={`flex-1 overflow-y-auto bg-background dark:bg-darkBg md:pt-0 pt-16 transition-all ${
        sidebarOpen ? 'md:ml-64' : 'ml-0'
      }`}>
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1">Your personal command center</p>
            </div>
            
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                <Input 
                  type="text" 
                  placeholder="Search..." 
                  className="w-full md:w-64 pl-10 pr-4 py-2"
                />
              </div>
              
              <div className="hidden md:block">
                <ThemeToggle />
              </div>
            </div>
          </div>
          
          {/* System Status */}
          <SystemStatus />
          
          {/* Quick Actions and AI Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <QuickActions />
            </div>
            <div className="lg:col-span-2">
              <AIRecommendations />
            </div>
          </div>
          
          {/* Recent Files */}
          <RecentFiles />
          
          {/* Integration Status */}
          <Integrations />
        </div>
      </main>
    </div>
  );
}
