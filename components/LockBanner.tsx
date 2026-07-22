// Read-only banner shown when another admin holds the edit lock (spec §6).
export default function LockBanner({ ownerName }: { ownerName: string }) {
  return (
    <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
      <span aria-hidden>🔒</span>
      <span className="font-medium">{ownerName}님이 편집 중입니다</span>
      <span className="text-sm text-amber-700">(읽기 전용)</span>
    </div>
  );
}
