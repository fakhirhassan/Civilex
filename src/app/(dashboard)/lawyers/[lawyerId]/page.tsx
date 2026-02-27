"use client";

import { use } from "react";
import Topbar from "@/components/layout/Topbar";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { useLawyer } from "@/hooks/useLawyers";
import { formatCurrency } from "@/lib/utils";
import {
  Star,
  MapPin,
  Briefcase,
  Clock,
  Phone,
  Mail,
  Award,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export default function LawyerDetailPage({
  params,
}: {
  params: Promise<{ lawyerId: string }>;
}) {
  const { lawyerId } = use(params);
  const { lawyer, isLoading } = useLawyer(lawyerId);

  if (isLoading) {
    return (
      <div>
        <Topbar title="Lawyer Profile" />
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (!lawyer) {
    return (
      <div>
        <Topbar title="Lawyer Profile" />
        <div className="p-6 text-center">
          <p className="text-muted">Lawyer not found.</p>
          <Link href="/lawyers">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4" />
              Back to Directory
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const profile = lawyer.lawyer_profiles;
  const initials = lawyer.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div>
      <Topbar title="Lawyer Profile" />

      <div className="p-6">
        <Link
          href="/lawyers"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Directory
        </Link>

        {/* Profile header */}
        <Card className="mt-2">
          <div className="flex flex-col gap-6 sm:flex-row">
            {/* Avatar */}
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary text-3xl font-bold text-white">
              {initials}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-primary">
                    {lawyer.full_name}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    License: {profile.bar_license_number}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="text-lg font-bold">
                    {profile.rating.toFixed(1)}
                  </span>
                  <span className="text-sm text-muted">
                    ({profile.total_reviews} reviews)
                  </span>
                </div>
              </div>

              {/* Specializations */}
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.specialization.map((spec) => (
                  <Badge key={spec} variant="primary">
                    {spec}
                  </Badge>
                ))}
              </div>

              {/* Quick stats */}
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-primary" />
                  <span>{profile.experience_years} years experience</span>
                </div>
                {(profile.location || lawyer.city) && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{profile.location || lawyer.city}</span>
                  </div>
                )}
                {profile.hourly_rate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>{formatCurrency(profile.hourly_rate)}/hr</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Award className="h-4 w-4 text-primary" />
                  <span>
                    {profile.is_available ? (
                      <Badge variant="success">Available</Badge>
                    ) : (
                      <Badge variant="warning">Unavailable</Badge>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Details section */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Bio */}
          <Card className="lg:col-span-2">
            <h3 className="mb-3 text-lg font-semibold text-primary">About</h3>
            <p className="text-sm leading-relaxed text-foreground">
              {profile.bio || "No bio provided."}
            </p>
          </Card>

          {/* Contact info */}
          <Card>
            <h3 className="mb-3 text-lg font-semibold text-primary">
              Contact Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-primary" />
                <span>{lawyer.email}</span>
              </div>
              {lawyer.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-primary" />
                  <span>{lawyer.phone}</span>
                </div>
              )}
            </div>

            <Link href={`/cases/new?lawyer=${lawyer.id}`} className="mt-6 block">
              <Button className="w-full">Hire This Lawyer</Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
