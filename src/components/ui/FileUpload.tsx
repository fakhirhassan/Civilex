"use client";

import { cn } from "@/lib/utils";
import { Upload, X, FileText } from "lucide-react";
import { useCallback, useState } from "react";

interface FileUploadProps {
  label?: string;
  accept?: string;
  multiple?: boolean;
  maxSizeMB?: number;
  onFilesChange: (files: File[]) => void;
  className?: string;
}

export default function FileUpload({
  label,
  accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx",
  multiple = true,
  maxSizeMB = 10,
  onFilesChange,
  className,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles) return;
      const validFiles = Array.from(newFiles).filter(
        (f) => f.size <= maxSizeMB * 1024 * 1024
      );
      const updated = multiple ? [...files, ...validFiles] : validFiles.slice(0, 1);
      setFiles(updated);
      onFilesChange(updated);
    },
    [files, multiple, maxSizeMB, onFilesChange]
  );

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onFilesChange(updated);
  };

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-primary">
          {label}
        </label>
      )}
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-cream-light hover:border-primary/50"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = accept;
          input.multiple = multiple;
          input.onchange = () => handleFiles(input.files);
          input.click();
        }}
      >
        <Upload className="mb-2 h-8 w-8 text-primary" />
        <p className="text-sm text-muted">
          Drag &apos; and Drop All Proofs Here
        </p>
        <p className="mt-1 text-xs text-muted">
          Max {maxSizeMB}MB per file
        </p>
      </div>

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center justify-between rounded-lg border border-border bg-cream-light px-3 py-2"
            >
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-primary" />
                <span className="truncate max-w-[200px]">{file.name}</span>
                <span className="text-xs text-muted">
                  ({(file.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                className="text-muted hover:text-danger transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
