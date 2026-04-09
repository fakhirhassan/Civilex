"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import OtpSignatureModal from "@/components/features/signatures/OtpSignatureModal";
import type { CaseDocument } from "@/types/case";
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import {
  FileText,
  FileImage,
  File,
  ShieldCheck,
  PenTool,
  Download,
  Trash2,
  Eye,
  User,
  AlertTriangle,
  Loader2,
} from "lucide-react";

/* ── Permission model ───────────────────────────────────────────────── */
export type DocumentRole =
  | "client"
  | "lawyer"
  | "magistrate"
  | "trial_judge"
  | "admin_court"
  | "stenographer";

export interface DocumentPermissions {
  /** Role of the current user */
  role: DocumentRole;
  /** Current user's profile id */
  currentUserId: string;
  /** Whether this user has an accepted assignment on this case (lawyers only) */
  isAssignedLawyer?: boolean;
}

interface DocumentListProps {
  documents: CaseDocument[];
  permissions: DocumentPermissions;
  /** Called when user clicks "Upload" — parent opens upload modal */
  onUploadClick?: () => void;
  onDelete?: (documentId: string, filePath: string) => Promise<{ error: string | null }>;
  onGetUrl?: (filePath: string) => Promise<string | null>;
  onRefresh?: () => void;
}

/* ── Permission helpers ─────────────────────────────────────────────── */
function canUpload(p: DocumentPermissions): boolean {
  if (p.role === "client") return true; // clients can upload to their own case
  if (p.role === "lawyer") return !!p.isAssignedLawyer;
  return ["magistrate", "trial_judge", "admin_court"].includes(p.role);
}

function canDeleteDoc(doc: CaseDocument, p: DocumentPermissions): boolean {
  if (p.role === "admin_court") return true; // admin deletes any
  if (p.role === "client" || p.role === "stenographer") return false;
  return doc.uploaded_by === p.currentUserId; // lawyers/judges: own only
}

function canSignDocs(p: DocumentPermissions): boolean {
  return ["lawyer", "magistrate", "trial_judge"].includes(p.role);
}

/* ── UI helpers ─────────────────────────────────────────────────────── */
function FileIcon({ mimeType }: { mimeType: string | null }) {
  if (mimeType === "application/pdf")
    return <FileText className="h-5 w-5 shrink-0 text-red-500" />;
  if (mimeType?.startsWith("image/"))
    return <FileImage className="h-5 w-5 shrink-0 text-blue-500" />;
  return <File className="h-5 w-5 shrink-0 text-muted" />;
}

