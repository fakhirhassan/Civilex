"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useWitnesses } from "@/hooks/useWitnesses";
import {
  WITNESS_STATUS_LABELS,
  WITNESS_SIDE_LABELS,
} from "@/types/trial";
import type {
  WitnessRecordWithRelations,
  WitnessStatus,
  WitnessSide,
} from "@/types/trial";
import { formatDateTime } from "@/lib/utils";
import {
  Users,
  Plus,
  AlertCircle,
  UserCheck,
  MessageSquare,
  Send,
} from "lucide-react";

interface WitnessPanelProps {
  caseId: string;
  isJudge?: boolean;
  isLawyer?: boolean;
  isStenographer?: boolean;
}

const witnessStatusVariants: Record<
  string,
  "default" | "success" | "danger" | "warning" | "info" | "primary"
> = {
  listed: "default",
  summoned: "info",
  examined: "primary",
  cross_examined: "success",
  recalled: "warning",
  hostile: "danger",
  excused: "default",
};

export default function WitnessPanel({
  caseId,
  isJudge = false,
  isLawyer = false,
  isStenographer = false,
}: WitnessPanelProps) {
  const { witnesses, isLoading, addWitness, updateWitness, summonWitness } =
    useWitnesses(caseId);

  const [showForm, setShowForm] = useState(false);
  const [witnessName, setWitnessName] = useState("");
  const [witnessCnic, setWitnessCnic] = useState("");
  const [witnessContact, setWitnessContact] = useState("");
  const [witnessAddress, setWitnessAddress] = useState("");
  const [witnessSide, setWitnessSide] = useState<WitnessSide>("prosecution");
  const [relationToCase, setRelationToCase] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Examination state
  const [examiningId, setExaminingId] = useState<string | null>(null);
  const [statement, setStatement] = useState("");
  const [crossExamination, setCrossExamination] = useState("");
  const [reExamination, setReExamination] = useState("");
  const [judgeNotes, setJudgeNotes] = useState("");

  const canAdd = isLawyer || isJudge;
  const canExamine = isLawyer || isJudge || isStenographer;

  const handleAddWitness = async () => {
    if (!witnessName.trim()) {
      setError("Witness name is required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const result = await addWitness({
      witness_name: witnessName.trim(),
      witness_cnic: witnessCnic.trim() || undefined,
      witness_contact: witnessContact.trim() || undefined,
      witness_address: witnessAddress.trim() || undefined,
      witness_side: witnessSide,
      relation_to_case: relationToCase.trim() || undefined,
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setWitnessName("");
      setWitnessCnic("");
      setWitnessContact("");
      setWitnessAddress("");
      setRelationToCase("");
      setShowForm(false);
    }
  };

  const handleSummon = async (witnessId: string) => {
    setIsSubmitting(true);
    await summonWitness(witnessId);
    setIsSubmitting(false);
  };

  const handleExamine = async (
    witnessId: string,
    newStatus: WitnessStatus
  ) => {
    setIsSubmitting(true);
    setError("");

    const result = await updateWitness(witnessId, {
      statement: statement.trim() || undefined,
      cross_examination: crossExamination.trim() || undefined,
      re_examination: reExamination.trim() || undefined,
      judge_notes: judgeNotes.trim() || undefined,
      status: newStatus,
      examination_date: new Date().toISOString().split("T")[0],
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setExaminingId(null);
      setStatement("");
      setCrossExamination("");
      setReExamination("");
      setJudgeNotes("");
    }
  };

  const startExamining = (witness: WitnessRecordWithRelations) => {
    setExaminingId(witness.id);
    setStatement(witness.statement || "");
    setCrossExamination(witness.cross_examination || "");
    setReExamination(witness.re_examination || "");
    setJudgeNotes(witness.judge_notes || "");
  };

  const prosecutionWitnesses = witnesses.filter(
    (w) => w.witness_side === "prosecution"
  );
  const defenseWitnesses = witnesses.filter(
    (w) => w.witness_side === "defense"
  );
  const courtWitnesses = witnesses.filter(
    (w) => w.witness_side === "court"
  );

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-base font-semibold text-primary">
          <Users className="mr-2 inline h-4 w-4" />
          Witnesses
        </h4>
        <div className="flex items-center gap-2">
          <Badge variant="info">{witnesses.length} total</Badge>
          {canAdd && !showForm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4" />
              Add Witness
            </Button>
          )}
        </div>
      </div>

      {/* Witness lists by side */}
      {witnesses.length > 0 && (
        <div className="space-y-4">
          {prosecutionWitnesses.length > 0 && (
            <div>
              <h5 className="mb-2 text-xs font-semibold uppercase text-muted">
                Prosecution / Plaintiff Witnesses ({prosecutionWitnesses.length})
              </h5>
              <div className="space-y-2">
                {prosecutionWitnesses.map((w) => (
                  <WitnessCard
                    key={w.id}
                    witness={w}
                    isJudge={isJudge}
                    canExamine={canExamine}
                    isExamining={examiningId === w.id}
                    onStartExamine={() => startExamining(w)}
                    onCancelExamine={() => {
                      setExaminingId(null);
                      setError("");
                    }}
                    onSummon={() => handleSummon(w.id)}
                    statement={statement}
                    crossExamination={crossExamination}
                    reExamination={reExamination}
                    judgeNotes={judgeNotes}
                    onStatementChange={setStatement}
                    onCrossExaminationChange={setCrossExamination}
                    onReExaminationChange={setReExamination}
                    onJudgeNotesChange={setJudgeNotes}
                    onExamine={(status) => handleExamine(w.id, status)}
                    isSubmitting={isSubmitting}
                    error={examiningId === w.id ? error : ""}
                  />
                ))}
              </div>
            </div>
          )}

          {defenseWitnesses.length > 0 && (
            <div>
              <h5 className="mb-2 text-xs font-semibold uppercase text-muted">
                Defense / Defendant Witnesses ({defenseWitnesses.length})
              </h5>
              <div className="space-y-2">
                {defenseWitnesses.map((w) => (
                  <WitnessCard
                    key={w.id}
                    witness={w}
                    isJudge={isJudge}
                    canExamine={canExamine}
                    isExamining={examiningId === w.id}
                    onStartExamine={() => startExamining(w)}
                    onCancelExamine={() => {
                      setExaminingId(null);
                      setError("");
                    }}
                    onSummon={() => handleSummon(w.id)}
                    statement={statement}
                    crossExamination={crossExamination}
                    reExamination={reExamination}
                    judgeNotes={judgeNotes}
                    onStatementChange={setStatement}
                    onCrossExaminationChange={setCrossExamination}
                    onReExaminationChange={setReExamination}
                    onJudgeNotesChange={setJudgeNotes}
                    onExamine={(status) => handleExamine(w.id, status)}
                    isSubmitting={isSubmitting}
                    error={examiningId === w.id ? error : ""}
                  />
                ))}
              </div>
            </div>
          )}

          {courtWitnesses.length > 0 && (
            <div>
              <h5 className="mb-2 text-xs font-semibold uppercase text-muted">
                Court Witnesses ({courtWitnesses.length})
              </h5>
              <div className="space-y-2">
                {courtWitnesses.map((w) => (
                  <WitnessCard
                    key={w.id}
                    witness={w}
                    isJudge={isJudge}
                    canExamine={canExamine}
                    isExamining={examiningId === w.id}
                    onStartExamine={() => startExamining(w)}
                    onCancelExamine={() => {
                      setExaminingId(null);
                      setError("");
                    }}
                    onSummon={() => handleSummon(w.id)}
                    statement={statement}
                    crossExamination={crossExamination}
                    reExamination={reExamination}
                    judgeNotes={judgeNotes}
                    onStatementChange={setStatement}
                    onCrossExaminationChange={setCrossExamination}
                    onReExaminationChange={setReExamination}
                    onJudgeNotesChange={setJudgeNotes}
                    onExamine={(status) => handleExamine(w.id, status)}
                    isSubmitting={isSubmitting}
                    error={examiningId === w.id ? error : ""}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {witnesses.length === 0 && !showForm && (
        <p className="text-sm text-muted">No witnesses listed yet.</p>
      )}

      {/* Add witness form */}
      {showForm && (
        <div className="mt-3 space-y-3 rounded-lg border border-primary/20 bg-cream/30 p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Witness Name *
              </label>
              <input
                type="text"
                value={witnessName}
                onChange={(e) => setWitnessName(e.target.value)}
                placeholder="Full name of witness"
                className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Side
              </label>
              <select
                value={witnessSide}
                onChange={(e) => setWitnessSide(e.target.value as WitnessSide)}
                className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="prosecution">Prosecution / Plaintiff</option>
                <option value="defense">Defense / Defendant</option>
                <option value="court">Court Witness</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                CNIC
              </label>
              <input
                type="text"
                value={witnessCnic}
                onChange={(e) => setWitnessCnic(e.target.value)}
                placeholder="CNIC number"
                className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Contact
              </label>
              <input
                type="text"
                value={witnessContact}
                onChange={(e) => setWitnessContact(e.target.value)}
                placeholder="Phone number"
                className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Relation to Case
            </label>
            <input
              type="text"
              value={relationToCase}
              onChange={(e) => setRelationToCase(e.target.value)}
              placeholder="e.g. Eyewitness, Neighbor, Expert..."
              className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              size="sm"
              onClick={handleAddWitness}
              isLoading={isSubmitting}
            >
              Add Witness
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function WitnessCard({
  witness,
  isJudge,
  canExamine,
  isExamining,
  onStartExamine,
  onCancelExamine,
  onSummon,
  statement,
  crossExamination,
  reExamination,
  judgeNotes,
  onStatementChange,
  onCrossExaminationChange,
  onReExaminationChange,
  onJudgeNotesChange,
  onExamine,
  isSubmitting,
  error,
}: {
  witness: WitnessRecordWithRelations;
  isJudge: boolean;
  canExamine: boolean;
  isExamining: boolean;
  onStartExamine: () => void;
  onCancelExamine: () => void;
  onSummon: () => void;
  statement: string;
  crossExamination: string;
  reExamination: string;
  judgeNotes: string;
  onStatementChange: (val: string) => void;
  onCrossExaminationChange: (val: string) => void;
  onReExaminationChange: (val: string) => void;
  onJudgeNotesChange: (val: string) => void;
  onExamine: (status: WitnessStatus) => void;
  isSubmitting: boolean;
  error: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {witness.witness_name}
          </span>
          <Badge
            variant={witnessStatusVariants[witness.status] || "default"}
          >
            {WITNESS_STATUS_LABELS[witness.status]}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {witness.examination_date && (
            <span className="text-xs text-muted">
              Examined: {witness.examination_date}
            </span>
          )}
        </div>
      </div>

      <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted">
        {witness.relation_to_case && <span>{witness.relation_to_case}</span>}
        {witness.witness_contact && <span>Tel: {witness.witness_contact}</span>}
        {witness.witness_cnic && <span>CNIC: {witness.witness_cnic}</span>}
      </div>

      {/* Show existing examination records */}
      {witness.statement && (
        <div className="mt-2">
          <p className="text-xs font-medium text-foreground">Statement:</p>
          <p className="text-xs text-muted whitespace-pre-wrap">
            {witness.statement}
          </p>
        </div>
      )}
      {witness.cross_examination && (
        <div className="mt-1">
          <p className="text-xs font-medium text-foreground">
            Cross-Examination:
          </p>
          <p className="text-xs text-muted whitespace-pre-wrap">
            {witness.cross_examination}
          </p>
        </div>
      )}
      {witness.re_examination && (
        <div className="mt-1">
          <p className="text-xs font-medium text-foreground">
            Re-Examination:
          </p>
          <p className="text-xs text-muted whitespace-pre-wrap">
            {witness.re_examination}
          </p>
        </div>
      )}
      {witness.judge_notes && (
        <div className="mt-2 rounded-lg border border-border bg-cream/50 p-2">
          <p className="text-xs font-medium text-foreground">
            Judge Notes: {witness.judge_notes}
          </p>
        </div>
      )}

      {/* Action buttons */}
      {!isExamining && (
        <div className="mt-3 flex flex-wrap gap-2">
          {isJudge && witness.status === "listed" && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSummon}
              isLoading={isSubmitting}
            >
              <Send className="h-4 w-4" />
              Summon
            </Button>
          )}
          {canExamine &&
            ["summoned", "examined", "recalled"].includes(witness.status) && (
              <Button
                size="sm"
                variant="outline"
                onClick={onStartExamine}
              >
                <MessageSquare className="h-4 w-4" />
                {witness.status === "summoned"
                  ? "Record Examination"
                  : "Update Examination"}
              </Button>
            )}
        </div>
      )}

      {/* Examination form */}
      {isExamining && (
        <div className="mt-3 space-y-3 rounded-lg border border-primary/20 bg-cream/30 p-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Statement (Examination-in-Chief)
            </label>
            <textarea
              value={statement}
              onChange={(e) => onStatementChange(e.target.value)}
              rows={3}
              placeholder="Record the witness statement..."
              className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Cross-Examination
            </label>
            <textarea
              value={crossExamination}
              onChange={(e) => onCrossExaminationChange(e.target.value)}
              rows={3}
              placeholder="Record cross-examination..."
              className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Re-Examination
            </label>
            <textarea
              value={reExamination}
              onChange={(e) => onReExaminationChange(e.target.value)}
              rows={2}
              placeholder="Record re-examination (if any)..."
              className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {isJudge && (
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Judge Notes
              </label>
              <textarea
                value={judgeNotes}
                onChange={(e) => onJudgeNotesChange(e.target.value)}
                rows={2}
                placeholder="Judge observations..."
                className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => onExamine("examined")}
              isLoading={isSubmitting}
            >
              <UserCheck className="h-4 w-4" />
              Save as Examined
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onExamine("cross_examined")}
              isLoading={isSubmitting}
            >
              Save as Cross-Examined
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancelExamine}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
