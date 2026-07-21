// Read-only banner shown when another admin holds the edit lock (spec §6).
export default function LockBanner({ ownerName }: { ownerName: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800">
      <span aria-hidden>🔒</span>
      <span className="font-medium">{ownerName}님이 편집 중입니다</span>
      <span className="text-sm text-amber-600">(읽기 전용)</span>
    </div>
  );
}
