"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/hooks/useAuth";
import { profileUpdateSchema } from "@/lib/validations/auth";
import { ROLE_LABELS } from "@/lib/constants";

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    cnic: "",
    address: "",
    city: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        phone: user.phone || "",
        cnic: user.cnic || "",
        address: user.address || "",
        city: user.city || "",
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccess(false);
    setError("");
    setFieldErrors({});

    // Validate with Zod schema
    const validation = profileUpdateSchema.safeParse({
      fullName: formData.full_name,
      phone: formData.phone || undefined,
      cnic: formData.cnic || undefined,
      address: formData.address || undefined,
      city: formData.city || undefined,
    });

    if (!validation.success) {
      const errs: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        if (issue.path[0]) errs[issue.path[0] as string] = issue.message;
      });
      setFieldErrors(errs);
      setIsLoading(false);
      return;
    }

    const { error: updateError } = await updateProfile(formData);

    if (updateError) {
      setError(updateError);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }

    setIsLoading(false);
  };

  return (
    <div>
      <Topbar title="Settings" />

      <div className="p-6">
        <Card>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary">
              Profile Settings
            </h2>
            {user?.role && (
              <Badge variant="primary">{ROLE_LABELS[user.role]}</Badge>
            )}
          </div>

          {success && (
            <div className="mb-4 rounded-lg border border-success bg-success-light p-3 text-sm text-success">
              Profile updated successfully!
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-danger bg-danger-light p-3 text-sm text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                id="full_name"
                label="Full Name"
                placeholder="Your Name"
                value={formData.full_name}
                error={fieldErrors.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />
              <Input
                id="email"
                type="email"
                label="Email"
                placeholder="Your Email"
                value={user?.email || ""}
                disabled
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                id="phone"
                label="Phone Number"
                placeholder="03XX-XXXXXXX"
                value={formData.phone}
                error={fieldErrors.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
              <Input
                id="cnic"
                label="CNIC"
                placeholder="XXXXX-XXXXXXX-X"
                value={formData.cnic}
                error={fieldErrors.cnic}
                onChange={(e) =>
                  setFormData({ ...formData, cnic: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                id="address"
                label="Address"
                placeholder="Your Address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
              <Input
                id="city"
                label="City"
                placeholder="Your City"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" isLoading={isLoading}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
