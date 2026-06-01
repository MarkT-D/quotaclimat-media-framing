const _dn = typeof Intl !== "undefined"
  ? new Intl.DisplayNames(["en"], { type: "region" })
  : null;

export function countryName(code: string | null | undefined): string {
  if (!code) return "—";
  try { return _dn?.of(code) ?? code; } catch { return code; }
}
