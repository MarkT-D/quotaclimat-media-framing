interface Props {
  label: string;
  value: string | number;
  sub?: string;
  variant?: "red" | "green";
}

export default function StatCard({ label, value, sub, variant = "red" }: Props) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--bg2)",
        borderTop: `3px solid ${variant === "red" ? "var(--red)" : "var(--green-m)"}`,
      }}
    >
      <p className="text-[11px] mb-1.5" style={{ color: "var(--t2)" }}>{label}</p>
      <p
        className="text-2xl font-medium leading-none"
        style={{ color: variant === "red" ? "var(--t1)" : "var(--green)" }}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] mt-1" style={{ color: "var(--t2)" }}>{sub}</p>}
    </div>
  );
}
