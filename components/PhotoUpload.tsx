"use client";

import { useRef, useState } from "react";

interface PhotoUploadProps {
  stepId: string;
  onUploaded: () => void;
  // True in the admin preview modal — renders the control but blocks the
  // file picker so preview can't create a real Submission.
  disabled?: boolean;
}

// Uploads a photo for the current step. Shows "업로드 중입니다" while in flight;
// the parent auto-advances the view on success (onUploaded).
export default function PhotoUpload({ stepId, onUploaded, disabled = false }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("photo", file);
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
        disabled={uploading}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
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
            실습 사진 업로드
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
