"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { registerSchema } from "@/lib/validations/auth";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { Eye, EyeOff } from "lucide-react";

const roleOptions = Object.entries(ROLE_LABELS)
  .filter(([value]) => value !== "magistrate")
  .map(([value, label]) => ({
    value,
    label,
  }));

const specializationOptions = [
  { value: "civil", label: "Civil Law" },
  { value: "criminal", label: "Criminal Law" },
  { value: "family", label: "Family Law" },
  { value: "property", label: "Property Law" },
  { value: "corporate", label: "Corporate Law" },
  { value: "tax", label: "Tax Law" },
  { value: "constitutional", label: "Constitutional Law" },
];

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, createLawyerProfile } = useAuth();
  const [formData, setFormData] = useState({
    role: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    cnic: "",
    // Lawyer fields
    barLicenseNumber: "",
    specialization: [] as string[],
    experienceYears: "",
    bio: "",
    location: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isLawyer = formData.role === "lawyer";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validationData = {
      ...formData,
      experienceYears: formData.experienceYears
        ? parseInt(formData.experienceYears)
        : undefined,
    };

    if (formData.password !== formData.confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match." });
      return;
    }

    const result = registerSchema.safeParse(validationData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (isLawyer && !formData.barLicenseNumber) {
      setErrors({ barLicenseNumber: "Bar license number is required for lawyers" });
      return;
    }

    setIsLoading(true);

    const { error: signUpError, userId } = await signUp(formData.email, formData.password, {
      full_name: formData.fullName,
      role: formData.role,
    });

    if (signUpError) {
      setErrors({ form: signUpError });
      setIsLoading(false);
      return;
    }

    // If lawyer, create lawyer profile
    // Pass userId so it works even when email confirmation is pending
    if (isLawyer && userId) {
      const { error: lawyerError } = await createLawyerProfile(
        {
          bar_license_number: formData.barLicenseNumber,
          specialization: formData.specialization,
          experience_years: formData.experienceYears
            ? parseInt(formData.experienceYears)
            : 0,
          bio: formData.bio || null,
          hourly_rate: null,
          is_available: true,
          location: formData.location || null,
        },
        userId
      );

      if (lawyerError) {
        setErrors({ form: lawyerError });
        setIsLoading(false);
        return;
      }
    }

    router.push("/login?registered=true");
  };

  return (
    <div>
      <h1 className="text-3xl font-bold italic text-primary">
        Join Civilex Today
      </h1>
      <p className="mt-2 text-sm text-muted">
        Create your account to start managing your legal journey with ease.
      </p>

      {errors.form && (
        <div className="mt-4 rounded-lg border border-danger bg-danger-light p-3 text-sm text-danger">
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Select
          id="role"
          label="Role"
          placeholder="Choose Role"
          options={roleOptions}
          value={formData.role}
          error={errors.role}
          onChange={(e) =>
            setFormData({ ...formData, role: e.target.value as Role })
          }
        />

        <Input
          id="fullName"
          type="text"
          label="Full Name"
          placeholder="Enter Your Name"
          value={formData.fullName}
          error={errors.fullName}
          onChange={(e) =>
            setFormData({ ...formData, fullName: e.target.value })
          }
        />

        <Input
          id="email"
          type="email"
          label="Email"
          placeholder="Enter Your Email"
          value={formData.email}
          error={errors.email}
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value })
          }
        />

        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            label="Password"
            placeholder="Enter Your Password"
            value={formData.password}
            error={errors.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-[34px] text-muted hover:text-foreground"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            label="Confirm Password"
            placeholder="Re-enter Your Password"
            value={formData.confirmPassword}
            error={errors.confirmPassword}
            onChange={(e) =>
              setFormData({ ...formData, confirmPassword: e.target.value })
            }
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            className="absolute right-3 top-[34px] text-muted hover:text-foreground"
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {/* Lawyer-specific fields */}
        {isLawyer && (
          <div className="space-y-5 rounded-lg border border-border bg-cream p-4">
            <h3 className="text-sm font-semibold text-primary">
              Lawyer Details
            </h3>

            <Input
              id="barLicenseNumber"
              label="Bar License Number"
              placeholder="Enter Bar License Number"
              value={formData.barLicenseNumber}
              error={errors.barLicenseNumber}
              onChange={(e) =>
                setFormData({ ...formData, barLicenseNumber: e.target.value })
              }
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-primary">
                Specialization
              </label>
              <div className="flex flex-wrap gap-2">
                {specializationOptions.map((spec) => (
                  <label
                    key={spec.value}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      formData.specialization.includes(spec.value)
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-cream-light text-foreground hover:border-primary"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={formData.specialization.includes(spec.value)}
                      onChange={(e) => {
                        const updated = e.target.checked
                          ? [...formData.specialization, spec.value]
                          : formData.specialization.filter(
                              (s) => s !== spec.value
                            );
                        setFormData({ ...formData, specialization: updated });
                      }}
                    />
                    {spec.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="experienceYears"
                type="number"
                label="Years of Experience"
                placeholder="e.g. 5"
                value={formData.experienceYears}
                onChange={(e) =>
                  setFormData({ ...formData, experienceYears: e.target.value })
                }
              />
              <Input
                id="location"
                label="Location / City"
                placeholder="e.g. Lahore"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
              />
            </div>

            <Textarea
              id="bio"
              label="Bio"
              placeholder="Brief description about your practice..."
              value={formData.bio}
              onChange={(e) =>
                setFormData({ ...formData, bio: e.target.value })
              }
            />
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
          Register
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already Have Account?{" "}
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
