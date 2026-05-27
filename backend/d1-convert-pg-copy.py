"""Convert pg_dump COPY blocks to SQLite-compatible INSERTs for D1 import."""
import re
import sys
from pathlib import Path

SRC = Path(r"C:\Users\Admin\Downloads\railway_postgres_backup_2026-05-23.sql")
DST = Path(r"c:\Users\Admin\Downloads\projekt\backend\d1-data.sql")


def unescape_pg(value: str) -> str:
    """pg COPY escapes: \\N -> NULL marker handled by caller; \\n \\t \\r \\\\ in values."""
    out = []
    i = 0
    while i < len(value):
        c = value[i]
        if c == "\\" and i + 1 < len(value):
            nxt = value[i + 1]
            if nxt == "n":
                out.append("\n")
            elif nxt == "t":
                out.append("\t")
            elif nxt == "r":
                out.append("\r")
            elif nxt == "\\":
                out.append("\\")
            else:
                out.append(nxt)
            i += 2
        else:
            out.append(c)
            i += 1
    return "".join(out)


def sql_quote(value):
    if value is None:
        return "NULL"
    s = str(value).replace("'", "''")
    return f"'{s}'"


def main() -> int:
    text = SRC.read_text(encoding="utf-8")
    lines = text.splitlines()

    output: list[str] = []
    output.append("-- Auto-generated from railway_postgres_backup_2026-05-23.sql")
    output.append("PRAGMA foreign_keys = OFF;")
    output.append("")

    in_copy = False
    table = ""
    columns: list[str] = []
    row_count = 0

    copy_re = re.compile(r"^COPY public\.(\w+) \(([^)]+)\) FROM stdin;$")

    for line in lines:
        if not in_copy:
            m = copy_re.match(line)
            if m:
                table = m.group(1)
                columns = [c.strip() for c in m.group(2).split(",")]
                in_copy = True
                row_count = 0
                output.append(f"-- {table}")
            continue

        if line == "\\.":
            output.append(f"-- {table}: {row_count} rows imported")
            output.append("")
            in_copy = False
            continue

        # Data row: tab-separated fields, \N for NULL
        raw_fields = line.split("\t")
        if len(raw_fields) != len(columns):
            print(f"WARN {table}: column count mismatch: {len(raw_fields)} vs {len(columns)}", file=sys.stderr)
            continue

        values = []
        for raw in raw_fields:
            if raw == "\\N":
                values.append("NULL")
            else:
                values.append(sql_quote(unescape_pg(raw)))

        cols_sql = ", ".join(columns)
        vals_sql = ", ".join(values)
        output.append(f"INSERT INTO {table} ({cols_sql}) VALUES ({vals_sql});")
        row_count += 1

    output.append("")
    output.append("PRAGMA foreign_keys = ON;")

    DST.write_text("\n".join(output), encoding="utf-8")
    print(f"Wrote {DST} ({len(output)} lines)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
