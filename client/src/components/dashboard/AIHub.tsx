import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Code2, FileText, GitBranch, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Type definitions
type Pipeline = {
  id: string;
  name: string;
  description: string;
  inputType: string;
  outputType: string;
  stepCount: number;
};

type PipelineExecutionResult = {
  success: boolean;
  result: {
    pipelineId: string;
    startTime: string;
    endTime: string;
    duration: number;
    outputPath?: string;
    outputType?: string;
    error?: string;
    logs: string[];
  };
};

export default function AIHub() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('text-analysis');
  const [textInput, setTextInput] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [executionResult, setExecutionResult] = useState<PipelineExecutionResult | null>(null);

  // Fetch all available pipelines
  const { data: pipelinesData, isLoading: isPipelinesLoading } = useQuery<{ pipelines: Pipeline[] }>({
    queryKey: ['/api/pipeline'],
  });
  
  const pipelines: Pipeline[] = pipelinesData?.pipelines || [];
  
  // Get the active pipeline info
  const activePipeline = pipelines.find(p => p.id === activeTab);

  // Execute pipeline with text input
  const executeTextMutation = useMutation<
    PipelineExecutionResult, 
    Error, 
    { pipelineId: string; text: string }
  >({
    mutationFn: async (variables) => {
      return apiRequest<PipelineExecutionResult>('/api/pipeline/execute/text', {
        method: 'POST',
        body: JSON.stringify(variables),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: (data) => {
      setExecutionResult(data);
      toast({
        title: "Pipeline executed",
        description: data.success 
          ? "Pipeline executed successfully" 
          : `Pipeline execution failed: ${data.result.error}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to execute pipeline: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Execute pipeline with JSON input
  const executeJsonMutation = useMutation<
    PipelineExecutionResult, 
    Error, 
    { pipelineId: string; data: any }
  >({
    mutationFn: async (variables) => {
      return apiRequest<PipelineExecutionResult>('/api/pipeline/execute/json', {
        method: 'POST',
        body: JSON.stringify(variables),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    },
    onSuccess: (data) => {
      setExecutionResult(data);
      toast({
        title: "Pipeline executed",
        description: data.success 
          ? "Pipeline executed successfully" 
          : `Pipeline execution failed: ${data.result.error}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to execute pipeline: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Execute pipeline with file input
  const executeFileMutation = useMutation<
    PipelineExecutionResult, 
    Error, 
    { pipelineId: string; file: File }
  >({
    mutationFn: async (variables) => {
      const formData = new FormData();
      formData.append('pipelineId', variables.pipelineId);
      formData.append('file', variables.file);
      
      return apiRequest<PipelineExecutionResult>('/api/pipeline/execute/file', {
        method: 'POST',
        body: formData,
        // Let the browser set the content-type for FormData
      });
    },
    onSuccess: (data) => {
      setExecutionResult(data);
      toast({
        title: "Pipeline executed",
        description: data.success 
          ? "Pipeline executed successfully" 
          : `Pipeline execution failed: ${data.result.error}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to execute pipeline: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submits
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter some text to process",
        variant: "destructive",
      });
      return;
    }
    
    executeTextMutation.mutate({ 
      pipelineId: activeTab, 
      text: textInput 
    });
  };
  
  const handleJsonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const jsonData = JSON.parse(jsonInput);
      executeJsonMutation.mutate({ 
        pipelineId: activeTab, 
        data: jsonData 
      });
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please enter valid JSON data",
        variant: "destructive",
      });
    }
  };
  
  const handleFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file to process",
        variant: "destructive",
      });
      return;
    }
    
    executeFileMutation.mutate({ 
      pipelineId: activeTab, 
      file: selectedFile 
    });
  };
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Pipeline icon mapping
  const getPipelineIcon = (id: string) => {
    switch (id) {
      case 'text-analysis':
        return <FileText className="h-5 w-5" />;
      case 'data-transformation':
        return <Wand2 className="h-5 w-5" />;
      case 'file-conversion':
        return <Code2 className="h-5 w-5" />;
      case 'git-repository':
        return <GitBranch className="h-5 w-5" />;
      default:
        return <Wand2 className="h-5 w-5" />;
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Wand2 className="h-5 w-5 mr-2" />
          AI Hub
        </CardTitle>
        <CardDescription>
          Process data and transform content with AI-powered pipelines
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isPipelinesLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 w-full">
              {pipelines.map((pipeline) => (
                <TabsTrigger 
                  key={pipeline.id} 
                  value={pipeline.id}
                  className="flex items-center"
                >
                  {getPipelineIcon(pipeline.id)}
                  <span className="ml-2">{pipeline.name}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            
            {pipelines.map((pipeline) => (
              <TabsContent key={pipeline.id} value={pipeline.id}>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">{pipeline.name}</h3>
                    <p className="text-sm text-muted-foreground">{pipeline.description}</p>
                  </div>
                  
                  {/* Input form based on pipeline input type */}
                  {pipeline.inputType === 'text' && (
                    <form onSubmit={handleTextSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="text-input" className="block text-sm font-medium mb-1">
                          Text Input
                        </label>
                        <Textarea
                          id="text-input"
                          placeholder="Enter text to process..."
                          className="h-36"
                          value={textInput}
                          onChange={(e) => setTextInput(e.target.value)}
                        />
                      </div>
                      <Button 
                        type="submit" 
                        disabled={executeTextMutation.isPending}
                        className="w-full sm:w-auto"
                      >
                        {executeTextMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Process Text
                      </Button>
                    </form>
                  )}
                  
                  {pipeline.inputType === 'file' && (
                    <form onSubmit={handleFileSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="file-input" className="block text-sm font-medium mb-1">
                          File Input
                        </label>
                        <Input
                          id="file-input"
                          type="file"
                          onChange={handleFileChange}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Selected file: {selectedFile?.name || 'None'}
                        </p>
                      </div>
                      <Button 
                        type="submit" 
                        disabled={executeFileMutation.isPending || !selectedFile}
                        className="w-full sm:w-auto"
                      >
                        {executeFileMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Process File
                      </Button>
                    </form>
                  )}
                  
                  {/* JSON input for data transformation pipeline */}
                  {pipeline.id === 'data-transformation' && (
                    <form onSubmit={handleJsonSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="json-input" className="block text-sm font-medium mb-1">
                          JSON Input
                        </label>
                        <Textarea
                          id="json-input"
                          placeholder="Enter JSON data to transform..."
                          className="h-36 font-mono text-sm"
                          value={jsonInput}
                          onChange={(e) => setJsonInput(e.target.value)}
                        />
                      </div>
                      <Button 
                        type="submit" 
                        disabled={executeJsonMutation.isPending}
                        className="w-full sm:w-auto"
                      >
                        {executeJsonMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Transform Data
                      </Button>
                    </form>
                  )}
                </div>
              </TabsContent>
            ))}
            
            {/* Results section */}
            {executionResult && (
              <div className="mt-8 border-t pt-4">
                <h3 className="text-lg font-medium mb-3">Execution Results</h3>
                
                {!executionResult.success && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      {executionResult.result.error || 'An unknown error occurred'}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="text-sm font-medium">{executionResult.result.duration}ms</p>
                    </div>
                    
                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-xs text-muted-foreground">Output Type</p>
                      <p className="text-sm font-medium">{executionResult.result.outputType || 'None'}</p>
                    </div>
                    
                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="text-sm font-medium">{executionResult.success ? 'Success' : 'Failed'}</p>
                    </div>
                  </div>
                  
                  {executionResult.result.outputPath && (
                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-xs text-muted-foreground">Output Path</p>
                      <p className="text-sm font-mono break-all">{executionResult.result.outputPath}</p>
                    </div>
                  )}
                  
                  <div className="bg-muted p-3 rounded-md">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs text-muted-foreground">Execution Logs</p>
                    </div>
                    <div className="bg-black bg-opacity-80 text-white p-3 rounded text-xs font-mono h-48 overflow-y-auto">
                      {executionResult.result.logs.map((log, i) => (
                        <div key={i} className="mb-1">
                          &gt; {log}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}