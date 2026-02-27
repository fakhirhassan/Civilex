"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Star, MapPin, Briefcase, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { LawyerWithProfile } from "@/types/case";
import Link from "next/link";

interface LawyerCardProps {
  lawyer: LawyerWithProfile;
  onSelect?: (lawyerId: string) => void;
  showSelectButton?: boolean;
}

export default function LawyerCard({
  lawyer,
  onSelect,
  showSelectButton = false,
}: LawyerCardProps) {
  const profile = lawyer.lawyer_profiles;
  const initials = lawyer.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card padding="md">
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
          {initials}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link
                href={`/lawyers/${lawyer.id}`}
                className="text-base font-semibold text-primary hover:underline"
              >
                {lawyer.full_name}
              </Link>
              {!profile.is_available && (
                <Badge variant="warning" className="ml-2">
                  Unavailable
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{profile.rating.toFixed(1)}</span>
              <span className="text-muted">({profile.total_reviews})</span>
            </div>
          </div>

          {/* Specializations */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.specialization.map((spec) => (
              <Badge key={spec} variant="primary">
                {spec}
              </Badge>
            ))}
          </div>

          {/* Details row */}
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted">
            <span className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" />
              {profile.experience_years} yrs exp
            </span>
            {(profile.location || lawyer.city) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {profile.location || lawyer.city}
              </span>
            )}
            {profile.hourly_rate && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatCurrency(profile.hourly_rate)}/hr
              </span>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="mt-2 line-clamp-2 text-sm text-muted">{profile.bio}</p>
          )}

          {/* Actions */}
          <div className="mt-3 flex gap-2">
            <Link href={`/lawyers/${lawyer.id}`}>
              <Button variant="outline" size="sm">
                View Profile
              </Button>
            </Link>
            {showSelectButton && profile.is_available && onSelect && (
              <Button size="sm" onClick={() => onSelect(lawyer.id)}>
                Select Lawyer
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
