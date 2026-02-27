# Civilex - Judiciary Management System: Implementation Plan

## Context
This is a Final Year Project (FYP) for a Judiciary Management System called "Civilex" that automates case filing, hearing management, court hierarchy, and record maintenance. The system manages civil/family/property cases and criminal cases following proper judicial hierarchy (Admin Court → Trial Court → Final Judgment). The project is being built from scratch.

## Tech Stack
- **Framework**: Next.js 14+ with App Router, TypeScript
- **Styling**: Tailwind CSS (custom Civilex theme: dark green `#0D3B2E`, cream `#F5F0E8`)
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **AI Chatbot**: Placeholder architecture (provider TBD)
- **Payments**: JazzCash/Easypaisa (simulated)
- **Icons**: lucide-react
- **Validation**: Zod

## User Roles
1. **Client** (Plaintiff/Complainant/Defendant)
2. **Lawyer** (Both sides)
3. **Admin Court** (Initial scrutiny + preliminary hearings)
4. **Magistrate** (Criminal matters in Admin Court)
5. **Trial Court Judge**
6. **Stenographer** (Court Writer)

---

## Project Structure

```
civilex/
├── .env.local                          # Supabase keys
├── .env.example
├── next.config.ts
├── tailwind.config.ts                  # Civilex theme tokens
├── middleware.ts                        # Auth + route protection
├── public/
│   └── images/                         # logo.svg, justice-scales.jpg, favicon
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout: providers
│   │   ├── page.tsx                    # Landing / redirect
│   │   ├── globals.css
│   │   ├── (auth)/                     # Unauthenticated pages
│   │   │   ├── layout.tsx              # Split: image left, form right
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── verify-otp/page.tsx
│   │   ├── (dashboard)/                # Authenticated pages
│   │   │   ├── layout.tsx              # Sidebar + topbar
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── cases/
│   │   │   │   ├── page.tsx            # Case list
│   │   │   │   ├── new/page.tsx        # Case filing
│   │   │   │   ├── [caseId]/
│   │   │   │   │   ├── page.tsx        # Case detail / digital file
│   │   │   │   │   ├── documents/page.tsx
│   │   │   │   │   ├── hearings/page.tsx
│   │   │   │   │   ├── hearings/[hearingId]/page.tsx
│   │   │   │   │   ├── orders/page.tsx
│   │   │   │   │   ├── evidence/page.tsx
│   │   │   │   │   └── applications/page.tsx
│   │   │   │   └── scrutiny/page.tsx   # Admin Court queue
│   │   │   ├── lawyers/
│   │   │   │   ├── page.tsx            # Lawyer directory
│   │   │   │   └── [lawyerId]/page.tsx
│   │   │   ├── payments/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [paymentId]/page.tsx
│   │   │   ├── notifications/page.tsx
│   │   │   ├── ai-assistant/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── api/
│   │       ├── auth/callback/route.ts
│   │       ├── cases/route.ts
│   │       ├── payments/initiate/route.ts
│   │       ├── payments/webhook/route.ts
│   │       ├── notifications/route.ts
│   │       ├── otp/send/route.ts
│   │       ├── otp/verify/route.ts
│   │       └── ai/chat/route.ts
│   ├── components/
│   │   ├── ui/                         # Button, Input, Select, Card, Table, Modal, Badge, etc.
│   │   ├── layout/                     # Sidebar, Topbar, AuthLayout, Logo, MobileNav
│   │   ├── features/                   # Domain components grouped by feature
│   │   │   ├── auth/                   # LoginForm, RegisterForm, RoleSelector
│   │   │   ├── cases/                  # CaseTable, CaseForm, CivilCaseForm, CriminalCaseForm, etc.
│   │   │   ├── hearings/              # HearingCard, HearingForm, ProceedingsEditor, OrderSheetForm
│   │   │   ├── lawyers/              # LawyerCard, LawyerFilters, FeeStructureForm
│   │   │   ├── payments/             # PaymentForm, InstallmentPlan, PaymentReceipt
│   │   │   ├── documents/            # DocumentList, DocumentUpload, DocumentViewer
│   │   │   ├── notifications/        # NotificationBell, NotificationList
│   │   │   ├── signatures/           # OtpSignature
│   │   │   └── ai/                   # ChatWindow, ChatMessage
│   │   └── providers/                 # SupabaseProvider, AuthProvider, NotificationProvider
│   ├── lib/
│   │   ├── supabase/                  # client.ts, server.ts, admin.ts, middleware.ts
│   │   ├── utils.ts
│   │   ├── constants.ts
│   │   ├── validations/               # Zod schemas: auth, case, payment, hearing
│   │   └── helpers/                   # role-permissions.ts, case-workflow.ts, notification.ts
│   ├── types/                         # database.types.ts, auth, case, hearing, payment, etc.
│   └── hooks/                         # useAuth, useCases, useNotifications, useDocuments, usePayments
├── supabase/
│   ├── config.toml
│   ├── migrations/                    # Ordered SQL migrations
│   └── seed.sql                       # Demo data
└── docs/
```

