"use client";

import { useState } from "react";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/settings`,
      }
    );

    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }

    setIsLoading(false);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold italic text-primary">
        Reset Password
      </h1>
      <p className="mt-2 text-sm text-muted">
        Enter your email address and we&apos;ll send you a link to reset your
        password.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-danger bg-danger-light p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {sent ? (
        <div className="mt-8 rounded-lg border border-success bg-success-light p-4">
          <p className="text-sm text-success">
            If an account exists with that email, you&apos;ll receive a password
            reset link shortly.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Back to Login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="Enter Your Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isLoading}
          >
            Send Reset Link
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary hover:underline"
        >
          Login
        </Link>
      </p>
    </div>
  );
}
