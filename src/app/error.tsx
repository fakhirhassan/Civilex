"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-danger/10">
          <AlertTriangle className="h-10 w-10 text-danger" />
        </div>

        <h1 className="mb-2 text-2xl font-bold text-primary">
          Something went wrong
        </h1>
        <p className="mb-6 text-sm text-muted">
          An unexpected error occurred. Please try again or return to the
          dashboard.
        </p>

        {error.digest && (
          <p className="mb-4 text-xs text-muted">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex justify-center gap-3">
          <Button variant="primary" onClick={reset}>
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Link href="/dashboard">
            <Button variant="outline">
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
