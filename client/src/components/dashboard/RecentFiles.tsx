import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, MoreVertical, FileText, Code, Image, Film, File, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { getFileIcon, getFileColor, getSourceName, getSourceIcon, formatRelativeDate } from '@/lib/fileHelpers';
import { SiNotion, SiDropbox, SiGoogledrive } from 'react-icons/si';

export default function RecentFiles() {
  const { data: files, isLoading } = useQuery({
    queryKey: ['/api/files/recent'],
  });

  const getFileTypeIcon = (fileCategory: string) => {
    switch (fileCategory) {
      case 'document':
        return <FileText className="h-5 w-5 text-purple-500" />;
      case 'code':
        return <Code className="h-5 w-5 text-blue-500" />;
      case 'image':
        return <Image className="h-5 w-5 text-yellow-500" />;
      case 'video':
        return <Film className="h-5 w-5 text-red-500" />;
      case 'chat_log':
        return <MessageSquare className="h-5 w-5 text-red-500" />;
      default:
        return <File className="h-5 w-5 text-neutral-500" />;
    }
  };

  const getSourceTypeIcon = (source: string) => {
    switch (source) {
      case 'google_drive':
        return <SiGoogledrive className="h-4 w-4 text-green-500" />;
      case 'dropbox':
        return <SiDropbox className="h-4 w-4 text-blue-500" />;
      case 'notion':
        return <SiNotion className="h-4 w-4 text-black dark:text-white" />;
      default:
        return <File className="h-4 w-4 text-neutral-500" />;
    }
  };

  // If loading, show skeleton
  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Files</CardTitle>
          </div>
          <Button variant="link" size="sm" className="text-secondary">
            View All Files
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-700">
                  <th className="text-left py-3 px-6 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Name</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Category</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Location</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Last Modified</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {[1, 2, 3, 4].map((i) => (
                  <tr key={i} className="hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                    <td className="py-3 px-6">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="h-5 w-5 rounded" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                    </td>
                    <td className="py-3 px-6"><Skeleton className="h-4 w-20" /></td>
                    <td className="py-3 px-6">
                      <div className="flex items-center space-x-1">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </td>
                    <td className="py-3 px-6"><Skeleton className="h-4 w-32" /></td>
                    <td className="py-3 px-6">
                      <div className="flex space-x-1">
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sample data to use when no real data is available yet
  const sampleFiles = [
    {
      id: 1,
      name: "Project Proposal.docx",
      fileCategory: "document",
      source: "google_drive",
      lastModified: new Date().toISOString(),
    },
    {
      id: 2,
      name: "analysis.py",
      fileCategory: "code",
      source: "local",
      lastModified: new Date(Date.now() - 86400000).toISOString(), // yesterday
    },
    {
      id: 3,
      name: "dashboard-mockup.png",
      fileCategory: "image",
      source: "notion",
      lastModified: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    },
    {
      id: 4,
      name: "AI-Chat-Session-20230812.json",
      fileCategory: "chat_log",
      source: "local",
      lastModified: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    }
  ];

  const displayFiles = files?.length > 0 ? files : sampleFiles;

  return (
    <Card className="mt-6">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Files</CardTitle>
        </div>
        <Button variant="link" size="sm" className="text-secondary">
          View All Files
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50 dark:bg-neutral-700">
                <th className="text-left py-3 px-6 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Name</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Category</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Location</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Last Modified</th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {displayFiles.map((file) => (
                <tr key={file.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors">
                  <td className="py-3 px-6">
                    <div className="flex items-center">
                      {getFileTypeIcon(file.fileCategory)}
                      <span className="font-medium ml-3">{file.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-6 text-neutral-500 dark:text-neutral-400 capitalize">
                    {file.fileCategory}
                  </td>
                  <td className="py-3 px-6">
                    <div className="flex items-center">
                      <span className="mr-1">{getSourceTypeIcon(file.source)}</span>
                      <span className="text-neutral-500 dark:text-neutral-400">
                        {getSourceName(file.source)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-6 text-neutral-500 dark:text-neutral-400">
                    {formatRelativeDate(file.lastModified)}
                  </td>
                  <td className="py-3 px-6">
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="icon">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>Download</DropdownMenuItem>
                          <DropdownMenuItem>Share</DropdownMenuItem>
                          <DropdownMenuItem>Rename</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-500">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
              
              {displayFiles.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-500 dark:text-neutral-400">
                    No recent files found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
