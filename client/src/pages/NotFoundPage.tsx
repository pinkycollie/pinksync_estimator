import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background dark:bg-darkBg">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 items-center">
            <AlertCircle className="h-8 w-8 text-red-500 mr-2" />
            <h1 className="text-2xl font-bold text-foreground">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
            The page you are looking for doesn't exist or has been moved.
          </p>
          
          <div className="mt-6">
            <Link href="/">
              <Button className="w-full flex items-center justify-center">
                <Home className="mr-2 h-4 w-4" />
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