---

## Database Schema (14 Tables)

### Core Tables
1. **profiles** - Extends auth.users (id, full_name, email, phone, cnic, role, avatar_url, address, city)
2. **lawyer_profiles** - Lawyer-specific (bar_license, specialization[], experience, bio, hourly_rate, rating)
3. **cases** - Central entity (case_number, case_type, status, title, description, plaintiff/defendant/lawyer/judge IDs, current_phase, dates)
4. **criminal_case_details** - Criminal extras (fir_number, police_station, offense, io_name, bail_status)
5. **case_assignments** - Lawyer-client assignments (side, status, fee_amount, installment option)

### Supporting Tables
6. **documents** - All uploaded files (document_type enum, file_path, signing metadata)
7. **hearings** - Court hearings (hearing_type, date, presiding_officer, proceedings_summary, judge_remarks)
8. **order_sheets** - Judge orders per hearing (order_type, order_text)
9. **witness_records** - Witnesses (statement, cross_examination, re_examination, status)
10. **payments** - Payment records (amount, method, type, installment tracking, status)
11. **notifications** - Realtime notifications (title, message, type, reference, is_read)
12. **scrutiny_checklist** - Admin Court verification (7 checklist booleans, decision, remarks)
13. **otp_signatures** - Digital signature audit log (otp_hash, timestamp, IP, verification)
14. **case_activity_log** - Immutable audit trail (actor, action, jsonb details)

### Case Status Flow
`draft` → `pending_lawyer_acceptance` → `lawyer_accepted` → `payment_pending` → `payment_confirmed` → `drafting` → `submitted_to_admin` → `under_scrutiny` → `registered` → `summon_issued` → `preliminary_hearing` → `issues_framed` → `transferred_to_trial` → `evidence_stage` → `arguments` → `reserved_for_judgment` → `judgment_delivered` → `closed`

---

## Development Phases

### Phase 0: Project Foundation (Days 1-3)
**Goal**: Bootable Next.js app with Supabase, Civilex theme, auth/dashboard layouts

**Tasks:**
1. `npx create-next-app@latest civilex` (TypeScript, Tailwind, App Router, src/)
2. Install deps: `@supabase/ssr`, `@supabase/supabase-js`, `zod`, `clsx`, `tailwind-merge`, `lucide-react`
3. Configure Tailwind with Civilex colors: primary `#0D3B2E`, cream `#F5F0E8`
4. Set up 4 Supabase clients: client.ts, server.ts, admin.ts, middleware.ts
5. Create middleware.ts for auth token refresh + route protection
6. Build `(auth)` layout (justice scales image left, form right)
7. Build `(dashboard)` layout (sidebar + topbar)
8. Build base UI components: Button, Input, Card, Spinner, Logo
9. Build Sidebar.tsx and Topbar.tsx

**Delivers**: `/login`, `/register` (styled forms), `/dashboard` (empty shell with sidebar)

---

### Phase 1: Authentication & Profiles (Days 4-7)
**Goal**: Full auth flow with role-based registration, login, profile management

**Tasks:**
1. Create profiles + lawyer_profiles migrations with auto-create trigger
2. Build multi-step RegisterForm (role selection → details → lawyer extras)
3. Build LoginForm with role selector
4. Build AuthProvider + useAuth hook
5. Build /settings page for profile editing
6. Create role-permissions.ts with RBAC mapping
7. Create RLS policies for profiles

**Delivers**: Functional register/login, role-based dashboard greeting, profile settings

---

### Phase 2: Lawyer Directory & Case Filing (Days 8-14)
**Goal**: Clients browse lawyers, submit cases with documents

**Tasks:**
1. Create cases + case_assignments migrations
2. Build lawyer directory with filters (specialization, location, rating)
3. Build case filing wizard (CivilCaseForm + CriminalCaseForm)
4. Build DocumentUpload using Supabase Storage
5. Build case list page with CaseTable
6. Set up case-documents storage bucket with RLS

**Delivers**: `/lawyers`, `/cases/new`, `/cases` list, document upload

---

### Phase 3: Lawyer Review & Payments (Days 15-21)
**Goal**: Lawyers accept/decline cases, set fees, clients pay (simulated)

**Tasks:**
1. Create payments migration
2. Build lawyer case review (accept with fee / decline with reason)
3. Build FeeStructureForm with installment options
4. Build PaymentForm (JazzCash/Easypaisa selector, simulated processing)
5. Build payment history page
6. Wire status transitions: payment_pending → payment_confirmed → drafting

