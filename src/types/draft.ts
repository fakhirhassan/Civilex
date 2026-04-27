export type DraftStatus = "in_progress" | "submitted" | "returned" | "approved";

export interface PlaintFact {
  number: number;
  text: string;
}

export interface PlaintDraft {
  id: string;
  case_id: string;
  cause_title: string;
  parties_block: string;
  suit_subject: string;
  jurisdiction_clause: string;
  facts: PlaintFact[];
  cause_of_action: string;
  limitation_clause: string;
  court_fees_paid: string;
  reliefs_sought: string;
  verification_clause: string;
  status: DraftStatus;
  revision_notes: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PlaintDraftSavePayload {
  cause_title?: string;
  parties_block?: string;
  suit_subject?: string;
  jurisdiction_clause?: string;
  facts?: PlaintFact[];
  cause_of_action?: string;
  limitation_clause?: string;
  court_fees_paid?: string;
  reliefs_sought?: string;
  verification_clause?: string;
}

export const DRAFT_SECTION_LABELS = {
  cause_title: "Cause Title (Court name & venue)",
  parties_block: "Parties (Plaintiff vs Defendant)",
  suit_subject: "Suit Subject (Heading)",
  jurisdiction_clause: "Jurisdiction",
  facts: "Facts (Numbered Paragraphs)",
  cause_of_action: "Cause of Action",
  limitation_clause: "Limitation",
  court_fees_paid: "Court Fees",
  reliefs_sought: "Reliefs / Prayer",
  verification_clause: "Verification",
} as const;

export type DraftSectionKey = keyof typeof DRAFT_SECTION_LABELS;

// Sections that must be filled before submitting to admin court
export const REQUIRED_SECTIONS: DraftSectionKey[] = [
  "cause_title",
  "parties_block",
  "suit_subject",
  "facts",
  "reliefs_sought",
];
