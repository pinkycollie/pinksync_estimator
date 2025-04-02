import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wand2, Bell, Users, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function AIRecommendations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query to get active recommendations
  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['/api/recommendations', { active: true }],
  });

  // Mutation to dismiss a recommendation
  const dismissMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest('PATCH', `/api/recommendations/${id}`, { isDismissed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
      toast({
        title: 'Recommendation dismissed',
        description: 'The recommendation has been removed from your list.',
      });
    }
  });

  // Mutation for applying a recommendation
  const applyMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest('PATCH', `/api/recommendations/${id}`, { isApplied: true, isDismissed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
      queryClient.invalidateQueries({ queryKey: ['/api/system/status'] });
      toast({
        title: 'Recommendation applied',
        description: 'The recommended action has been successfully applied.',
      });
    }
  });

  // Get icon based on recommendation type
  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'file_organization':
        return <Wand2 className="h-5 w-5 text-secondary" />;
      case 'content_update':
        return <Bell className="h-5 w-5 text-accent" />;
      case 'integration_suggestion':
        return <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
      default:
        return <Wand2 className="h-5 w-5 text-secondary" />;
    }
  };

  // Load dummy data if no recommendations are available
  const dummyRecommendations = [
    {
      id: 1,
      title: 'Organize your code files',
      description: 'I noticed 43 Python files across different folders. Would you like me to organize them into a structured project?',
      type: 'file_organization',
    },
    {
      id: 2,
      title: 'Update your research notes',
      description: 'Your "AI Research" Notion page hasn\'t been updated in 2 weeks, but related files have changed. Sync now?',
      type: 'content_update',
    },
    {
      id: 3,
      title: 'Connect to Dropbox',
      description: 'Adding Dropbox would complete your file ecosystem and enable cross-platform synchronization.',
      type: 'integration_suggestion',
    }
  ];

  const displayRecommendations = recommendations?.length > 0 
    ? recommendations 
    : dummyRecommendations;

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle>AI Recommendations</CardTitle>
          </div>
          <Button variant="link" size="sm" className="text-secondary">
            View All
          </Button>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <div className="flex items-start">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="ml-4 flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <div className="flex space-x-2 pt-2">
                      <Skeleton className="h-8 w-16" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle>AI Recommendations</CardTitle>
        </div>
        <Button variant="link" size="sm" className="text-secondary">
          View All
        </Button>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-4">
          {displayRecommendations.map((recommendation) => (
            <div 
              key={recommendation.id} 
              className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700"
            >
              <div className="flex items-start">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                  {getRecommendationIcon(recommendation.type)}
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="font-medium">{recommendation.title}</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    {recommendation.description}
                  </p>
                  <div className="mt-3 flex space-x-2">
                    <Button 
                      size="sm" 
                      className={
                        recommendation.type === 'content_update' 
                          ? 'bg-accent hover:bg-accent/90' 
                          : recommendation.type === 'integration_suggestion'
                            ? 'bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800'
                            : ''
                      }
                      onClick={() => applyMutation.mutate(recommendation.id)}
                    >
                      {recommendation.type === 'content_update' 
                        ? 'Sync Now' 
                        : recommendation.type === 'integration_suggestion'
                          ? 'Connect'
                          : 'Apply'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => dismissMutation.mutate(recommendation.id)}
                    >
                      {recommendation.type === 'integration_suggestion' ? 'Later' : 'Dismiss'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {displayRecommendations.length === 0 && (
            <div className="p-8 text-center">
              <Wand2 className="h-10 w-10 text-neutral-400 mx-auto mb-4" />
              <h3 className="font-medium text-lg mb-1">No recommendations yet</h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                Scan your files to get AI-powered recommendations
              </p>
              <Button>Run AI Analysis</Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
