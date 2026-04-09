"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { useJudgeDrafts } from "@/hooks/useJudgeDrafts";
import { formatDate } from "@/lib/utils";
import {
  FilePen,
  Plus,
  Trash2,
  Upload,
  Eye,
  Pencil,
  Lock,
  CheckCircle,
} from "lucide-react";
import type { JudgeDraft } from "@/types/case";

interface JudgeDraftsProps {
  caseId: string;
}

type ModalMode = "view" | "edit" | "create";

export default function JudgeDrafts({ caseId }: JudgeDraftsProps) {
  const { drafts, isLoading, createDraft, updateDraft, deleteDraft, publishDraft } =
    useJudgeDrafts(caseId);

  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [activeDraft, setActiveDraft] = useState<JudgeDraft | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Publish confirm state
  const [publishTarget, setPublishTarget] = useState<JudgeDraft | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<JudgeDraft | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openCreate = () => {
    setTitle("");
    setContent("");
    setFormError(null);
    setActiveDraft(null);
    setModalMode("create");
  };

  const openView = (draft: JudgeDraft) => {
    setActiveDraft(draft);
    setTitle(draft.title);
    setContent(draft.content);
    setFormError(null);
    setModalMode("view");
  };

  const openEdit = (draft: JudgeDraft) => {
    setActiveDraft(draft);
    setTitle(draft.title);
    setContent(draft.content);
    setFormError(null);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setActiveDraft(null);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!content.trim()) {
      setFormError("Content cannot be empty.");
      return;
    }

    setFormError(null);
    setIsSaving(true);

    if (modalMode === "create") {
      const { error } = await createDraft({ title: title.trim(), content: content.trim() });
      if (error) setFormError(error);
      else closeModal();
    } else if (modalMode === "edit" && activeDraft) {
      const { error } = await updateDraft(activeDraft.id, {
        title: title.trim(),
        content: content.trim(),
      });
      if (error) setFormError(error);
      else closeModal();
    }

    setIsSaving(false);
  };

  const handlePublishConfirm = async () => {
    if (!publishTarget) return;
    setPublishError(null);
    setIsPublishing(true);
    const { error } = await publishDraft(publishTarget.id);
    setIsPublishing(false);
    if (error) {
      setPublishError(error);
    } else {
      setPublishTarget(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    await deleteDraft(deleteTarget.id);
    setIsDeleting(false);
    setDeleteTarget(null);
  };

  const unpublished = drafts.filter((d) => !d.is_published);
  const published = drafts.filter((d) => d.is_published);

  return (
    <>
      <Card>
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
            <Lock className="h-5 w-5" />
            My Private Drafts
            <span className="text-xs font-normal text-muted">(only visible to you)</span>
          </h3>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Draft
          </Button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted">Loading drafts…</div>
        ) : drafts.length === 0 ? (
          <EmptyState
            title="No drafts yet"
            description="Write private notes or prepare decisions before the next hearing. Only you can see these drafts."
            icon={<FilePen className="h-10 w-10" />}
          />
        ) : (
          <div className="space-y-6">
            {/* Unpublished drafts */}
            {unpublished.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Unpublished ({unpublished.length})
                </p>
                {unpublished.map((draft) => (
                  <DraftRow
                    key={draft.id}
                    draft={draft}
                    onView={() => openView(draft)}
                    onEdit={() => openEdit(draft)}
                    onPublish={() => {
                      setPublishError(null);
                      setPublishTarget(draft);
                    }}
                    onDelete={() => setDeleteTarget(draft)}
                  />
                ))}
              </div>
            )}

            {/* Published drafts */}
            {published.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Published ({published.length})
                </p>
                {published.map((draft) => (
                  <DraftRow
                    key={draft.id}
                    draft={draft}
                    onView={() => openView(draft)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Create / Edit / View Modal */}
      <Modal
        isOpen={!!modalMode}
        onClose={closeModal}
        title={
          modalMode === "create"
            ? "New Draft"
            : modalMode === "edit"
            ? "Edit Draft"
            : activeDraft?.title ?? "Draft"
        }
      >
        {modalMode === "view" && activeDraft ? (
          <>
            <div className="mb-2 flex items-center gap-2">
              {activeDraft.is_published ? (
                <Badge variant="success">Published</Badge>
              ) : (
                <Badge variant="warning">Draft</Badge>
              )}
              <span className="text-xs text-muted">
                Last updated {formatDate(activeDraft.updated_at)}
              </span>
            </div>
            <div className="mt-4 min-h-[200px] whitespace-pre-wrap rounded-lg border border-border bg-cream p-4 text-sm text-foreground">
              {activeDraft.content || <span className="text-muted italic">No content.</span>}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={closeModal}>
                Close
              </Button>
              {!activeDraft.is_published && (
                <Button onClick={() => { closeModal(); openEdit(activeDraft); }}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            {formError && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
                {formError}
              </p>
            )}
            <div className="space-y-4">
              <Input
                id="draft-title"
                label="Title"
                placeholder="e.g., Preliminary observations – hearing 3"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Textarea
                id="draft-content"
                label="Content"
                placeholder="Write your private notes or draft decision here…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button onClick={handleSave} isLoading={isSaving}>
                Save Draft
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* Publish Confirmation Modal */}
      <Modal
        isOpen={!!publishTarget}
        onClose={() => setPublishTarget(null)}
        title="Publish Draft"
      >
        <p className="text-sm text-muted">
          Publishing &ldquo;<strong className="text-foreground">{publishTarget?.title}</strong>
          &rdquo; will make it visible to all case parties (lawyers, client) as a court order
          document. This action cannot be undone.
        </p>
        {publishError && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
            {publishError}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setPublishTarget(null)}>
            Cancel
          </Button>
          <Button onClick={handlePublishConfirm} isLoading={isPublishing}>
            <Upload className="h-4 w-4" />
            Publish
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Draft"
      >
        <p className="text-sm text-muted">
          Are you sure you want to delete &ldquo;
          <strong className="text-foreground">{deleteTarget?.title}</strong>&rdquo;? This
          cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm} isLoading={isDeleting}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* DraftRow sub-component                                               */
/* ------------------------------------------------------------------ */

interface DraftRowProps {
  draft: JudgeDraft;
  onView: () => void;
  onEdit?: () => void;
  onPublish?: () => void;
  onDelete?: () => void;
}

function DraftRow({ draft, onView, onEdit, onPublish, onDelete }: DraftRowProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-foreground">{draft.title}</p>
          {draft.is_published && (
            <CheckCircle className="h-4 w-4 shrink-0 text-success" />
          )}
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted">
          {draft.content || "No content"}
        </p>
        <p className="mt-1 text-[11px] text-muted/60">
          {draft.is_published
            ? `Published ${formatDate(draft.published_at!)}`
            : `Last edited ${formatDate(draft.updated_at)}`}
        </p>
      </div>

      <div className="flex shrink-0 gap-1">
        <Button size="sm" variant="ghost" onClick={onView} title="View">
          <Eye className="h-4 w-4" />
        </Button>
        {!draft.is_published && onEdit && (
          <Button size="sm" variant="ghost" onClick={onEdit} title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        {!draft.is_published && onPublish && (
          <Button size="sm" variant="outline" onClick={onPublish} title="Publish">
            <Upload className="h-4 w-4" />
            Publish
          </Button>
        )}
        {!draft.is_published && onDelete && (
          <Button size="sm" variant="ghost" onClick={onDelete} title="Delete">
            <Trash2 className="h-4 w-4 text-danger" />
          </Button>
        )}
      </div>
    </div>
  );
}
