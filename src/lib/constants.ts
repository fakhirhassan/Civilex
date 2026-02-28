export const APP_NAME = "Civilex";

export const ROLES = {
  CLIENT: "client",
  LAWYER: "lawyer",
  ADMIN_COURT: "admin_court",
  MAGISTRATE: "magistrate",
  TRIAL_JUDGE: "trial_judge",
  STENOGRAPHER: "stenographer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  client: "Client",
  lawyer: "Lawyer",
  admin_court: "Admin Court",
  magistrate: "Magistrate",
  trial_judge: "Trial Court Judge",
  stenographer: "Stenographer",
};

export const CASE_TYPES = {
  CIVIL: "civil",
  CRIMINAL: "criminal",
} as const;

export type CaseType = (typeof CASE_TYPES)[keyof typeof CASE_TYPES];

export const CASE_STATUS = {
  DRAFT: "draft",
  PENDING_LAWYER_ACCEPTANCE: "pending_lawyer_acceptance",
  LAWYER_ACCEPTED: "lawyer_accepted",
  PAYMENT_PENDING: "payment_pending",
  PAYMENT_CONFIRMED: "payment_confirmed",
  DRAFTING: "drafting",
  SUBMITTED_TO_ADMIN: "submitted_to_admin",
  UNDER_SCRUTINY: "under_scrutiny",
  RETURNED_FOR_REVISION: "returned_for_revision",
  REGISTERED: "registered",
  SUMMON_ISSUED: "summon_issued",
  PRELIMINARY_HEARING: "preliminary_hearing",
  ISSUES_FRAMED: "issues_framed",
  TRANSFERRED_TO_TRIAL: "transferred_to_trial",
  EVIDENCE_STAGE: "evidence_stage",
  ARGUMENTS: "arguments",
  RESERVED_FOR_JUDGMENT: "reserved_for_judgment",
  JUDGMENT_DELIVERED: "judgment_delivered",
  CLOSED: "closed",
  DISPOSED: "disposed",
} as const;

export type CaseStatus = (typeof CASE_STATUS)[keyof typeof CASE_STATUS];

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  draft: "Draft",
  pending_lawyer_acceptance: "Pending Lawyer Acceptance",
  lawyer_accepted: "Lawyer Accepted",
  payment_pending: "Payment Pending",
  payment_confirmed: "Payment Confirmed",
  drafting: "Drafting",
  submitted_to_admin: "Submitted to Admin Court",
  under_scrutiny: "Under Scrutiny",
  returned_for_revision: "Returned for Revision",
  registered: "Registered",
  summon_issued: "Summon Issued",
  preliminary_hearing: "Preliminary Hearing",
  issues_framed: "Issues Framed",
  transferred_to_trial: "Transferred to Trial",
  evidence_stage: "Evidence Stage",
  arguments: "Arguments",
  reserved_for_judgment: "Reserved for Judgment",
  judgment_delivered: "Judgment Delivered",
  closed: "Closed",
  disposed: "Disposed",
};

export const SPECIALIZATIONS = [
  "Civil",
  "Criminal",
  "Family",
  "Property",
  "Corporate",
  "Tax",
  "Constitutional",
  "Labour",
  "Banking",
  "Cyber",
] as const;

export const DOCUMENT_TYPES = {
  PLAINT: "plaint",
  WRITTEN_STATEMENT: "written_statement",
  AFFIDAVIT: "affidavit",
  EVIDENCE: "evidence",
  COURT_ORDER: "court_order",
  JUDGMENT: "judgment",
  APPLICATION: "application",
  FIR_COPY: "fir_copy",
  POWER_OF_ATTORNEY: "power_of_attorney",
  VAKALATNAMA: "vakalatnama",
  OTHER: "other",
} as const;

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  plaint: "Plaint",
  written_statement: "Written Statement",
  affidavit: "Affidavit",
  evidence: "Evidence",
  court_order: "Court Order",
  judgment: "Judgment",
  application: "Application",
  fir_copy: "FIR Copy",
  power_of_attorney: "Power of Attorney",
  vakalatnama: "Vakalatnama",
  other: "Other",
};

export const SIDEBAR_NAV = {
  client: [
    { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
    { label: "Cases", href: "/cases", icon: "Briefcase" },
    { label: "Lawyers", href: "/lawyers", icon: "Users" },
    { label: "Payments", href: "/payments", icon: "CreditCard" },
    { label: "Notifications", href: "/notifications", icon: "Bell" },
    { label: "Settings", href: "/settings", icon: "Settings" },
  ],
  lawyer: [
    { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
    { label: "Cases", href: "/cases", icon: "Briefcase" },
    { label: "Payments", href: "/payments", icon: "CreditCard" },
    { label: "Notifications", href: "/notifications", icon: "Bell" },
    { label: "AI Assistant", href: "/ai-assistant", icon: "Bot" },
    { label: "Settings", href: "/settings", icon: "Settings" },
  ],
  admin_court: [
    { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
    { label: "Scrutiny", href: "/cases/scrutiny", icon: "ClipboardCheck" },
    { label: "Cases", href: "/cases", icon: "Briefcase" },
    { label: "Notifications", href: "/notifications", icon: "Bell" },
    { label: "Settings", href: "/settings", icon: "Settings" },
  ],
  magistrate: [
    { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
    { label: "Criminal Cases", href: "/cases/criminal", icon: "Gavel" },
    { label: "Scrutiny", href: "/cases/scrutiny", icon: "ClipboardCheck" },
    { label: "Cases", href: "/cases", icon: "Briefcase" },
    { label: "Notifications", href: "/notifications", icon: "Bell" },
    { label: "Settings", href: "/settings", icon: "Settings" },
  ],
  trial_judge: [
    { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
    { label: "Trial Cases", href: "/cases", icon: "Gavel" },
    { label: "Notifications", href: "/notifications", icon: "Bell" },
    { label: "Settings", href: "/settings", icon: "Settings" },
  ],
  stenographer: [
    { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
    { label: "Cases", href: "/cases", icon: "Briefcase" },
    { label: "Notifications", href: "/notifications", icon: "Bell" },
    { label: "Settings", href: "/settings", icon: "Settings" },
  ],
} as const;
