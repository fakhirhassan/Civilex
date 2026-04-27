"use client";

import type { PlaintDraft } from "@/types/draft";

interface Props {
  draft: PlaintDraft;
}

export default function PlaintPreview({ draft }: Props) {
  return (
    <div className="rounded-lg border border-border bg-white p-8 font-serif text-[15px] leading-7 text-black">
      <div className="text-center">
        <p className="font-bold underline">{draft.cause_title || "[CAUSE TITLE]"}</p>
      </div>

      <div className="mt-6 whitespace-pre-wrap">
        {draft.parties_block || "[PARTIES BLOCK]"}
      </div>

      {draft.suit_subject && (
        <div className="mt-6 text-center">
          <p className="font-bold underline">{draft.suit_subject}</p>
        </div>
      )}

      <p className="mt-6 font-semibold">Respectfully Sheweth:-</p>

      <ol className="mt-3 list-none space-y-3">
        {draft.facts.length === 0 ? (
          <li className="text-muted italic">[No facts added]</li>
        ) : (
          draft.facts.map((f, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 font-semibold">{f.number}.</span>
              <span className="whitespace-pre-wrap">{f.text || "[empty paragraph]"}</span>
            </li>
          ))
        )}
      </ol>

      {draft.cause_of_action && (
        <p className="mt-4 whitespace-pre-wrap">{draft.cause_of_action}</p>
      )}

      {draft.limitation_clause && (
        <p className="mt-4 whitespace-pre-wrap">{draft.limitation_clause}</p>
      )}

      {draft.court_fees_paid && (
        <p className="mt-4 whitespace-pre-wrap">{draft.court_fees_paid}</p>
      )}

      {draft.jurisdiction_clause && (
        <p className="mt-4 whitespace-pre-wrap">{draft.jurisdiction_clause}</p>
      )}

      {draft.reliefs_sought && (
        <div className="mt-6">
          <p className="font-semibold">Prayer:</p>
          <p className="mt-2 whitespace-pre-wrap pl-4">{draft.reliefs_sought}</p>
        </div>
      )}

      <div className="mt-10 text-right">
        <p>_____________________</p>
        <p>Plaintiff</p>
      </div>

      {draft.verification_clause && (
        <div className="mt-8 border-t border-border pt-4">
          <p className="font-semibold">Verification:</p>
          <p className="mt-2 whitespace-pre-wrap">{draft.verification_clause}</p>
        </div>
      )}
    </div>
  );
}
