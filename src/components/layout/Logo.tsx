import { cn } from "@/lib/utils";
import Link from "next/link";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export default function Logo({ className, size = "md", showText = true }: LogoProps) {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-14 w-14",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <Link href="/dashboard" className={cn("flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 100 100"
        className={cn(sizes[size])}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Diamond shape */}
        <path
          d="M50 5 L95 50 L50 95 L5 50 Z"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
          className="text-primary"
        />
        <path
          d="M50 15 L85 50 L50 85 L15 50 Z"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          className="text-primary"
        />
        {/* Pillar top */}
        <path
          d="M35 32 L65 32 L62 36 L38 36 Z"
          fill="currentColor"
          className="text-primary"
        />
        {/* Roof triangle */}
        <path
          d="M50 25 L65 32 L35 32 Z"
          fill="currentColor"
          className="text-primary"
        />
        {/* Pillars */}
        <rect x="38" y="36" width="4" height="26" rx="1" fill="currentColor" className="text-primary" />
        <rect x="45" y="36" width="4" height="26" rx="1" fill="currentColor" className="text-primary" />
        <rect x="52" y="36" width="4" height="26" rx="1" fill="currentColor" className="text-primary" />
        <rect x="59" y="36" width="4" height="26" rx="1" fill="currentColor" className="text-primary" />
        {/* Base */}
        <path
          d="M35 62 L65 62 L67 66 L33 66 Z"
          fill="currentColor"
          className="text-primary"
        />
        <rect x="32" y="66" width="36" height="4" rx="1" fill="currentColor" className="text-primary" />
      </svg>
      {showText && (
        <span className={cn("font-semibold text-primary", textSizes[size])}>
          Civilex
        </span>
      )}
    </Link>
  );
}
