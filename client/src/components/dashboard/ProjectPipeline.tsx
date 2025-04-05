import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PlusCircle, MoreHorizontal, ArrowRight, Calendar, Clock } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

// Pipeline stages used for project categorization
const PIPELINE_STAGES = {
  IDEA: ['draft', 'exploring'],
  BUILD: ['in_progress', 'active'],
  GROW: ['implementing', 'scaling'],
  MANAGED: ['completed', 'maintained']
};

export default function ProjectPipeline() {
  const [currentTab, setCurrentTab] = useState('all');
  
  // Fetch ideas data
  const { data: ideas = [], isLoading: ideasLoading } = useQuery<any[]>({
    queryKey: ['/api/entrepreneur/ideas'],
  });
  
  // Fetch projects data
  const { data: projects = [], isLoading: projectsLoading } = useQuery<any[]>({
    queryKey: ['/api/entrepreneur/projects'],
  });
  
  // Combine and categorize items by stage
  const categorizeItems = () => {
    const categorized = {
      idea: [] as any[],
      build: [] as any[],
      grow: [] as any[],
      managed: [] as any[]
    };
    
    // Categorize ideas
    ideas.forEach(idea => {
      if (PIPELINE_STAGES.IDEA.includes(idea.status?.toLowerCase())) {
        categorized.idea.push({...idea, type: 'idea'});
      } else if (PIPELINE_STAGES.BUILD.includes(idea.status?.toLowerCase())) {
        categorized.build.push({...idea, type: 'idea'});
      } else if (PIPELINE_STAGES.GROW.includes(idea.status?.toLowerCase())) {
        categorized.grow.push({...idea, type: 'idea'});
      } else if (PIPELINE_STAGES.MANAGED.includes(idea.status?.toLowerCase())) {
        categorized.managed.push({...idea, type: 'idea'});
      } else {
        // Default to IDEA stage
        categorized.idea.push({...idea, type: 'idea'});
      }
    });
    
    // Categorize projects
    projects.forEach(project => {
      if (PIPELINE_STAGES.IDEA.includes(project.status?.toLowerCase())) {
        categorized.idea.push({...project, type: 'project'});
      } else if (PIPELINE_STAGES.BUILD.includes(project.status?.toLowerCase())) {
        categorized.build.push({...project, type: 'project'});
      } else if (PIPELINE_STAGES.GROW.includes(project.status?.toLowerCase())) {
        categorized.grow.push({...project, type: 'project'});
      } else if (PIPELINE_STAGES.MANAGED.includes(project.status?.toLowerCase())) {
        categorized.managed.push({...project, type: 'project'});
      } else {
        // Default to BUILD stage
        categorized.build.push({...project, type: 'project'});
      }
    });
    
    return categorized;
  };
  
  const pipelineData = categorizeItems();

  // Filter data based on current tab
  const filteredData = currentTab === 'all' 
    ? pipelineData 
    : {
        idea: currentTab === 'idea' ? pipelineData.idea : [],
        build: currentTab === 'build' ? pipelineData.build : [],
        grow: currentTab === 'grow' ? pipelineData.grow : [],
        managed: currentTab === 'managed' ? pipelineData.managed : []
      };
  
  // Generate badge style based on status
  const getStatusBadge = (status: string, type: 'idea' | 'project') => {
    let color = '';
    
    switch (status?.toLowerCase()) {
      case 'draft':
        color = 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
        break;
      case 'exploring':
        color = 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300';
        break;
      case 'in_progress':
      case 'active':
        color = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        break;
      case 'implementing':
        color = 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
        break;
      case 'scaling':
        color = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
        break;
      case 'completed':
        color = 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
        break;
      case 'maintained':
        color = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
        break;
      default:
        color = 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
    
    return (
      <Badge className={`${color} capitalize`}>
        {type === 'idea' ? '💡 ' : '🚀 '}
        {status?.replace('_', ' ') || 'Unknown'}
      </Badge>
    );
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  // Render each pipeline column
  const renderPipelineColumn = (title: string, items: any[], icon: React.ReactNode, description: string) => {
    return (
      <div className="flex flex-col min-w-[300px] h-full">
        <div className="flex items-center space-x-2 mb-3">
          {icon}
          <div>
            <h3 className="font-medium text-lg">{title}</h3>
            <p className="text-sm text-muted-foreground">{items.length} items</p>
          </div>
        </div>
        
        <Card className="flex-1 border-t-4" style={{ borderTopColor: getBorderColor(title.toLowerCase()) }}>
          <CardContent className="p-3">
            <ScrollArea className="h-[500px] pr-3">
              <div className="space-y-3">
                {items.length > 0 ? (
                  items.map((item, index) => (
                    <div key={`${item.type}-${item.id}`} className="border rounded-lg p-3 hover:shadow-sm transition-shadow bg-card dark:bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          {getStatusBadge(item.status, item.type)}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <h4 className="font-medium mb-1 line-clamp-2">{item.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{formatDate(item.createdAt)}</span>
                        </div>
                        
                        {item.dueDate && (
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>{formatDate(item.dueDate)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-muted-foreground mb-2">No items yet</p>
                    <Button variant="outline" size="sm">
                      <PlusCircle className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  // Get border color for pipeline columns
  const getBorderColor = (stage: string) => {
    switch (stage) {
      case 'idea': return 'var(--blue-600)';
      case 'build': return 'var(--green-600)';
      case 'grow': return 'var(--amber-600)';
      case 'managed': return 'var(--slate-600)';
      default: return 'var(--primary)';
    }
  };
  
  if (ideasLoading || projectsLoading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Project Pipeline</CardTitle>
          <CardDescription>View and manage your projects and ideas</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center p-6">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p>Loading pipeline data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
          <div>
            <CardTitle>Project Pipeline</CardTitle>
            <CardDescription>View and manage your projects and ideas</CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-[400px]">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="idea">Idea</TabsTrigger>
                <TabsTrigger value="build">Build</TabsTrigger>
                <TabsTrigger value="grow">Grow</TabsTrigger>
                <TabsTrigger value="managed">Managed</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 overflow-x-auto">
        <div className="flex p-4 space-x-4 min-w-max">
          {renderPipelineColumn('IDEA', filteredData.idea, <div className="h-8 w-8 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 flex items-center justify-center">💡</div>, "Capture and explore new concepts")}
          
          <div className="flex items-center text-muted-foreground">
            <ArrowRight className="h-5 w-5" />
          </div>
          
          {renderPipelineColumn('BUILD', filteredData.build, <div className="h-8 w-8 rounded-md bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 flex items-center justify-center">🔨</div>, "Actively developing projects")}
          
          <div className="flex items-center text-muted-foreground">
            <ArrowRight className="h-5 w-5" />
          </div>
          
          {renderPipelineColumn('GROW', filteredData.grow, <div className="h-8 w-8 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 flex items-center justify-center">📈</div>, "Scaling and optimizing")}
          
          <div className="flex items-center text-muted-foreground">
            <ArrowRight className="h-5 w-5" />
          </div>
          
          {renderPipelineColumn('MANAGED', filteredData.managed, <div className="h-8 w-8 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center">✓</div>, "Completed and maintained")}
        </div>
      </CardContent>
    </Card>
  );
}