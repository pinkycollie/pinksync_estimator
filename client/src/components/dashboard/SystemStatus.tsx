import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { RotateCw, Database } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

interface SystemStatusData {
  lastSync?: string;
  fileAnalysis?: {
    processed: number;
    total: number;
    categories: Array<{
      category: string;
      count: number;
    }>;
  };
  sources?: {
    local?: {
      status: string;
      fileCount: number;
    };
    google_drive?: {
      status: string;
      fileCount: number;
    };
    notion?: {
      status: string;
    };
  };
}

export default function SystemStatus() {
  const { data: systemStatus, isLoading } = useQuery<SystemStatusData>({
    queryKey: ['/api/system/status'],
  });

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="ml-4 space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex items-center">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="ml-4 space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  // Extract file analysis data
  const processedPercentage = systemStatus?.fileAnalysis
    ? Math.round((systemStatus.fileAnalysis.processed / systemStatus.fileAnalysis.total) * 100) || 0
    : 0;

  // Format categories for display
  const categories = systemStatus?.fileAnalysis?.categories || [];
  const totalFiles = categories.reduce((sum: number, cat: { category: string; count: number }) => sum + cat.count, 0) || 0;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle>System Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-accent">
                <RotateCw className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="font-medium">Synchronization</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Last sync: {systemStatus?.lastSync 
                    ? formatTimeAgo(systemStatus.lastSync) 
                    : 'Never'}
                </p>
              </div>
              <div className="ml-auto">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <span className="w-2 h-2 mr-1 rounded-full bg-accent"></span>
                  Active
                </span>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center">
                <span className={`w-2 h-2 rounded-full mr-2 ${
                  systemStatus?.sources?.local?.status === 'connected' 
                    ? 'bg-accent' 
                    : 'bg-red-500'
                }`}></span>
                <span>Local Files</span>
                <span className="ml-auto text-neutral-500 dark:text-neutral-400">
                  {systemStatus?.sources?.local?.fileCount || 0} files
                </span>
              </div>
              <div className="flex items-center">
                <span className={`w-2 h-2 rounded-full mr-2 ${
                  systemStatus?.sources?.google_drive?.status === 'connected' 
                    ? 'bg-accent' 
                    : 'bg-red-500'
                }`}></span>
                <span>Google Drive</span>
                <span className="ml-auto text-neutral-500 dark:text-neutral-400">
                  {systemStatus?.sources?.google_drive?.fileCount || 0} files
                </span>
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                <span>Dropbox</span>
                <span className="ml-auto text-neutral-500 dark:text-neutral-400">
                  Not connected
                </span>
              </div>
              <div className="flex items-center">
                <span className={`w-2 h-2 rounded-full mr-2 ${
                  systemStatus?.sources?.notion?.status === 'connected' 
                    ? 'bg-yellow-500' 
                    : 'bg-red-500'
                }`}></span>
                <span>Notion</span>
                <span className="ml-auto text-neutral-500 dark:text-neutral-400">
                  {systemStatus?.sources?.notion?.status === 'connected' 
                    ? 'Syncing...' 
                    : 'Not connected'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-secondary">
                <Database className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="font-medium">File Analysis</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {systemStatus?.fileAnalysis?.processed || 0} files processed
                </p>
              </div>
              <div className="ml-auto">
                <button className="text-secondary hover:text-opacity-80 text-sm font-medium">View Details</button>
              </div>
            </div>
            
            <div className="mt-4">
              <Progress value={processedPercentage} className="h-2" />
            </div>
            
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
              {categories.map((category: { category: string; count: number }, index: number) => {
                const colors = [
                  'bg-secondary',
                  'bg-accent',
                  'bg-purple-500',
                  'bg-yellow-500'
                ];
                const percentage = totalFiles > 0 
                  ? Math.round((category.count / totalFiles) * 100) 
                  : 0;
                
                return (
                  <div className="flex items-center" key={category.category}>
                    <span className={`w-3 h-3 rounded-sm ${colors[index % colors.length]} mr-2`}></span>
                    <span className="capitalize">{category.category}</span>
                    <span className="ml-auto text-neutral-500 dark:text-neutral-400">{percentage}%</span>
                  </div>
                );
              })}
              
              {categories.length === 0 && (
                <div className="col-span-2 text-center text-neutral-500">
                  No file categories available
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
