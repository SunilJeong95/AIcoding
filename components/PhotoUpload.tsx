"use client";

import { useRef, useState } from "react";

interface PhotoUploadProps {
  stepId: string;
  onUploaded: () => void;
  // Whether this step already has at least one uploaded photo — swaps the
  // button label from "업로드" to "추가" since selecting more files appends
  // rather than replaces.
  hasExisting?: boolean;
  // True in the admin preview modal — renders the control but blocks the
  // file picker so preview can't create a real Submission.
  disabled?: boolean;
}

// Uploads one or more photos for the current step (each call appends to the
// step's photo set — see /api/student/submit). Shows "업로드 중입니다" while in
// flight; the parent refetches on success (onUploaded) so the new thumbnails
// appear.
export default function PhotoUpload({
  stepId,
  onUploaded,
  hasExisting = false,
  disabled = false,
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList) {
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      for (const file of files) form.append("photos", file);
      form.append("stepId", stepId);
      const res = await fetch("/api/student/submit", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "업로드에 실패했습니다.");
        return;
      }
      onUploaded();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        disabled={uploading}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
        }}
      />
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {uploading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            업로드 중입니다...
          </>
        ) : (
          <>
            <span aria-hidden>📷</span>
            {hasExisting ? "사진 추가 업로드" : "실습 사진 업로드"}
          </>
        )}
      </button>
      {error && (
        <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
