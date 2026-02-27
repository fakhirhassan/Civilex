import Logo from "./Logo";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left side - Image */}
      <div className="relative hidden w-1/2 lg:block">
        {/* Dark green background with justice scales overlay */}
        <div className="absolute inset-0 bg-primary-dark">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/90 to-primary/70" />
          {/* Decorative scales SVG */}
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <svg
              viewBox="0 0 400 400"
              className="h-96 w-96 text-cream"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Balance beam */}
              <line x1="200" y1="60" x2="200" y2="180" stroke="currentColor" strokeWidth="4" />
              <line x1="100" y1="120" x2="300" y2="120" stroke="currentColor" strokeWidth="4" />
              {/* Left pan */}
              <path d="M60 200 Q80 160 100 120" stroke="currentColor" strokeWidth="3" fill="none" />
              <path d="M140 200 Q120 160 100 120" stroke="currentColor" strokeWidth="3" fill="none" />
              <path d="M60 200 Q100 220 140 200" stroke="currentColor" strokeWidth="3" fill="none" />
              {/* Right pan */}
              <path d="M260 200 Q280 160 300 120" stroke="currentColor" strokeWidth="3" fill="none" />
              <path d="M340 200 Q320 160 300 120" stroke="currentColor" strokeWidth="3" fill="none" />
              <path d="M260 200 Q300 220 340 200" stroke="currentColor" strokeWidth="3" fill="none" />
              {/* Base */}
              <line x1="200" y1="180" x2="200" y2="320" stroke="currentColor" strokeWidth="4" />
              <ellipse cx="200" cy="330" rx="60" ry="15" stroke="currentColor" strokeWidth="4" fill="none" />
              <ellipse cx="200" cy="345" rx="50" ry="12" stroke="currentColor" strokeWidth="4" fill="none" />
              <ellipse cx="200" cy="358" rx="40" ry="10" stroke="currentColor" strokeWidth="4" fill="none" />
              {/* Top ornament */}
              <circle cx="200" cy="55" r="8" stroke="currentColor" strokeWidth="3" fill="none" />
            </svg>
          </div>
        </div>
        {/* Logo overlay */}
        <div className="absolute left-6 top-6 z-10">
          <Logo size="md" className="text-white [&_span]:text-white [&_svg]:text-white" />
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full flex-col bg-cream-light lg:w-1/2">
        {/* Back button */}
        <div className="flex justify-end p-4 lg:justify-end">
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        {/* Form content */}
        <div className="flex flex-1 items-center justify-center px-6 pb-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
