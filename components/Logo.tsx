interface Props {
  size?: number;
}

export default function Logo({ size = 42 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 42 42" fill="none">
      <rect width="42" height="42" rx="11" style={{ fill: "var(--green)" }} />
      <rect x="8" y="12" width="18" height="2.5" rx="1.25" style={{ fill: "var(--bg)" }} />
      <rect x="8" y="17.5" width="14" height="2.5" rx="1.25" style={{ fill: "var(--bg)", opacity: 0.7 }} />
      <rect x="8" y="23" width="16" height="2.5" rx="1.25" style={{ fill: "var(--bg)", opacity: 0.5 }} />
      <circle cx="31" cy="16" r="6.5" style={{ fill: "var(--red)" }} />
      <path
        d="M31 13 L31 16 L33 18"
        style={{ stroke: "var(--bg)" }}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="8" y="28.5" width="26" height="1.5" rx="0.75" style={{ fill: "var(--bg)", opacity: 0.2 }} />
    </svg>
  );
}
