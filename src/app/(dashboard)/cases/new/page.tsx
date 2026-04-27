"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Topbar from "@/components/layout/Topbar";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import FileUpload from "@/components/ui/FileUpload";
import Spinner from "@/components/ui/Spinner";
import LawyerCard from "@/components/features/lawyers/LawyerCard";
import { useCases } from "@/hooks/useCases";
import { useLawyers } from "@/hooks/useLawyers";
import { caseFormSchema } from "@/lib/validations/case";
import {
  CASE_CATEGORIES,
  CASE_CATEGORY_LABELS,
  CATEGORY_TO_CASE_TYPE,
  EVIDENCE_TYPE_LABELS,
  type CaseCategory,
} from "@/lib/constants";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Search,
  User,
  Users,
  AlertTriangle,
  FileText,
} from "lucide-react";

// ── Option lists ───────────────────────────────────────────────────────

const categoryOptions = (
  Object.keys(CASE_CATEGORIES) as Array<keyof typeof CASE_CATEGORIES>
).map((key) => ({
  value: CASE_CATEGORIES[key] as CaseCategory,
  label: CASE_CATEGORY_LABELS[CASE_CATEGORIES[key] as CaseCategory],
}));

const sensitivityOptions = [
  { value: "normal", label: "Normal" },
  { value: "sensitive", label: "Sensitive" },
  { value: "highly_sensitive", label: "Highly Sensitive" },
];

const evidenceTypeOptions = Object.entries(EVIDENCE_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
);

// ── Helpers ────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;

const stepLabels = [
  { number: 1, label: "Case Details" },
  { number: 2, label: "Select Lawyer" },
  { number: 3, label: "Upload Documents" },
  { number: 4, label: "Review & Submit" },
];

// ── Main form ──────────────────────────────────────────────────────────

function NewCaseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedLawyer = searchParams.get("lawyer");
  const { createCase, uploadDocument } = useCases();
  const { lawyers, isLoading: lawyersLoading, filters, updateFilters } = useLawyers();

  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");

  // ── Shared state ──────────────────────────────────────────────────
  const [category, setCategory] = useState<CaseCategory>("civil");
  const [sensitivity, setSensitivity] = useState("normal");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // ── Plaintiff state ───────────────────────────────────────────────
  const [plaintiff, setPlaintiff] = useState({
    plaintiff_name: "",
    plaintiff_phone: "",
    plaintiff_cnic: "",
    plaintiff_address: "",
  });

  // ── Defendant state ───────────────────────────────────────────────
  const [defendant, setDefendant] = useState({
    defendant_name: "",
    defendant_phone: "",
    defendant_cnic: "",
    defendant_email: "",
    defendant_address: "",
  });

  // ── Family-specific ───────────────────────────────────────────────
  const [marriageCertNumber, setMarriageCertNumber] = useState("");

  // ── Criminal state ────────────────────────────────────────────────
  const [criminal, setCriminal] = useState({
    fir_number: "",
    police_station: "",
    offense_description: "",
    offense_section: "",
    io_name: "",
    io_contact: "",
    arrest_date: "",
    evidence_type: "" as "oral" | "documentary" | "",
  });

  // ── Lawyer & files ────────────────────────────────────────────────
  const [selectedLawyerId, setSelectedLawyerId] = useState(preselectedLawyer ?? "");
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (preselectedLawyer) setSelectedLawyerId(preselectedLawyer);
  }, [preselectedLawyer]);

  const isCriminal = category === "criminal";
  const isMarriageDivorce = category === "marriage_divorce";

  // ── Field update helpers ──────────────────────────────────────────
  const setP = (field: string, value: string) =>
    setPlaintiff((prev) => ({ ...prev, [field]: value }));
  const setD = (field: string, value: string) =>
    setDefendant((prev) => ({ ...prev, [field]: value }));
  const setC = (field: string, value: string) =>
    setCriminal((prev) => ({ ...prev, [field]: value }));

  // ── Validation ────────────────────────────────────────────────────
  const validateStep1 = (): boolean => {
    setErrors({});

    const data = {
      case_type: CATEGORY_TO_CASE_TYPE[category],
      case_category: category,
      title,
      description,
      sensitivity: sensitivity as "normal" | "sensitive" | "highly_sensitive",
      ...plaintiff,
      ...defendant,
      ...(isMarriageDivorce && { marriage_certificate_number: marriageCertNumber }),
      ...(isCriminal && {
        fir_number: criminal.fir_number,
        police_station: criminal.police_station,
        offense_description: criminal.offense_description,
        offense_section: criminal.offense_section || undefined,
        io_name: criminal.io_name || undefined,
        io_contact: criminal.io_contact || undefined,
        arrest_date: criminal.arrest_date || undefined,
        evidence_type: criminal.evidence_type as "oral" | "documentary",
      }),
    };

    const result = caseFormSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as string;
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (step === 1 && !validateStep1()) return;
    setStep((s) => Math.min(s + 1, 4) as Step);
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1) as Step);

  // ── Submit ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError("");

    const { error, data } = await createCase({
      case_type: CATEGORY_TO_CASE_TYPE[category],
      case_category: category,
      title,
      description,
      sensitivity,
      lawyer_id: selectedLawyerId || undefined,
      ...plaintiff,
      defendant_name: defendant.defendant_name,
      defendant_email: defendant.defendant_email,
      defendant_phone: defendant.defendant_phone || undefined,
      defendant_cnic: defendant.defendant_cnic || undefined,
      defendant_address: defendant.defendant_address || undefined,
      marriage_certificate_number: isMarriageDivorce ? marriageCertNumber : undefined,
      criminal_details: isCriminal
        ? {
            fir_number: criminal.fir_number,
            police_station: criminal.police_station,
            offense_description: criminal.offense_description,
            offense_section: criminal.offense_section || undefined,
            io_name: criminal.io_name || undefined,
            io_contact: criminal.io_contact || undefined,
            arrest_date: criminal.arrest_date || undefined,
            evidence_type: criminal.evidence_type as "oral" | "documentary",
          }
        : undefined,
    });

    if (error) {
      setSubmitError(error);
      setIsSubmitting(false);
      return;
    }

    if (data && files.length > 0) {
      for (const file of files) {
        await uploadDocument(data.id, file, "other", file.name);
      }
    }

    router.push("/cases");
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <>
      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-center">
        {stepLabels.map((s, i) => (
          <div key={s.number} className="flex items-center">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                step >= s.number
                  ? "bg-primary text-white"
                  : "bg-cream-dark text-muted"
              }`}
            >
              {step > s.number ? <Check className="h-5 w-5" /> : s.number}
            </div>
            <span
              className={`ml-2 hidden text-sm sm:inline ${
                step >= s.number ? "font-medium text-primary" : "text-muted"
              }`}
            >
              {s.label}
            </span>
            {i < stepLabels.length - 1 && (
              <div
                className={`mx-4 h-0.5 w-8 sm:w-16 ${
                  step > s.number ? "bg-primary" : "bg-cream-dark"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {submitError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-danger bg-danger-light p-3 text-sm text-danger">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {submitError}
        </div>
      )}

      {/* ── Step 1: Case Details ─────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Case Classification */}
          <Card>
            <h2 className="mb-5 text-lg font-semibold text-primary">
              Case Classification
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                id="category"
                label="Case Type / Category"
                options={categoryOptions}
                value={category}
                onChange={(e) => setCategory(e.target.value as CaseCategory)}
              />
              <Select
                id="sensitivity"
                label="Sensitivity Level"
                options={sensitivityOptions}
                value={sensitivity}
                onChange={(e) => setSensitivity(e.target.value)}
              />
            </div>

            <div className="mt-4 space-y-4">
              <Input
                id="title"
                label="Case Title"
                placeholder="Enter a clear, descriptive case title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={errors.title}
              />
              <Textarea
                id="description"
                label="Case Description"
                placeholder="Describe the case facts, circumstances, and relief sought…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                error={errors.description}
                rows={4}
              />
            </div>
          </Card>

          {/* Plaintiff Details */}
          <Card>
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-primary">
              <User className="h-5 w-5" />
              Plaintiff (Your) Details
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                id="plaintiff_name"
                label="Full Name"
                placeholder="e.g., Muhammad Ali Khan"
                value={plaintiff.plaintiff_name}
                onChange={(e) => setP("plaintiff_name", e.target.value)}
                error={errors.plaintiff_name}
              />
              <Input
                id="plaintiff_cnic"
                label="CNIC"
                placeholder="XXXXX-XXXXXXX-X"
                value={plaintiff.plaintiff_cnic}
                onChange={(e) => setP("plaintiff_cnic", e.target.value)}
                error={errors.plaintiff_cnic}
              />
              <Input
                id="plaintiff_phone"
                label="Phone Number"
                placeholder="03XXXXXXXXX"
                value={plaintiff.plaintiff_phone}
                onChange={(e) => setP("plaintiff_phone", e.target.value)}
                error={errors.plaintiff_phone}
              />
              <div className="md:col-span-2">
                <Input
                  id="plaintiff_address"
                  label="Address"
                  placeholder="Full residential / office address"
                  value={plaintiff.plaintiff_address}
                  onChange={(e) => setP("plaintiff_address", e.target.value)}
                  error={errors.plaintiff_address}
                />
              </div>
            </div>
          </Card>

          {/* Defendant Details */}
          <Card>
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-primary">
              <Users className="h-5 w-5" />
              Defendant (Opposing Party) Details
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                id="defendant_name"
                label="Full Name"
                placeholder="e.g., Ahmed Hassan"
                value={defendant.defendant_name}
                onChange={(e) => setD("defendant_name", e.target.value)}
                error={errors.defendant_name}
              />
              <Input
                id="defendant_cnic"
                label="CNIC (Optional)"
                placeholder="XXXXX-XXXXXXX-X"
                value={defendant.defendant_cnic}
                onChange={(e) => setD("defendant_cnic", e.target.value)}
                error={errors.defendant_cnic}
              />
              <Input
                id="defendant_phone"
                label="Phone Number (Optional)"
                placeholder="03XXXXXXXXX"
                value={defendant.defendant_phone}
                onChange={(e) => setD("defendant_phone", e.target.value)}
                error={errors.defendant_phone}
              />
              <Input
                id="defendant_email"
                label="Email Address"
                type="email"
                placeholder="defendant@example.com"
                value={defendant.defendant_email}
                onChange={(e) => setD("defendant_email", e.target.value)}
                error={errors.defendant_email}
                required
              />
              <div className="md:col-span-2">
                <Input
                  id="defendant_address"
                  label="Address (Optional)"
                  placeholder="Defendant's residential / office address"
                  value={defendant.defendant_address}
                  onChange={(e) => setD("defendant_address", e.target.value)}
                />
              </div>
            </div>
          </Card>

          {/* Marriage / Divorce certificate */}
          {isMarriageDivorce && (
            <Card>
              <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-primary">
                <FileText className="h-5 w-5" />
                Marriage / Divorce Certificate
              </h2>
              <Input
                id="marriage_certificate_number"
                label="Certificate Number"
                placeholder="e.g., MC-2024-00123"
                value={marriageCertNumber}
                onChange={(e) => setMarriageCertNumber(e.target.value)}
                error={errors.marriage_certificate_number}
              />
            </Card>
          )}

          {/* Criminal case details */}
          {isCriminal && (
            <Card>
              <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-primary">
                <AlertTriangle className="h-5 w-5 text-danger" />
                Criminal Case Details
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    id="fir_number"
                    label="FIR Number"
                    placeholder="e.g., 123/2026"
                    value={criminal.fir_number}
                    onChange={(e) => setC("fir_number", e.target.value)}
                    error={errors.fir_number}
                  />
                  <Input
                    id="police_station"
                    label="Police Station"
                    placeholder="Enter police station name"
                    value={criminal.police_station}
                    onChange={(e) => setC("police_station", e.target.value)}
                    error={errors.police_station}
                  />
                </div>

                <Textarea
                  id="offense_description"
                  label="Offense Description"
                  placeholder="Describe the offense in detail…"
                  value={criminal.offense_description}
                  onChange={(e) => setC("offense_description", e.target.value)}
                  error={errors.offense_description}
                  rows={3}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    id="offense_section"
                    label="Offense Section / PPC (Optional)"
                    placeholder="e.g., Section 302 PPC"
                    value={criminal.offense_section}
                    onChange={(e) => setC("offense_section", e.target.value)}
                  />
                  <Input
                    id="arrest_date"
                    label="Date of Arrest (Optional)"
                    type="date"
                    value={criminal.arrest_date}
                    onChange={(e) => setC("arrest_date", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    id="io_name"
                    label="Investigation Officer Name (Optional)"
                    placeholder="IO full name"
                    value={criminal.io_name}
                    onChange={(e) => setC("io_name", e.target.value)}
                  />
                  <Input
                    id="io_contact"
                    label="IO Contact Number (Optional)"
                    placeholder="03XXXXXXXXX"
                    value={criminal.io_contact}
                    onChange={(e) => setC("io_contact", e.target.value)}
                  />
                </div>

                {/* Evidence type — required */}
                <div>
                  <p className="mb-2 text-sm font-medium text-primary">
                    Evidence Type <span className="text-danger">*</span>
                  </p>
                  <div className="flex gap-4">
                    {evidenceTypeOptions.map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex flex-1 cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-colors ${
                          criminal.evidence_type === opt.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name="evidence_type"
                          value={opt.value}
                          checked={criminal.evidence_type === opt.value}
                          onChange={() => setC("evidence_type", opt.value)}
                          className="h-4 w-4 accent-primary"
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {opt.label}
                          </p>
                          <p className="text-xs text-muted">
                            {opt.value === "oral"
                              ? "Witnesses, statements, testimonies"
                              : "FIR copies, CCTV, reports, documents"}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.evidence_type && (
                    <p className="mt-1 text-xs text-danger">
                      {errors.evidence_type}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          <div className="flex justify-end">
            <Button onClick={nextStep} size="lg">
              Next: Select Lawyer
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Select Lawyer ─────────────────────────────────── */}
      {step === 2 && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-primary">
            Select a Lawyer (Optional)
          </h2>
          <p className="mb-4 text-sm text-muted">
            Choose a lawyer now or skip this step and assign one later.
          </p>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              className="w-full rounded-lg border border-border bg-cream-light py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Search lawyers by name…"
              value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
            />
          </div>

          {selectedLawyerId && (
            <div className="mb-4 flex items-center justify-between rounded-lg border-2 border-primary bg-primary/5 px-3 py-2 text-sm">
              <span className="font-medium text-primary">Lawyer selected.</span>
              <button
                type="button"
                onClick={() => setSelectedLawyerId("")}
                className="text-danger hover:underline"
              >
                Remove
              </button>
            </div>
          )}

          {lawyersLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <div className="max-h-[400px] space-y-3 overflow-y-auto">
              {lawyers.map((lawyer) => (
                <div
                  key={lawyer.id}
                  className={`rounded-lg border-2 transition-colors ${
                    selectedLawyerId === lawyer.id
                      ? "border-primary"
                      : "border-transparent"
                  }`}
                >
                  <LawyerCard
                    lawyer={lawyer}
                    showSelectButton
                    onSelect={setSelectedLawyerId}
                  />
                </div>
              ))}
              {lawyers.length === 0 && (
                <p className="py-8 text-center text-sm text-muted">
                  No lawyers found.
                </p>
              )}
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={prevStep}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={nextStep}>
              {selectedLawyerId ? "Next: Upload Documents" : "Skip & Continue"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* ── Step 3: Upload Documents ──────────────────────────────── */}
      {step === 3 && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-primary">
            Upload Supporting Documents
          </h2>
          <p className="mb-4 text-sm text-muted">
            You can upload documents now or add them later from the case file.
            Accepted formats: PDF, images, Word, text — max 20 MB each.
          </p>

          <FileUpload
            label="Case Documents"
            onFilesChange={setFiles}
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.txt"
            maxSizeMB={20}
          />

          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={prevStep}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={nextStep}>
              Next: Review
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* ── Step 4: Review & Submit ───────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-4">
          <Card>
            <h2 className="mb-5 text-lg font-semibold text-primary">
              Review & Submit
            </h2>

            {/* Classification */}
            <section className="mb-4 rounded-lg border border-border p-4">
              <h3 className="mb-3 text-sm font-semibold text-primary">
                Case Classification
              </h3>
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Category</dt>
                  <dd className="font-medium">
                    {CASE_CATEGORY_LABELS[category]}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Sensitivity</dt>
                  <dd className="font-medium capitalize">
                    {sensitivity.replace(/_/g, " ")}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted">Title</dt>
                  <dd className="font-medium">{title}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted">Description</dt>
                  <dd className="whitespace-pre-wrap text-foreground">
                    {description}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Plaintiff */}
            <section className="mb-4 rounded-lg border border-border p-4">
              <h3 className="mb-3 text-sm font-semibold text-primary">
                Plaintiff Details
              </h3>
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Name</dt>
                  <dd className="font-medium">{plaintiff.plaintiff_name}</dd>
                </div>
                <div>
                  <dt className="text-muted">CNIC</dt>
                  <dd className="font-medium">{plaintiff.plaintiff_cnic}</dd>
                </div>
                <div>
                  <dt className="text-muted">Phone</dt>
                  <dd className="font-medium">{plaintiff.plaintiff_phone}</dd>
                </div>
                <div>
                  <dt className="text-muted">Address</dt>
                  <dd className="font-medium">{plaintiff.plaintiff_address}</dd>
                </div>
              </dl>
            </section>

            {/* Defendant */}
            <section className="mb-4 rounded-lg border border-border p-4">
              <h3 className="mb-3 text-sm font-semibold text-primary">
                Defendant Details
              </h3>
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Name</dt>
                  <dd className="font-medium">{defendant.defendant_name}</dd>
                </div>
                {defendant.defendant_cnic && (
                  <div>
                    <dt className="text-muted">CNIC</dt>
                    <dd className="font-medium">{defendant.defendant_cnic}</dd>
                  </div>
                )}
                {defendant.defendant_phone && (
                  <div>
                    <dt className="text-muted">Phone</dt>
                    <dd className="font-medium">{defendant.defendant_phone}</dd>
                  </div>
                )}
                {defendant.defendant_email && (
                  <div>
                    <dt className="text-muted">Email</dt>
                    <dd className="font-medium">{defendant.defendant_email}</dd>
                  </div>
                )}
                {defendant.defendant_address && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted">Address</dt>
                    <dd className="font-medium">{defendant.defendant_address}</dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Marriage/Divorce certificate */}
            {isMarriageDivorce && marriageCertNumber && (
              <section className="mb-4 rounded-lg border border-border p-4">
                <h3 className="mb-3 text-sm font-semibold text-primary">
                  Certificate
                </h3>
                <p className="text-sm">
                  <span className="text-muted">Number:</span>{" "}
                  <span className="font-medium">{marriageCertNumber}</span>
                </p>
              </section>
            )}

            {/* Criminal details */}
            {isCriminal && (
              <section className="mb-4 rounded-lg border border-border p-4">
                <h3 className="mb-3 text-sm font-semibold text-primary">
                  Criminal Details
                </h3>
                <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted">FIR Number</dt>
                    <dd className="font-medium">{criminal.fir_number}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Police Station</dt>
                    <dd className="font-medium">{criminal.police_station}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted">Offense</dt>
                    <dd>{criminal.offense_description}</dd>
                  </div>
                  {criminal.offense_section && (
                    <div>
                      <dt className="text-muted">Section</dt>
                      <dd>{criminal.offense_section}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-muted">Evidence Type</dt>
                    <dd className="font-medium capitalize">
                      {criminal.evidence_type === "oral"
                        ? "Oral Evidence"
                        : "Documentary / Evidential"}
                    </dd>
                  </div>
                </dl>
              </section>
            )}

            {/* Lawyer */}
            <section className="mb-4 rounded-lg border border-border p-4">
              <h3 className="mb-2 text-sm font-semibold text-primary">
                Lawyer
              </h3>
              <p className="text-sm">
                {selectedLawyerId ? (
                  <span className="font-medium text-primary">
                    Lawyer selected — pending their acceptance
                  </span>
                ) : (
                  <span className="text-muted">
                    No lawyer selected. You can assign one later.
                  </span>
                )}
              </p>
            </section>

            {/* Documents */}
            <section className="rounded-lg border border-border p-4">
              <h3 className="mb-2 text-sm font-semibold text-primary">
                Documents
              </h3>
              {files.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-muted" />
                      <span className="truncate">{f.name}</span>
                      <span className="shrink-0 text-xs text-muted">
                        ({(f.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">
                  No documents added. You can upload them from the case file later.
                </p>
              )}
            </section>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={prevStep}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting} size="lg">
              <Check className="h-4 w-4" />
              Submit Case
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Page wrapper ───────────────────────────────────────────────────────

export default function NewCasePage() {
  return (
    <div>
      <Topbar title="File a New Case" />
      <div className="p-6">
        <Suspense
          fallback={
            <div className="flex justify-center py-16">
              <Spinner size="lg" />
            </div>
          }
        >
          <NewCaseForm />
        </Suspense>
      </div>
    </div>
  );
}
