"use client";

import { useState, useCallback, useRef } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants";
import { Upload, X, FileText, FileImage, File, Loader2 } from "lucide-react";

const ACCEPTED_MIME =
  "application/pdf,image/jpeg,image/png,image/webp," +
  "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "text/plain";

const MAX_MB = 20;

const DOC_TYPE_OPTIONS = Object.entries(DOCUMENT_TYPE_LABELS).map(
  ([value, label]) => ({ value, label })
);

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (
    file: File,
    documentType: string,
    title: string,
    description?: string
  ) => Promise<{ error: string | null }>;
}

function fileIcon(file: File) {
  if (file.type === "application/pdf")
    return <FileText className="h-5 w-5 text-red-500" />;
  if (file.type.startsWith("image/"))
    return <FileImage className="h-5 w-5 text-blue-500" />;
  return <File className="h-5 w-5 text-muted" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function UploadDocumentModal({
  isOpen,
  onClose,
  onUpload,
}: UploadDocumentModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const [docType, setDocType] = useState("other");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const reset = () => {
    setFile(null);
    setFileError(null);
    setDocType("other");
    setTitle("");
    setDescription("");
    setFormError(null);
    setIsUploading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const validateAndSetFile = useCallback((f: File) => {
    setFileError(null);
    if (f.size > MAX_MB * 1024 * 1024) {
      setFileError(`File exceeds ${MAX_MB} MB limit.`);
      return;
    }
    setFile(f);
    // Auto-fill title from file name (strip extension)
    setTitle((prev) =>
      prev ? prev : f.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ")
    );
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetFile(dropped);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!file) { setFormError("Please select a file."); return; }
    if (!title.trim()) { setFormError("Please enter a document title."); return; }

    setIsUploading(true);
    const { error } = await onUpload(
      file,
      docType,
      title.trim(),
      description.trim() || undefined
    );
    setIsUploading(false);

    if (error) {
      setFormError(error);
    } else {
      handleClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload Document">
      <div className="space-y-4">
        {/* Drop zone */}
        <div
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border bg-cream-light hover:border-primary/50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mb-2 h-8 w-8 text-primary" />
          <p className="text-sm font-medium text-foreground">
            {file ? "Change file" : "Drag & drop or click to browse"}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            PDF, images, Word, text — max {MAX_MB} MB
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_MIME}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) validateAndSetFile(f);
              e.target.value = "";
            }}
          />
        </div>

        {fileError && (
          <p className="text-xs text-danger">{fileError}</p>
        )}

        {/* Selected file preview */}
        {file && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-cream-light px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              {fileIcon(file)}
              <span className="max-w-[200px] truncate font-medium">{file.name}</span>
              <span className="text-xs text-muted">({formatSize(file.size)})</span>
            </div>
            <button
              type="button"
              className="text-muted hover:text-danger transition-colors"
              onClick={(e) => { e.stopPropagation(); setFile(null); setTitle(""); }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Document type */}
        <Select
          id="docType"
          label="Document Type"
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          options={DOC_TYPE_OPTIONS}
        />

        {/* Title */}
        <Input
          id="docTitle"
          label="Title"
          placeholder="e.g., Plaintiff Written Statement"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* Description (optional) */}
        <Textarea
          id="docDesc"
          label="Description (optional)"
          placeholder="Brief description of this document…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />

        {formError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={handleClose} disabled={isUploading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} isLoading={isUploading} disabled={isUploading}>
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload
            </>
          )}
        </Button>
      </div>
    </Modal>
  );
}
