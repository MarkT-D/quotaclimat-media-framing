interface Props {
  score: number; // 0–1
  size?: "sm" | "md";
}

export default function MisinfoBar({ score, size = "md" }: Props) {
  const pct = Math.round(score * 100);
  const color =
    pct < 20 ? "bg-emerald-400" : pct < 50 ? "bg-amber-400" : "bg-red-500";
  const label =
    pct < 20 ? "Low" : pct < 50 ? "Moderate" : "High";

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className={`text-xs font-medium ${pct < 20 ? "text-emerald-600" : pct < 50 ? "text-amber-600" : "text-red-600"}`}>
          {label} risk
        </span>
        <span className="text-xs text-neutral-500">{pct}%</span>
      </div>
      <div className={`w-full rounded-full bg-neutral-100 ${size === "sm" ? "h-1.5" : "h-2"}`}>
        <div
          className={`${color} h-full rounded-full transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
