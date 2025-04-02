import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Search, Settings, Wand2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export default function QuickActions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Mutation for syncing files
  const syncMutation = useMutation({
    mutationFn: (source: string) => 
      apiRequest('POST', '/api/system/scan', { source }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/files/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/system/status'] });
      toast({
        title: 'Sync complete',
        description: 'Your files have been successfully synced.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Sync failed',
        description: `Error: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Handler for running the AI assistant
  const handleRunAi = () => {
    toast({
      title: 'AI Assistant',
      description: 'Analyzing your files and generating recommendations...',
    });
    
    // Simulate AI analysis completion
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
      toast({
        title: 'Analysis Complete',
        description: 'Your file recommendations are ready to view.',
      });
    }, 2000);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="flex flex-col items-center justify-center p-4 h-auto gap-2"
            onClick={() => {
              toast({
                title: 'Add Source',
                description: 'This feature will be available soon!',
              });
            }}
          >
            <Plus className="h-5 w-5 text-secondary" />
            <span className="text-sm">Add Source</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex flex-col items-center justify-center p-4 h-auto gap-2"
            onClick={() => syncMutation.mutate('local')}
            disabled={syncMutation.isPending}
          >
            <RefreshCw className={`h-5 w-5 text-secondary ${
              syncMutation.isPending ? 'animate-spin' : ''
            }`} />
            <span className="text-sm">
              {syncMutation.isPending ? 'Syncing...' : 'Sync Now'}
            </span>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex flex-col items-center justify-center p-4 h-auto gap-2"
            onClick={() => {
              toast({
                title: 'Find Files',
                description: 'Advanced file search coming soon!',
              });
            }}
          >
            <Search className="h-5 w-5 text-secondary" />
            <span className="text-sm">Find Files</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="flex flex-col items-center justify-center p-4 h-auto gap-2"
            onClick={() => {
              toast({
                title: 'Settings',
                description: 'System settings panel coming soon!',
              });
            }}
          >
            <Settings className="h-5 w-5 text-secondary" />
            <span className="text-sm">Settings</span>
          </Button>
        </div>
        
        <div className="mt-4">
          <Button 
            className="w-full py-2 gap-2"
            onClick={handleRunAi}
          >
            <Wand2 className="h-5 w-5" />
            <span>Run AI assistant</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