function fileTypeLabel(mimeType: string | null, fileName: string): string {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType?.startsWith("image/")) return "Image";
  if (mimeType?.includes("word")) return "Word";
  return fileName.split(".").pop()?.toUpperCase() ?? "File";
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/* ── Main component ─────────────────────────────────────────────────── */
export default function DocumentList({
  documents,
  permissions,
  onUploadClick,
  onDelete,
  onGetUrl,
  onRefresh,
}: DocumentListProps) {
  const [signingDoc, setSigningDoc] = useState<CaseDocument | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<CaseDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const uploadAllowed = canUpload(permissions);

  const handleDelete = async (doc: CaseDocument) => {
    if (!onDelete) return;
    setDeleteError(null);
    setDeletingId(doc.id);
    const { error } = await onDelete(doc.id, doc.file_path);
    setDeletingId(null);
    if (error) setDeleteError(error);
    else onRefresh?.();
  };

  const handlePreview = async (doc: CaseDocument) => {
    setPreviewDoc(doc);
    setPreviewUrl(null);
    if (!onGetUrl) return;
    setPreviewLoading(true);
    const url = await onGetUrl(doc.file_path);
    setPreviewUrl(url);
    setPreviewLoading(false);
  };

  const handleDownload = async (doc: CaseDocument) => {
    if (!onGetUrl) return;
    setDownloadingId(doc.id);
    const url = await onGetUrl(doc.file_path);
    setDownloadingId(null);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.file_name;
    a.click();
  };

  return (
    <>
      <Card>
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary">
            Case Documents
            <span className="ml-2 text-sm font-normal text-muted">
              ({documents.length} {documents.length === 1 ? "file" : "files"})
            </span>
          </h3>
          {uploadAllowed && onUploadClick && (
            <Button size="sm" onClick={onUploadClick}>
              <FileText className="h-4 w-4" />
              Upload File
            </Button>
          )}
        </div>

        {/* Permission hint */}
        <div className="mb-4 rounded-lg border border-border bg-cream px-3 py-2 text-xs text-muted">
          {permissions.role === "client" &&
            "You can view and download all case documents."}
          {permissions.role === "stenographer" &&
            "You can view and download all case documents."}
          {permissions.role === "lawyer" &&
            (permissions.isAssignedLawyer
              ? "You can upload documents and delete your own uploads."
              : "You can view documents. Accept the case assignment to upload.")}
          {(permissions.role === "magistrate" ||
            permissions.role === "trial_judge") &&
            "You can upload documents and delete your own uploads."}
          {permissions.role === "admin_court" &&
            "Admin: you can upload and delete any document."}
        </div>

        {deleteError && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-danger bg-red-50 px-3 py-2 text-sm text-danger">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {deleteError}
          </div>
        )}

        {documents.length === 0 ? (
          <EmptyState
            title="No documents yet"
            description={
              uploadAllowed
                ? "Upload the first document for this case."
                : "Documents uploaded for this case will appear here."
            }
            icon={<FileText className="h-12 w-12" />}
          />
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => {
              const isOwn = doc.uploaded_by === permissions.currentUserId;
              const canDel = canDeleteDoc(doc, permissions);
              const canSig = canSignDocs(permissions) && !doc.is_signed;
              const isDeleting = deletingId === doc.id;
              const isDownloading = downloadingId === doc.id;

              return (
                <div
                  key={doc.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-cream sm:flex-row sm:items-start sm:justify-between"
                >
                  {/* Left: icon + info */}
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5">
                      <FileIcon mimeType={doc.mime_type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* Title row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {doc.title}
                        </p>
                        {isOwn && (
                          <Badge variant="info" className="text-[10px]">
                            Your upload
                          </Badge>
                        )}
                        {doc.is_signed ? (
                          <Badge variant="success" className="text-[10px]">
                            <ShieldCheck className="mr-0.5 inline h-3 w-3" />
                            Signed
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="text-[10px]">
                            Unsigned
                          </Badge>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0 text-xs text-muted">
                        <span className="font-medium text-foreground/70">
                          {DOCUMENT_TYPE_LABELS[doc.document_type] ??
                            doc.document_type.replace(/_/g, " ")}
                        </span>
                        <span>{fileTypeLabel(doc.mime_type, doc.file_name)}</span>
                        {doc.file_size ? (
                          <span>{formatSize(doc.file_size)}</span>
                        ) : null}
                        <span>{formatDate(doc.created_at)}</span>
                      </div>

                      {/* Uploader */}
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted">
                        <User className="h-3 w-3 shrink-0" />
                        <span>
                          Uploaded by{" "}
                          <span className="font-medium text-foreground/80">
                            {doc.uploader?.full_name ?? "Unknown"}
                          </span>
                          {doc.uploader?.email
                            ? ` — ${doc.uploader.email}`
                            : ""}
                        </span>
                      </div>

                      {/* Description */}
                      {doc.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted">
                          {doc.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex shrink-0 flex-wrap items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Preview"
                      onClick={() => handlePreview(doc)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      title="Download"
                      disabled={isDownloading}
                      onClick={() => handleDownload(doc)}
                    >
                      {isDownloading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>

                    {canSig && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSigningDoc(doc)}
                      >
                        <PenTool className="h-4 w-4" />
                        Sign
                      </Button>
                    )}

                    {canDel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        title={
                          permissions.role === "admin_court" && !isOwn
                            ? "Delete (Admin)"
                            : "Delete"
                        }
                        disabled={isDeleting}
                        onClick={() => handleDelete(doc)}
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin text-danger" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-danger" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Preview Modal ───────────────────────────────────────────── */}
      <Modal
        isOpen={!!previewDoc}
        onClose={() => {
          setPreviewDoc(null);
          setPreviewUrl(null);
        }}
        title={previewDoc?.title ?? "Document Preview"}
        className="max-w-3xl"
      >
        {previewLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!previewLoading && previewUrl && previewDoc && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span>
                {DOCUMENT_TYPE_LABELS[previewDoc.document_type] ??
                  previewDoc.document_type}
              </span>
              <span>{fileTypeLabel(previewDoc.mime_type, previewDoc.file_name)}</span>
              {previewDoc.file_size ? (
                <span>{formatSize(previewDoc.file_size)}</span>
              ) : null}
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {previewDoc.uploader?.full_name ?? "Unknown"}
              </span>
              <span>{formatDate(previewDoc.created_at)}</span>
            </div>

            {previewDoc.mime_type === "application/pdf" ? (
              <iframe
                src={previewUrl}
                className="h-[60vh] w-full rounded-lg border border-border"
                title={previewDoc.title}
              />
            ) : previewDoc.mime_type?.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={previewDoc.title}
                className="max-h-[60vh] w-full rounded-lg object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 py-10 text-muted">
                <File className="h-12 w-12" />
                <p className="text-sm">
                  Preview not available for this file type.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPreviewDoc(null);
                  setPreviewUrl(null);
                }}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = previewUrl!;
                  a.download = previewDoc!.file_name;
                  a.click();
                }}
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        )}

        {!previewLoading && !previewUrl && (
          <div className="py-8 text-center text-sm text-muted">
            Could not load file preview.
          </div>
        )}
      </Modal>

      {/* ── OTP Signature Modal ─────────────────────────────────────── */}
      {signingDoc && (
        <OtpSignatureModal
          isOpen
          onClose={() => setSigningDoc(null)}
          entityType="document"
          entityId={signingDoc.id}
          entityLabel={`${DOCUMENT_TYPE_LABELS[signingDoc.document_type] ?? signingDoc.document_type}: ${signingDoc.title}`}
          onSigned={() => {
            setSigningDoc(null);
            onRefresh?.();
          }}
        />
      )}
    </>
  );
}
