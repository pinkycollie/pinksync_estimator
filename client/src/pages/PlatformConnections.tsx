import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, RefreshCw, Plus, Trash2, ArrowLeftRight, TestTube } from 'lucide-react';

// Schema for platform connection form
const platformConnectionSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  platform: z.enum(['DROPBOX', 'IOS', 'UBUNTU', 'WINDOWS', 'WEB']),
  rootPath: z.string().min(1, { message: 'Root path is required' }),
  credentials: z.record(z.string(), z.any()),
  syncDirection: z.enum(['UPLOAD', 'DOWNLOAD', 'BIDIRECTIONAL']).optional(),
  syncInterval: z.number().int().min(0).optional(),
  syncOnStartup: z.boolean().optional().default(false),
  syncOnSchedule: z.boolean().optional().default(false),
  isEnabled: z.boolean().optional().default(true),
  metadata: z.record(z.string(), z.any()).optional(),
});

type PlatformConnectionFormValues = z.infer<typeof platformConnectionSchema>;

// Component for platform connections page
export function PlatformConnections() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to fetch platform connections
  const { data: connections, isLoading, error } = useQuery({
    queryKey: ['/api/sync/connections'],
  });

  // Query to fetch platform types
  const { data: platformTypes = [] } = useQuery({
    queryKey: ['/api/sync/platform-types'],
  });

  // Query to fetch sync directions
  const { data: syncDirections = [] } = useQuery({
    queryKey: ['/api/sync/sync-directions'],
  });

  // Mutation to create a new platform connection
  const createMutation = useMutation({
    mutationFn: (values: PlatformConnectionFormValues) => 
      apiRequest('/api/sync/connections', { method: 'POST', body: values }),
    onSuccess: () => {
      toast({
        title: 'Connection created',
        description: 'The platform connection was created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sync/connections'] });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create connection: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Mutation to delete a platform connection
  const deleteMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest(`/api/sync/connections/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast({
        title: 'Connection deleted',
        description: 'The platform connection was deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sync/connections'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete connection: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Mutation to test a platform connection
  const testMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest(`/api/sync/connections/${id}/test`, { method: 'POST' }),
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Connection test passed',
          description: 'The platform connection test was successful',
        });
      } else {
        toast({
          title: 'Connection test failed',
          description: 'The platform connection test failed',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to test connection: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Mutation to sync a platform connection
  const syncMutation = useMutation({
    mutationFn: (id: string) => 
      apiRequest(`/api/sync/connections/${id}/sync`, { method: 'POST' }),
    onSuccess: () => {
      toast({
        title: 'Sync started',
        description: 'The synchronization has been started',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to start sync: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Form for creating a new platform connection
  const form = useForm<PlatformConnectionFormValues>({
    resolver: zodResolver(platformConnectionSchema),
    defaultValues: {
      name: '',
      platform: 'DROPBOX',
      rootPath: '/',
      credentials: {},
      syncDirection: 'BIDIRECTIONAL',
      syncOnStartup: false,
      syncOnSchedule: false,
      isEnabled: true,
    },
  });

  // Handle form submission
  const onSubmit = (values: PlatformConnectionFormValues) => {
    // Process credentials based on platform type
    let processedCredentials = {};
    
    switch (values.platform) {
      case 'DROPBOX':
        processedCredentials = {
          apiKey: values.credentials.apiKey,
        };
        break;
      case 'IOS':
        processedCredentials = {
          username: values.credentials.username,
          password: values.credentials.password,
          server: values.credentials.server,
        };
        break;
      case 'UBUNTU':
      case 'WINDOWS':
        processedCredentials = {
          host: values.credentials.host,
          port: values.credentials.port,
          username: values.credentials.username,
          password: values.credentials.password,
        };
        break;
      case 'WEB':
        processedCredentials = {
          url: values.credentials.url,
          apiKey: values.credentials.apiKey,
        };
        break;
    }
    
    // Submit the form with processed credentials
    createMutation.mutate({
      ...values,
      credentials: processedCredentials,
    });
  };

  // Handle dialog open/close
  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      form.reset();
    }
  };

  // Render credential fields based on platform type
  const renderCredentialFields = () => {
    const platform = form.watch('platform');
    
    switch (platform) {
      case 'DROPBOX':
        return (
          <FormField
            control={form.control}
            name="credentials.apiKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>API Key</FormLabel>
                <FormControl>
                  <Input placeholder="Enter Dropbox API key" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
        
      case 'IOS':
        return (
          <>
            <FormField
              control={form.control}
              name="credentials.server"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WebDAV Server</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/dav" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="credentials.username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="credentials.password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
        
      case 'UBUNTU':
      case 'WINDOWS':
        return (
          <>
            <FormField
              control={form.control}
              name="credentials.host"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Host</FormLabel>
                  <FormControl>
                    <Input placeholder="example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="credentials.port"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Port</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="22" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="credentials.username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="credentials.password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
        
      case 'WEB':
        return (
          <>
            <FormField
              control={form.control}
              name="credentials.url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://api.example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="credentials.apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter API key" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
        
      default:
        return null;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Loading platform connections...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold text-red-500">Error loading platform connections</h1>
        <p className="text-gray-500">{(error as Error).message}</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/sync/connections'] })}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Platform Connections</h1>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Connection
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add New Platform Connection</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Connection" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="platform"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Platform</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a platform" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {platformTypes.map((type: string) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="rootPath"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Root Path</FormLabel>
                      <FormControl>
                        <Input placeholder="/path/to/sync" {...field} />
                      </FormControl>
                      <FormDescription>
                        The base directory path to synchronize
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="syncDirection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sync Direction</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select direction" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {syncDirections.map((direction: string) => (
                            <SelectItem key={direction} value={direction}>
                              {direction}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="syncInterval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sync Interval (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={event => field.onChange(Number(event.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        0 or empty for manual sync only
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="syncOnStartup"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg">
                        <div>
                          <FormLabel>Sync On Startup</FormLabel>
                          <FormDescription>
                            Sync when the system starts
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="syncOnSchedule"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg">
                        <div>
                          <FormLabel>Sync On Schedule</FormLabel>
                          <FormDescription>
                            Enable scheduled syncing
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="isEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg">
                      <div>
                        <FormLabel>Enabled</FormLabel>
                        <FormDescription>
                          Enable or disable this connection
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="border p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Credentials</h3>
                  {renderCredentialFields()}
                </div>
                
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" type="button">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Connection
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {connections?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <ArrowLeftRight className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">No platform connections yet</h2>
          <p className="text-muted-foreground max-w-md mt-2 mb-6">
            Add a platform connection to start syncing your files across different platforms.
          </p>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Connection
            </Button>
          </DialogTrigger>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {connections?.map((connection: any) => (
            <Card key={connection.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex justify-between">
                  <CardTitle>{connection.name}</CardTitle>
                  <Badge variant={connection.isEnabled ? "default" : "outline"}>
                    {connection.isEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <CardDescription>{connection.rootPath}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Platform:</span>
                    <span className="font-medium">{connection.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Sync Direction:</span>
                    <Badge variant="secondary">{connection.syncDirection}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Last Sync:</span>
                    <span>{connection.lastSyncDate ? new Date(connection.lastSyncDate).toLocaleString() : 'Never'}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testMutation.mutate(connection.id)}
                    disabled={testMutation.isPending && selectedConnectionId === connection.id}
                  >
                    {testMutation.isPending && selectedConnectionId === connection.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <TestTube className="h-4 w-4 mr-1" />
                    )}
                    Test
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      setSelectedConnectionId(connection.id);
                      syncMutation.mutate(connection.id);
                    }}
                    disabled={syncMutation.isPending && selectedConnectionId === connection.id}
                  >
                    {syncMutation.isPending && selectedConnectionId === connection.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-1" />
                    )}
                    Sync
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this connection?')) {
                      setSelectedConnectionId(connection.id);
                      deleteMutation.mutate(connection.id);
                    }
                  }}
                  disabled={deleteMutation.isPending && selectedConnectionId === connection.id}
                >
                  {deleteMutation.isPending && selectedConnectionId === connection.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default PlatformConnections;