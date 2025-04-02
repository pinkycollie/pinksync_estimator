import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { SiNotion, SiDropbox, SiGoogledrive, SiEvernote } from 'react-icons/si';
import { useState } from 'react';

export default function Integrations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedIntegration, setSelectedIntegration] = useState("");
  
  // Query to get integrations
  const { data: integrations, isLoading } = useQuery({
    queryKey: ['/api/integrations'],
  });

  // Mutation to add a new integration
  const addIntegrationMutation = useMutation({
    mutationFn: (data: { name: string; type: string; isConnected: boolean; config: object }) => 
      apiRequest('POST', '/api/integrations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/integrations'] });
      toast({
        title: 'Integration added',
        description: 'The integration has been successfully added.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to add integration',
        description: `Error: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Sample integration data when no real data is available
  const sampleIntegrations = [
    {
      id: 1,
      name: "Notion",
      type: "notion",
      isConnected: true,
      metadata: { workspaces: 3 }
    },
    {
      id: 2,
      name: "Google Drive",
      type: "google_drive",
      isConnected: true,
      metadata: { files: 325 }
    },
    {
      id: 3,
      name: "Dropbox",
      type: "dropbox",
      isConnected: false
    },
    {
      id: 4,
      name: "Anytype",
      type: "anytype",
      isConnected: false
    }
  ];

  // Handle connecting an integration
  const handleConnect = (integration: any) => {
    if (!integration.isConnected) {
      toast({
        title: `Connect ${integration.name}`,
        description: `${integration.name} integration is coming soon!`,
      });
    }
  };

  // Handle adding a new integration
  const handleAddIntegration = () => {
    if (!selectedIntegration) {
      toast({
        title: 'Error',
        description: 'Please select an integration to add',
        variant: 'destructive',
      });
      return;
    }

    const integrationTypes: Record<string, string> = {
      "notion": "Notion",
      "google_drive": "Google Drive",
      "dropbox": "Dropbox",
      "anytype": "Anytype"
    };

    addIntegrationMutation.mutate({
      name: integrationTypes[selectedIntegration],
      type: selectedIntegration,
      isConnected: false,
      config: {}
    });
  };

  // Get integration icon
  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'notion':
        return <div className="w-10 h-10 rounded bg-black flex items-center justify-center text-white">
          <SiNotion className="h-5 w-5" />
        </div>;
      case 'google_drive':
        return <div className="w-10 h-10 rounded bg-green-500 flex items-center justify-center text-white">
          <SiGoogledrive className="h-5 w-5" />
        </div>;
      case 'dropbox':
        return <div className="w-10 h-10 rounded bg-blue-500 flex items-center justify-center text-white">
          <SiDropbox className="h-5 w-5" />
        </div>;
      case 'anytype':
        return <div className="w-10 h-10 rounded bg-purple-500 flex items-center justify-center text-white">
          <SiEvernote className="h-5 w-5" />
        </div>;
      default:
        return <div className="w-10 h-10 rounded bg-gray-500 flex items-center justify-center text-white">
          <SiNotion className="h-5 w-5" />
        </div>;
    }
  };

  // Get metadata display text
  const getMetadataText = (integration: any) => {
    if (!integration.isConnected) {
      return "Not connected";
    }
    
    if (integration.metadata?.workspaces) {
      return `Connected · ${integration.metadata.workspaces} workspaces`;
    }
    
    if (integration.metadata?.files) {
      return `Connected · ${integration.metadata.files} files`;
    }
    
    return "Connected";
  };

  // If loading, show skeleton
  if (isLoading) {
    return (
      <Card className="mt-6 mb-4">
        <CardHeader className="pb-2">
          <CardTitle>Connected Integrations</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayIntegrations = integrations?.length > 0 ? integrations : sampleIntegrations;

  return (
    <Card className="mt-6 mb-4">
      <CardHeader className="pb-2">
        <CardTitle>Connected Integrations</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayIntegrations.map((integration) => (
            <div 
              key={integration.id}
              className={`p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors ${
                !integration.isConnected ? 'opacity-60' : ''
              }`}
              onClick={() => handleConnect(integration)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {getIntegrationIcon(integration.type)}
                  <div className="ml-3">
                    <h3 className="font-medium">{integration.name}</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {getMetadataText(integration)}
                    </p>
                  </div>
                </div>
                {integration.isConnected ? (
                  <ChevronRight className="text-neutral-400" />
                ) : (
                  <Button size="sm" variant="secondary" className="text-xs">
                    Connect
                  </Button>
                )}
              </div>
            </div>
          ))}
          
          <Dialog>
            <DialogTrigger asChild>
              <div className="p-4 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-600 flex items-center justify-center cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                <div className="text-center">
                  <Plus className="mx-auto h-5 w-5 text-neutral-400 mb-1" />
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">Add Integration</span>
                </div>
              </div>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Integration</DialogTitle>
                <DialogDescription>
                  Connect to your favorite services to synchronize files and data.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="integration-type">Integration Type</Label>
                  <Select onValueChange={setSelectedIntegration}>
                    <SelectTrigger id="integration-type">
                      <SelectValue placeholder="Select integration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="notion">Notion</SelectItem>
                      <SelectItem value="google_drive">Google Drive</SelectItem>
                      <SelectItem value="dropbox">Dropbox</SelectItem>
                      <SelectItem value="anytype">Anytype</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="api-key">API Key (optional)</Label>
                  <Input id="api-key" placeholder="Your service API key" />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleAddIntegration}
                  disabled={addIntegrationMutation.isPending}
                >
                  {addIntegrationMutation.isPending ? 'Adding...' : 'Add Integration'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
        </div>
      </CardContent>
    </Card>
  );
}
