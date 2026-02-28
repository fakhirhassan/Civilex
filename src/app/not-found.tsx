import Button from "@/components/ui/Button";
import { Scale, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Scale className="h-10 w-10 text-primary" />
        </div>

        <h1 className="mb-2 text-6xl font-bold text-primary">404</h1>
        <h2 className="mb-2 text-xl font-semibold text-foreground">
          Page Not Found
        </h2>
        <p className="mb-8 text-sm text-muted">
          The page you are looking for does not exist or has been moved.
        </p>

        <div className="flex justify-center gap-3">
          <Link href="/dashboard">
            <Button variant="primary">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
