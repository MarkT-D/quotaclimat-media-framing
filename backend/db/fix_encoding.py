"""
Detect and fix double-encoded UTF-8 in the articles table.

Double-encoding happens when UTF-8 bytes (e.g. C3 A9 for é) are
mistakenly treated as individual Latin-1 characters (Ã + ©) and stored
as those two Unicode codepoints instead of the single correct one (é).

Run in --check mode first to see scope, then --fix to apply.

Usage:
    python -m backend.db.fix_encoding --check
    python -m backend.db.fix_encoding --fix
    python -m backend.db.fix_encoding --check --field body
"""

import argparse
import sys
import psycopg2

DB_URL  = "postgresql://quota:changeme@localhost:5432/quota_climate"
FIELDS  = ["title", "body", "outlet", "ln_subject", "ln_geographic", "ln_industry"]


def fix_mojibake(s: str) -> tuple[str, bool]:
    """
    Fix double-encoded UTF-8 sequences in a string, character by character.

    Double-encoding pattern: a UTF-8 multi-byte sequence was read byte-by-byte
    as Latin-1 characters and stored as individual Unicode code points.
    e.g. é (U+00E9, bytes C3 A9) → stored as U+00C3 + U+00A9 (Ã + ©).

    Only handles 2-byte sequences (U+0080–U+00FF, all common French accents).
    3-byte detection omitted — too many false positives with é followed by « » etc.
    """
    if not s:
        return s, False

    out     = []
    i       = 0
    changed = False

    while i < len(s):
        cp = ord(s[i])

        # 2-byte UTF-8 lead byte: C2 or C3 (produces chars in U+0080–U+00FF range)
        if cp in (0xC2, 0xC3) and i + 1 < len(s):
            nxt = ord(s[i + 1])
            if 0x80 <= nxt <= 0xBF:
                try:
                    decoded = bytes([cp, nxt]).decode("utf-8")
                    out.append(decoded)
                    i += 2
                    changed = True
                    continue
                except UnicodeDecodeError:
                    pass

        out.append(s[i])
        i += 1

    return "".join(out), changed


def run(check_only: bool, target_field: str | None = None) -> None:
    fields = [target_field] if target_field else FIELDS

    conn = psycopg2.connect(DB_URL)
    conn.autocommit = False
    cur  = conn.cursor()

    cols = ", ".join(fields)
    cur.execute(f"SELECT id, {cols} FROM articles ORDER BY id")
    rows = cur.fetchall()

    total_rows    = len(rows)
    affected_rows = 0
    field_counts  = {f: 0 for f in fields}
    samples       = []

    updates: list[tuple[int, dict[str, str]]] = []

    for row in rows:
        row_id   = row[0]
        new_vals: dict[str, str] = {}

        for fi, field in enumerate(fields):
            val = row[fi + 1]
            if not val:
                continue
            fixed, changed = fix_mojibake(val)
            if changed:
                field_counts[field] += 1
                new_vals[field] = fixed
                if len(samples) < 6 and field == "title":
                    samples.append((row_id, val[:80], fixed[:80]))

        if new_vals:
            affected_rows += 1
            updates.append((row_id, new_vals))

    print(f"\nScanned {total_rows} rows")
    print(f"Rows with double-encoded text: {affected_rows}")
    print("Breakdown by field:")
    for f in fields:
        if field_counts[f]:
            print(f"  {f}: {field_counts[f]} rows")

    if samples:
        print("\nSample fixes (title):")
        for id_, before, after in samples:
            print(f"  id={id_}")
            print(f"    before: {before}")
            print(f"    after:  {after}")
            # Show non-ASCII codepoints to make the fix unambiguous
            b_hi = [(i, hex(ord(c)), c) for i, c in enumerate(before) if ord(c) > 0x7F][:6]
            a_hi = [(i, hex(ord(c)), c) for i, c in enumerate(after)  if ord(c) > 0x7F][:6]
            print(f"    non-ASCII before: {b_hi}")
            print(f"    non-ASCII after:  {a_hi}")

    if check_only:
        print("\nRun with --fix to apply.")
        conn.close()
        return

    if not affected_rows:
        print("Nothing to fix.")
        conn.close()
        return

    print(f"\nApplying {affected_rows} updates…")
    for row_id, new_vals in updates:
        set_clause = ", ".join(f"{col} = %s" for col in new_vals)
        cur.execute(
            f"UPDATE articles SET {set_clause} WHERE id = %s",
            list(new_vals.values()) + [row_id],
        )

    conn.commit()
    print("Done — committed.")
    conn.close()


if __name__ == "__main__":
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]

    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Dry run — report only")
    parser.add_argument("--fix",   action="store_true", help="Apply fixes")
    parser.add_argument("--field", help="Check a single field (e.g. body)")
    args = parser.parse_args()

    if not args.check and not args.fix:
        parser.print_help()
        sys.exit(1)

    run(check_only=not args.fix, target_field=args.field)
