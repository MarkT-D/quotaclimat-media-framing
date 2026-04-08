type Variant = "red" | "green" | "amber" | "neutral";

const MAP: Record<string, Variant> = {
  Climate: "red",
  Biodiversity: "green",
  "Natural Resources": "green",
  Energy: "red",
  Transport: "red",
  Agriculture: "green",
  Industry: "red",
  Buildings: "green",
  Waste: "neutral",
  "Land Use": "green",
  "General Concepts": "neutral",
  Causes: "red",
  Consequences: "red",
  Solutions: "green",
};

const STYLES: Record<Variant, { bg: string; color: string }> = {
  red: { bg: "var(--red-l)", color: "var(--red-d)" },
  green: { bg: "var(--green-l)", color: "var(--green-d)" },
  amber: { bg: "#FEF9EE", color: "#7A4F00" },
  neutral: { bg: "#f3f4f6", color: "#4b5563" },
};

interface Props {
  label: string;
  size?: "sm" | "md";
}

export default function Badge({ label, size = "md" }: Props) {
  const variant = MAP[label] ?? "neutral";
  const { bg, color } = STYLES[variant];
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
      }`}
      style={{ background: bg, color }}
    >
      {label}
    </span>
  );
}
