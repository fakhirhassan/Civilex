"use client";

import { use, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Topbar from "@/components/layout/Topbar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { useAuth } from "@/hooks/useAuth";
import { Scale, AlertTriangle, Check, ArrowRight, Users } from "lucide-react";
import Link from "next/link";

interface ClaimResult {
  case_id: string;
  case_number: string;
  title: string;
  already_claimed?: boolean;
}

export default function SummonPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = use(params);
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const { user } = useAuth();

  const [status, setStatus] = useState<"idle" | "claiming" | "claimed" | "error">("idle");
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [error, setError] = useState("");

  // Auto-claim if token is present and user is authenticated
  useEffect(() => {
    if (!user || !token || status !== "idle") return;
    claimCase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  const claimCase = async () => {
    if (!token) return;
    setStatus("claiming");
    setError("");

    try {
      const res = await fetch("/api/summon/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId, token }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to claim case");
        setStatus("error");
      } else {
        setResult(data);
        setStatus("claimed");
      }
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  };

  if (!token) {
    return (
      <div>
        <Topbar title="Court Summon" />
        <div className="p-6">
          <Card className="max-w-xl mx-auto">
            <div className="flex flex-col items-center py-8 text-center">
              <AlertTriangle className="h-12 w-12 text-warning mb-4" />
              <h2 className="text-lg font-semibold text-primary mb-2">Invalid Summon Link</h2>
              <p className="text-sm text-muted mb-6">
                This link is missing a valid claim token. Please use the exact link from your summon notice.
                If you believe this is an error, contact the court directly.
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
      <Topbar title="Court Summon Notice" />
      <div className="p-6">
        <div className="mx-auto max-w-2xl space-y-6">

          {/* Summon header */}
          <Card>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-danger/10">
                <Scale className="h-6 w-6 text-danger" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-primary">Official Court Summon</h2>
                <p className="mt-1 text-sm text-muted">
                  You have received an official court summon. You are required to respond within 30 days.
                </p>
              </div>
            </div>
          </Card>

          {/* Claiming status */}
          {status === "idle" && !user && (
            <Card>
              <div className="text-center py-4">
                <Spinner />
                <p className="mt-2 text-sm text-muted">Checking your session...</p>
              </div>
            </Card>
          )}

          {status === "claiming" && (
            <Card>
              <div className="text-center py-4">
                <Spinner />
                <p className="mt-2 text-sm text-muted">Linking case to your account...</p>
              </div>
            </Card>
          )}

          {status === "error" && (
            <Card>
              <div className="flex items-start gap-3 rounded-lg border border-danger bg-danger-light p-4">
                <AlertTriangle className="h-5 w-5 shrink-0 text-danger mt-0.5" />
                <div>
                  <p className="font-medium text-danger">Could Not Claim Case</p>
                  <p className="mt-1 text-sm text-danger">{error}</p>
                  <div className="mt-3 flex gap-3">
                    <Button size="sm" variant="outline" onClick={claimCase}>
                      Try Again
                    </Button>
                    <Link href="/dashboard">
                      <Button size="sm" variant="ghost">Go to Dashboard</Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {status === "claimed" && result && (
            <>
              {/* Success */}
              <Card>
                <div className="flex items-start gap-3 rounded-lg border border-success bg-green-50 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10">
                    <Check className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="font-medium text-success">
                      {result.already_claimed ? "Case Already Linked" : "Case Successfully Linked"}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Case <strong>{result.case_number}</strong> — {result.title} is now linked to your account.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Next steps */}
              <Card>
                <h3 className="mb-4 text-base font-semibold text-primary">What You Need to Do</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">1</div>
                    <div>
                      <p className="font-medium text-sm">Review the case</p>
                      <p className="text-xs text-muted mt-0.5">
                        Understand the claims made against you by reviewing the case details.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">2</div>
                    <div>
                      <p className="font-medium text-sm">Hire a lawyer</p>
                      <p className="text-xs text-muted mt-0.5">
                        Browse our lawyer directory and request representation for your defence.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">3</div>
                    <div>
                      <p className="font-medium text-sm">Submit required documents</p>
                      <p className="text-xs text-muted mt-0.5">
                        Your lawyer may request specific documents. Upload them promptly.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">4</div>
                    <div>
                      <p className="font-medium text-sm">Confirm payment</p>
                      <p className="text-xs text-muted mt-0.5">
                        Once your lawyer accepts and sets their fee, confirm payment to proceed.
                      </p>
                    </div>
                  </div>
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

              {/* Rights notice */}
              <Card>
                <div className="flex items-start gap-3">
                  <Badge variant="warning" className="shrink-0 mt-0.5">Important</Badge>
                  <p className="text-xs text-muted">
                    You have the right to legal representation. If you cannot afford a lawyer, you may
                    apply for legal aid. Failure to respond within 30 days may result in an ex-parte
                    decision being made against you. All communications through this platform are
                    legally binding.
                  </p>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
