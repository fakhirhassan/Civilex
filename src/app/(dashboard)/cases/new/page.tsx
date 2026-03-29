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
import { civilCaseSchema, criminalCaseSchema, familyCaseSchema } from "@/lib/validations/case";
import { ArrowLeft, ArrowRight, Check, Search } from "lucide-react";

const caseTypeOptions = [
  { value: "civil", label: "Civil Case" },
  { value: "criminal", label: "Criminal Case" },
  { value: "family", label: "Family Case" },
];

const sensitivityOptions = [
  { value: "normal", label: "Normal" },
  { value: "sensitive", label: "Sensitive" },
  { value: "highly_sensitive", label: "Highly Sensitive" },
];

type Step = 1 | 2 | 3 | 4;

function NewCaseForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedLawyer = searchParams.get("lawyer");
  const { createCase, uploadDocument } = useCases();
  const {
    lawyers,
    isLoading: lawyersLoading,
    filters,
    updateFilters,
  } = useLawyers();

  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");

  // Form state
  const [caseType, setCaseType] = useState<"civil" | "criminal" | "family">("civil");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    sensitivity: "normal",
  });
  const [criminalData, setCriminalData] = useState({
    fir_number: "",
    police_station: "",
    offense_description: "",
    offense_section: "",
    io_name: "",
    io_contact: "",
    arrest_date: "",
  });
  const [selectedLawyerId, setSelectedLawyerId] = useState<string>(
    preselectedLawyer || ""
  );
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    if (preselectedLawyer) {
      setSelectedLawyerId(preselectedLawyer);
    }
  }, [preselectedLawyer]);

  const isCriminal = caseType === "criminal";

  const validateStep = (s: Step): boolean => {
    setErrors({});

    if (s === 1) {
      const schema =
        caseType === "criminal"
          ? criminalCaseSchema
          : caseType === "family"
            ? familyCaseSchema
            : civilCaseSchema;
      const data =
        caseType === "criminal"
          ? {
              ...formData,
              case_type: "criminal" as const,
              ...criminalData,
            }
          : caseType === "family"
            ? {
                ...formData,
                case_type: "family" as const,
              }
            : {
                ...formData,
                case_type: "civil" as const,
              };
      const result = schema.safeParse(data);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.issues.forEach((err) => {
          if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
        return false;
      }
      return true;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, 4) as Step);
    }
  };

  const prevStep = () => {
    setStep((s) => Math.max(s - 1, 1) as Step);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError("");

    const { error, data } = await createCase({
      case_type: caseType,
      title: formData.title,
      description: formData.description,
      sensitivity: formData.sensitivity,
      lawyer_id: selectedLawyerId || undefined,
      criminal_details: isCriminal
        ? {
            fir_number: criminalData.fir_number,
            police_station: criminalData.police_station,
            offense_description: criminalData.offense_description,
            offense_section: criminalData.offense_section || undefined,
            io_name: criminalData.io_name || undefined,
            io_contact: criminalData.io_contact || undefined,
            arrest_date: criminalData.arrest_date || undefined,
          }
        : undefined,
    });

    if (error) {
      setSubmitError(error);
      setIsSubmitting(false);
      return;
    }

    // Upload documents
    if (data && files.length > 0) {
      for (const file of files) {
        await uploadDocument(data.id, file, "other", file.name);
      }
    }

    router.push("/cases");
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateCriminalField = (field: string, value: string) => {
    setCriminalData((prev) => ({ ...prev, [field]: value }));
  };

  const stepLabels = [
    { number: 1, label: "Case Details" },
    { number: 2, label: "Select Lawyer" },
    { number: 3, label: "Upload Documents" },
    { number: 4, label: "Review & Submit" },
  ];

  return (
    <>
      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-center">
        {stepLabels.map((s, i) => (
          <div key={s.number} className="flex items-center">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium ${
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
        <div className="mb-4 rounded-lg border border-danger bg-danger-light p-3 text-sm text-danger">
          {submitError}
        </div>
      )}

      {/* Step 1: Case Details */}
      {step === 1 && (
        <Card>
          <h2 className="mb-6 text-lg font-semibold text-primary">
            Case Details
          </h2>
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                id="caseType"
                label="Case Type"
                options={caseTypeOptions}
                value={caseType}
                onChange={(e) =>
                  setCaseType(e.target.value as "civil" | "criminal" | "family")
                }
              />
              <Select
                id="sensitivity"
                label="Sensitivity"
                options={sensitivityOptions}
                value={formData.sensitivity}
                onChange={(e) => updateField("sensitivity", e.target.value)}
              />
            </div>

            <Input
              id="title"
              label="Case Title"
              placeholder="Enter a descriptive case title"
              value={formData.title}
              onChange={(e) => updateField("title", e.target.value)}
              error={errors.title}
            />

            <Textarea
              id="description"
              label="Case Description"
              placeholder="Describe the case facts, circumstances, and relief sought..."
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              error={errors.description}
            />

            {/* Criminal case extra fields */}
            {isCriminal && (
              <div className="rounded-lg border border-border bg-cream-light p-4">
                <h3 className="mb-4 text-sm font-semibold text-primary">
                  Criminal Case Details
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                      id="fir_number"
                      label="FIR Number"
                      placeholder="e.g., 123/2026"
                      value={criminalData.fir_number}
                      onChange={(e) =>
                        updateCriminalField("fir_number", e.target.value)
                      }
                      error={errors.fir_number}
                    />
                    <Input
                      id="police_station"
                      label="Police Station"
                      placeholder="Enter police station name"
                      value={criminalData.police_station}
                      onChange={(e) =>
                        updateCriminalField("police_station", e.target.value)
                      }
                      error={errors.police_station}
                    />
                  </div>

                  <Textarea
                    id="offense_description"
                    label="Offense Description"
                    placeholder="Describe the offense..."
                    value={criminalData.offense_description}
                    onChange={(e) =>
                      updateCriminalField("offense_description", e.target.value)
                    }
                    error={errors.offense_description}
                  />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                      id="offense_section"
                      label="Offense Section (PPC)"
                      placeholder="e.g., Section 302"
                      value={criminalData.offense_section}
                      onChange={(e) =>
                        updateCriminalField("offense_section", e.target.value)
                      }
                    />
                    <Input
                      id="arrest_date"
                      label="Arrest Date (if applicable)"
                      type="date"
                      value={criminalData.arrest_date}
                      onChange={(e) =>
                        updateCriminalField("arrest_date", e.target.value)
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                      id="io_name"
                      label="Investigation Officer Name"
                      placeholder="IO Name"
                      value={criminalData.io_name}
                      onChange={(e) =>
                        updateCriminalField("io_name", e.target.value)
                      }
                    />
                    <Input
                      id="io_contact"
                      label="IO Contact"
                      placeholder="IO Contact Number"
                      value={criminalData.io_contact}
                      onChange={(e) =>
                        updateCriminalField("io_contact", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={nextStep}>
              Next: Select Lawyer
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Select Lawyer */}
      {step === 2 && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-primary">
            Select a Lawyer (Optional)
          </h2>
          <p className="mb-4 text-sm text-muted">
            You can select a lawyer now or skip this step and choose one later.
          </p>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              placeholder="Search lawyers by name..."
              value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
              className="pl-10"
            />
          </div>

          {selectedLawyerId && (
            <div className="mb-4 rounded-lg border-2 border-primary bg-primary/5 p-3 text-sm">
              <span className="font-medium text-primary">
                Lawyer selected.
              </span>{" "}
              <button
                type="button"
                onClick={() => setSelectedLawyerId("")}
                className="text-danger hover:underline"
              >
                Remove selection
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
                    onSelect={(id) => setSelectedLawyerId(id)}
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

      {/* Step 3: Upload Documents */}
      {step === 3 && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-primary">
            Upload Documents
          </h2>
          <p className="mb-4 text-sm text-muted">
            Upload any supporting documents. You can add more documents later.
          </p>

          <FileUpload
            label="Case Documents"
            onFilesChange={setFiles}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            maxSizeMB={10}
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

      {/* Step 4: Review & Submit */}
      {step === 4 && (
        <Card>
          <h2 className="mb-6 text-lg font-semibold text-primary">
            Review & Submit
          </h2>

          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4">
              <h3 className="mb-3 text-sm font-semibold text-primary">
                Case Information
              </h3>
              <dl className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                <div>
                  <dt className="text-muted">Case Type</dt>
                  <dd className="font-medium capitalize">{caseType}</dd>
                </div>
                <div>
                  <dt className="text-muted">Sensitivity</dt>
                  <dd className="font-medium capitalize">
                    {formData.sensitivity.replace(/_/g, " ")}
                  </dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-muted">Title</dt>
                  <dd className="font-medium">{formData.title}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-muted">Description</dt>
                  <dd className="text-foreground">{formData.description}</dd>
                </div>
              </dl>
            </div>

            {isCriminal && (
              <div className="rounded-lg border border-border p-4">
                <h3 className="mb-3 text-sm font-semibold text-primary">
                  Criminal Details
                </h3>
                <dl className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                  <div>
                    <dt className="text-muted">FIR Number</dt>
                    <dd className="font-medium">{criminalData.fir_number}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Police Station</dt>
                    <dd className="font-medium">
                      {criminalData.police_station}
                    </dd>
                  </div>
                  <div className="md:col-span-2">
                    <dt className="text-muted">Offense</dt>
                    <dd>{criminalData.offense_description}</dd>
                  </div>
                  {criminalData.offense_section && (
                    <div>
                      <dt className="text-muted">Section</dt>
                      <dd>{criminalData.offense_section}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            <div className="rounded-lg border border-border p-4">
              <h3 className="mb-3 text-sm font-semibold text-primary">
                Lawyer
              </h3>
              <p className="text-sm">
                {selectedLawyerId ? (
                  <span className="font-medium text-primary">
                    Lawyer selected — pending acceptance
                  </span>
                ) : (
                  <span className="text-muted">
                    No lawyer selected. You can assign one later.
                  </span>
                )}
              </p>
            </div>

            <div className="rounded-lg border border-border p-4">
              <h3 className="mb-3 text-sm font-semibold text-primary">
                Documents
              </h3>
              {files.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {files.map((f, i) => (
                    <li key={i} className="text-foreground">
                      {f.name}{" "}
                      <span className="text-muted">
                        ({(f.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">
                  No documents uploaded. You can add them later.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={prevStep}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting} size="lg">
              <Check className="h-4 w-4" />
              Submit Case
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}

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
