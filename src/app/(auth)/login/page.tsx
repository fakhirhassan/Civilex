"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { loginSchema } from "@/lib/validations/auth";
import { ROLE_LABELS, type Role } from "@/lib/constants";

const roleOptions = Object.entries(ROLE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [formData, setFormData] = useState({
    role: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = loginSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(formData.email, formData.password, formData.role);

    if (error) {
      setErrors({ form: error });
      setIsLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold italic text-primary">
        Sign In to Civilex
      </h1>
      <p className="mt-2 text-sm text-muted">
        Access your personalized dashboard and manage your legal journey with
        ease.
      </p>

      {errors.form && (
        <div className="mt-4 rounded-lg border border-danger bg-danger-light p-3 text-sm text-danger">
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Select
          id="role"
          label="Choose Role"
          placeholder="Choose Role"
          options={roleOptions}
          value={formData.role}
          error={errors.role}
          onChange={(e) =>
            setFormData({ ...formData, role: e.target.value as Role })
          }
        />

        <Input
          id="email"
          type="email"
          label="Email or Username"
          placeholder="Enter Your Email or Username"
          value={formData.email}
          error={errors.email}
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value })
          }
        />

        <div>
          <Input
            id="password"
            type="password"
            label="Password"
            placeholder="Enter Your Password"
            value={formData.password}
            error={errors.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
          />
          <div className="mt-1 text-right">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot Password ?
            </Link>
          </div>
        </div>

        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
          Login
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New Here?{" "}
        <Link
          href="/register"
          className="font-semibold text-primary hover:underline"
        >
          Create Account
        </Link>
      </p>
    </div>
  );
}
