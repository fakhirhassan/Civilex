"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import { useAuth } from "@/hooks/useAuth";
import { Scale, AlertTriangle, Check, ArrowRight, Users } from "lucide-react";

interface ClaimResult {
  case_id: string;
  case_number: string;
  title: string;
  already_claimed?: boolean;
}

export default function SummonClaimPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ClaimResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Enter the summon code from your email");
      return;
    }

    setSubmitting(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/summon/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not claim case");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div>
        <Topbar title="Claim Summon" />
        <div className="p-6 flex justify-center">
          <Spinner />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <Topbar title="Claim Summon" />
        <div className="p-6">
          <Card className="mx-auto max-w-xl">
            <div className="flex flex-col items-center py-8 text-center">
              <AlertTriangle className="h-12 w-12 text-warning mb-4" />
              <h2 className="text-lg font-semibold text-primary mb-2">
                Please log in
              </h2>
              <p className="text-sm text-muted mb-6">
                Log in to your client account to claim a case using your summon code.
              </p>
              <Button onClick={() => router.push("/login")}>Go to Login</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (user.role !== "client") {
    return (
      <div>
        <Topbar title="Claim Summon" />
        <div className="p-6">
          <Card className="mx-auto max-w-xl">
            <div className="flex flex-col items-center py-8 text-center">
              <AlertTriangle className="h-12 w-12 text-warning mb-4" />
              <h2 className="text-lg font-semibold text-primary mb-2">
                Client account required
              </h2>
              <p className="text-sm text-muted mb-6">
                Only client accounts can claim a summons. If you have been
                summoned in your personal capacity, please register a client
                account.
              </p>
              <Link href="/dashboard">
                <Button variant="outline">Go to Dashboard</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Claim Court Summon" />
      <div className="p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Scale className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-primary">
                  Enter Your Summon Code
                </h2>
                <p className="mt-1 text-sm text-muted">
                  If you have received a court summon by email, enter the
                  8-character code from the email below to link the case to your
                  account.
                </p>
              </div>
            </div>
          </Card>

          {!result && (
            <Card>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  id="summon_code"
                  label="Summon Code"
                  placeholder="e.g. A3F7K2P9"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={12}
                  autoComplete="off"
                  className="font-mono tracking-widest text-lg"
                />

                {error && (
                  <div className="flex items-start gap-2 rounded-lg border border-danger bg-danger-light p-3 text-sm text-danger">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="submit" isLoading={submitting}>
                    Claim Case
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {result && (
            <>
              <Card>
                <div className="flex items-start gap-3 rounded-lg border border-success bg-green-50 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10">
                    <Check className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="font-medium text-success">
                      {result.already_claimed
                        ? "Case Already Linked"
                        : "Case Successfully Linked"}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Case <strong>{result.case_number}</strong> — {result.title}{" "}
                      is now linked to your account.
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="mb-4 text-base font-semibold text-primary">
                  Next Steps
                </h3>
                <div className="space-y-4 text-sm">
                  <p className="text-muted">
                    Review the case filed against you, then either hire a lawyer
                    through our directory or choose to self-represent. Your written
                    statement must be filed before the first hearing.
                  </p>
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link href={`/cases/${result.case_id}`} className="flex-1">
                    <Button variant="primary" className="w-full">
                      <Scale className="h-4 w-4" />
                      View Case Details
                    </Button>
                  </Link>
                  <Link href="/lawyers" className="flex-1">
                    <Button variant="outline" className="w-full">
                      <Users className="h-4 w-4" />
                      Browse Lawyers
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
