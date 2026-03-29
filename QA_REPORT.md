# QA Report — Civilex Judiciary Management System

**Generated:** 2026-03-29
**Project:** Civilex (Sidra's FYP)
**Status:** Phase 5-6 of 9 (Core features working, criminal/trial features in progress)

---

## 1. Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js (App Router) | 16.1.6 |
| Language | TypeScript | 5 |
| UI | Tailwind CSS | 4 |
| Database | Supabase (PostgreSQL) | — |
| Auth | Supabase Auth + RLS | — |
| Validation | Zod | 4.3.6 |
| React | React | 19.2.3 |
| Icons | lucide-react | 0.575.0 |

## 2. Architecture

- **Pattern:** Monolith — Next.js App Router with client-side hooks for data fetching
- **Auth:** Supabase Auth with JWT cookies, middleware session refresh, role verification on login
- **Database:** PostgreSQL via Supabase with Row Level Security (RLS) on all 18 tables
- **State Management:** React Context (AuthProvider, NotificationProvider) + custom hooks
- **API Routes:** 5 server routes (auth callback, OTP send/verify, lawyer profile, AI chat)
- **Real-time:** Supabase Realtime subscriptions for notifications

## 3. User Roles (6)

| Role | Purpose |
|------|---------|
| Client | File cases, pay fees, track status |
| Lawyer | Accept/decline cases, draft documents, submit to admin |
| Admin Court | Scrutinize cases, register, issue summons |
| Magistrate | Criminal bail decisions, preliminary hearings |
| Trial Judge | Evidence, arguments, deliver judgments |
| Stenographer | Record court proceedings |

## 4. Core Workflows

### Case Lifecycle (20 statuses)
```
draft → pending_lawyer_acceptance → lawyer_accepted → payment_pending
→ payment_confirmed → drafting → submitted_to_admin → under_scrutiny
→ returned_for_revision (loop) → registered → summon_issued
→ preliminary_hearing → issues_framed → transferred_to_trial
→ evidence_stage → arguments → reserved_for_judgment
→ judgment_delivered → closed / disposed
```

### Key User Flows
1. **Client files case** → selects type (civil/criminal/family) → uploads documents → selects lawyer
2. **Lawyer accepts/declines** → sets fee → client pays (installments supported)
3. **Lawyer drafts & submits** → Admin Court scrutinizes (7-point checklist)
4. **Admin registers case** → issues summons → schedules hearings
5. **Trial phase** → evidence → witnesses → arguments → judgment
6. **Criminal flow** → FIR details → bail applications → investigation reports → challan

## 5. Database Schema

**18 tables:** profiles, lawyer_profiles, cases, criminal_case_details, case_assignments, documents, case_activity_log, scrutiny_checklist, hearings, order_sheets, bail_applications, investigation_reports, witness_records, evidence_records, judgment_records, payments, notifications, otp_signatures

**15 enums**, **6 functions**, **10 triggers**, **35+ indexes**

All tables have RLS enabled with role-based policies.

## 6. API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/auth/callback | OAuth callback handler |
| POST | /api/lawyers/profile | Create lawyer profile (admin client) |
| POST | /api/otp/send | Send OTP for digital signature |
| POST | /api/otp/verify | Verify OTP and sign document/judgment |
| POST | /api/ai/chat | AI legal assistant (placeholder) |

## 7. Existing Tests

**None.** No test files, no test framework configured. This is a greenfield testing setup.

## 8. Validation Coverage

| Area | Schema | Status |
|------|--------|--------|
| Login | loginSchema (email, password, role) | Covered |
| Register | registerSchema (role, name, email, password + lawyer fields) | Covered |
| Civil Case | civilCaseSchema (title, description, type, sensitivity) | Covered |
| Criminal Case | criminalCaseSchema (+ FIR, police station, offense) | Covered |
| Family Case | familyCaseSchema (same as civil) | Covered |
| Payment | paymentSchema (method, account number, name) | Covered |
| Fee Structure | feeStructureSchema (amount, installments) | Covered |
| Notification | createNotificationSchema (user, title, message, type) | Covered |

## 9. Known Risk Areas

1. **RLS Policy Complexity** — Nested subqueries in RLS (e.g., documents checking cases checking assignments) can silently fail
2. **Status Transitions** — No server-side validation of allowed transitions; relies on client code guards
3. **Payment Simulation** — Payments are simulated (no real gateway); no idempotency checks
4. **Race Conditions** — Sequential Supabase calls in acceptCase/declineCase are not transactional
5. **Missing API Routes** — Most data operations happen client-side via Supabase SDK, not through API routes
6. **No Rate Limiting** — OTP endpoint has attempt limits but no rate limiting on requests
7. **Storage Policies** — Document storage bucket policies not defined in migrations