**Delivers**: Lawyer review actions, payment flow, `/payments` history

---

### Phase 4: Notifications & Activity Log (Days 22-26)
**Goal**: Real-time notifications, case activity timeline

**Tasks:**
1. Create notifications + case_activity_log migrations
2. Enable Supabase Realtime on notifications table
3. Build NotificationProvider with realtime subscription
4. Build NotificationBell (badge + dropdown) and notification center
5. Build CaseTimeline and CaseStatusStepper components
6. Wire notifications to all existing flows

**Delivers**: Real-time notification bell, `/notifications`, case timeline

---

### Phase 5: Admin Court Module (Days 27-35)
**Goal**: Scrutiny, registration, summons, preliminary hearings, case transfer

**Tasks:**
1. Create scrutiny_checklist + hearings + order_sheets migrations
2. Build scrutiny queue page (admin_court only)
3. Build ScrutinyChecklist (7 verification items, approve/return)
4. Build summon issuance flow
5. Build HearingForm for scheduling
6. Build hearing detail with ProceedingsEditor (stenographer) and OrderSheetForm (judge)
7. Build case transfer to trial court flow

**Delivers**: `/cases/scrutiny`, hearing management, case transfer

---

### Phase 6: Criminal Case Flow (Days 36-42)
**Goal**: FIR, IO investigation, magistrate bail/proceedings

**Tasks:**
1. Build criminal case details within CriminalCaseForm
2. Build Magistrate dashboard and review interface
3. Build bail decision flow with order sheets
4. Build criminal preliminary proceedings
5. Handle criminal-specific status transitions

**Delivers**: Criminal case filing, magistrate view, bail decisions

---

### Phase 7: Trial Court Proceedings (Days 43-52)
**Goal**: Evidence, witnesses, arguments, judgment, complete Digital Case File

**Tasks:**
1. Create witness_records migration
2. Build evidence management (upload, tag, view)
3. Build witness management (add, examine, cross-examine)
4. Build judgment delivery flow
5. Build DigitalCaseFile tabbed view (Overview, Pleadings, Documents, Evidence, Hearings, Orders, Witnesses, Judgment)
6. Implement role-based view restrictions

**Delivers**: Full trial lifecycle, complete digital case file

---

### Phase 8: Digital Signatures (Days 53-57)
**Goal**: OTP-based document signing

**Tasks:**
1. Build OTP send/verify API routes
2. Build OtpSignature modal component
3. Integrate signing into document views
4. Show signature status on documents

**Delivers**: OTP signing for documents, signature audit trail

---

### Phase 9: AI Chatbot & Dashboard Polish (Days 58-65)
**Goal**: AI placeholder, role-specific dashboards, demo-ready UI

**Tasks:**
1. Build AI chatbot UI with placeholder responses
2. Build role-specific dashboard widgets (stats, upcoming hearings, recent activity)
3. Add loading skeletons, error boundaries
4. Responsive design pass
5. Create seed.sql with comprehensive demo data

**Delivers**: `/ai-assistant`, polished dashboards, demo data

---

### Phase 10: Testing & Demo Prep (Days 66-72)
**Goal**: Bug fixes, optimization, deployment

**Tasks:**
1. End-to-end testing of all workflows
2. Add database indexes for performance
3. Security review (RLS policies, middleware)
4. Deploy to Vercel + Supabase Cloud
5. Prepare demo script

**Delivers**: Deployed, demo-ready application

---

## Authentication Strategy
- **Supabase Auth** with email/password (cookie-based SSR pattern)
- **middleware.ts**: Refreshes auth tokens, protects dashboard routes, redirects logic
- **RBAC**: Two layers — app-level permissions map + Supabase RLS policies
- **RLS helper**: `get_user_role()` SQL function reads role from profiles table

## File Storage Strategy
- **Buckets**: `avatars` (public), `case-documents` (private), `evidence` (private)
- **Path convention**: `{bucket}/{case_id}/{document_type}/{uuid}_{filename}`
- **Access**: RLS policies on storage.objects checking case party membership
- **Viewing**: Signed URLs with 1-hour expiry

## Real-time Notifications
- **Supabase Realtime** Postgres Changes subscription on `notifications` table
- **NotificationProvider** wraps dashboard layout, subscribes filtered by user_id
- **Triggers**: Case assignment, acceptance, payment, scrutiny, hearings, orders, judgments

## Verification Approach
- Manual testing checklist per phase
- RLS policy verification via Supabase SQL editor
- TypeScript strict mode + auto-generated database types
- Multi-browser demo walkthrough (one browser per role)
