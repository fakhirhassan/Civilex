"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import OtpSignatureModal from "@/components/features/signatures/OtpSignatureModal";
import type { CaseDocument } from "@/types/case";
import { DOCUMENT_TYPE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import {
  FileText,
  ShieldCheck,
  PenTool,
  Download,
} from "lucide-react";

interface DocumentListProps {
  documents: CaseDocument[];
  canSign?: boolean;
  canUpload?: boolean;
  onRefresh?: () => void;
}

export default function DocumentList({
  documents,
  canSign = false,
  canUpload = false,
  onRefresh,
}: DocumentListProps) {
  const [signingDoc, setSigningDoc] = useState<CaseDocument | null>(null);

  return (
    <>
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary">Documents</h3>
          <div className="flex items-center gap-2">
            <Badge variant="info">{documents.length} files</Badge>
            {canUpload && (
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4" />
                Upload Document
              </Button>
            )}
          </div>
        </div>

        {documents.length === 0 ? (
          <EmptyState
            title="No documents"
            description="Documents uploaded for this case will appear here."
            icon={<FileText className="h-12 w-12" />}
          />
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{doc.title}</p>
                    <p className="text-xs text-muted">
                      {DOCUMENT_TYPE_LABELS[doc.document_type] ||
                        doc.document_type.replace(/_/g, " ")}{" "}
                      {doc.file_size
                        ? `• ${(doc.file_size / 1024 / 1024).toFixed(1)} MB `
                        : ""}
                      • {formatDate(doc.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {doc.is_signed ? (
                    <Badge variant="success">
                      <ShieldCheck className="mr-1 inline h-3 w-3" />
                      Signed
                    </Badge>
                  ) : canSign ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSigningDoc(doc)}
                    >
                      <PenTool className="h-4 w-4" />
                      Sign
                    </Button>
                  ) : (
                    <Badge variant="warning">Unsigned</Badge>
                  )}
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* OTP Signature Modal */}
      {signingDoc && (
        <OtpSignatureModal
          isOpen={!!signingDoc}
          onClose={() => setSigningDoc(null)}
          entityType="document"
          entityId={signingDoc.id}
          entityLabel={`${DOCUMENT_TYPE_LABELS[signingDoc.document_type] || signingDoc.document_type}: ${signingDoc.title}`}
          onSigned={() => {
            setSigningDoc(null);
            onRefresh?.();
          }}
        />
      )}
    </>
  );
}
