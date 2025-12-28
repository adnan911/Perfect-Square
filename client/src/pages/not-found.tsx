import { Link } from "wouter";
import { Button } from "@/components/Button";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center mb-4">
          <AlertTriangle className="h-16 w-16 text-accent animate-pulse" />
        </div>
        
        <h1 className="text-4xl font-display font-bold text-foreground">
          404 Square Not Found
        </h1>
        
        <p className="text-muted-foreground font-mono">
          The geometry you are looking for does not exist in this dimension.
        </p>

        <div className="pt-4">
          <Link href="/">
            <Button variant="secondary" size="lg" className="w-full">
              Return to Grid
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
