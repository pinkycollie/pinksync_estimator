import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { Link } from "wouter";

export default function NotFoundPage() {
  return (
    <div className="container flex flex-col items-center justify-center h-full py-20">
      <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
      <h1 className="text-4xl font-bold mb-2">Page Not Found</h1>
      <p className="text-muted-foreground mb-8 text-center max-w-md">
        Sorry, the page you're looking for doesn't exist or has been moved.
      </p>
      <Button asChild>
        <Link href="/">Return to Dashboard</Link>
      </Button>
    </div>
  );
}