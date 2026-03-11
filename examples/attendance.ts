/**
 * attendance.ts
 *
 * Generates a CSV attendance report for each event in a date range.
 * One file per event is written to ./exports/.
 *
 * Usage:
 *   SPOND_USERNAME=you@example.com SPOND_PASSWORD=secret \
 *     npx tsx examples/attendance.ts --from 2025-01-01 --to 2025-06-30
 *
 * Flags:
 *   --from  YYYY-MM-DD  Start date (inclusive). Defaults to today.
 *   --to    YYYY-MM-DD  End date (exclusive). Defaults to one year from today.
 *   --all               Include all members' responses (not just organisers).
 */

import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { Spond, type Event } from "../dist/index.js";

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): { from: Date; to: Date; all: boolean } {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const today = new Date();
  const nextYear = new Date(today);
  nextYear.setFullYear(nextYear.getFullYear() + 1);

  const from = get("--from") ? new Date(get("--from")!) : today;
  const to = get("--to") ? new Date(get("--to")!) : nextYear;
  const all = args.includes("--all");

  return { from, to, all };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.error(`Error: ${name} environment variable is required.`);
    process.exit(1);
  }
  return val;
}

function sanitiseFilename(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w.-]/g, "");
}

/** Write rows to a CSV file, escaping fields that need it. */
function csvRow(fields: string[]): string {
  return (
    fields
      .map((f) => {
        const str = String(f ?? "");
        return str.includes(",") || str.includes('"') || str.includes("\n")
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      })
      .join(",") + "\n"
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const username = requireEnv("SPOND_USERNAME");
  const password = requireEnv("SPOND_PASSWORD");
  const { from, to, all } = parseArgs();

  console.log(
    `Date range: ${from.toISOString().slice(0, 10)} → ${to.toISOString().slice(0, 10)}`,
  );
  if (all) console.log("Including all member responses.");

  const spond = new Spond({ username, password });
  const exportsDir = "./exports";
  await mkdir(exportsDir, { recursive: true });

  console.log("\nFetching events…");
  const events = await spond.getEvents({ minStart: from, maxStart: to });
  console.log(`Found ${events.length} event(s).\n`);

  // Fetch groups once so getPerson() can use the cache
  await spond.getGroups();

  for (const event of events) {
    await writeAttendanceCsv(spond, event, exportsDir, all);
  }

  spond.close();
  console.log("\nDone.");
}

async function writeAttendanceCsv(
  spond: Spond,
  event: Event,
  dir: string,
  includeAll: boolean,
): Promise<void> {
  const filename = join(
    dir,
    `${sanitiseFilename(event.startTimestamp)}-${sanitiseFilename(event.heading)}.csv`,
  );

  const stream = createWriteStream(filename, { encoding: "utf8" });
  const write = (fields: string[]) =>
    new Promise<void>((res, rej) =>
      stream.write(csvRow(fields), (err) => (err ? rej(err) : res())),
    );

  await write(["Start", "End", "Heading", "Name", "Answer", "Organiser"]);

  // Organisers
  for (const owner of event.owners) {
    const name = await resolveName(spond, owner.id);
    await write([
      event.startTimestamp,
      event.endTimestamp,
      event.heading,
      name,
      owner.response,
      "X",
    ]);
  }

  if (includeAll) {
    const r = event.responses;
    for (const id of r.acceptedIds) {
      await write([
        event.startTimestamp,
        event.endTimestamp,
        event.heading,
        await resolveName(spond, id),
        "accepted",
        "",
      ]);
    }
    for (const id of r.declinedIds) {
      await write([
        event.startTimestamp,
        event.endTimestamp,
        event.heading,
        await resolveName(spond, id),
        "declined",
        "",
      ]);
    }
    for (const id of r.unansweredIds) {
      await write([
        event.startTimestamp,
        event.endTimestamp,
        event.heading,
        await resolveName(spond, id),
        "unanswered",
        "",
      ]);
    }
    for (const id of r.waitinglistIds) {
      await write([
        event.startTimestamp,
        event.endTimestamp,
        event.heading,
        await resolveName(spond, id),
        "waitinglist",
        "",
      ]);
    }
  }

  await new Promise<void>((res, rej) =>
    stream.end((err: Error | null | undefined) => (err ? rej(err) : res())),
  );
  console.log(`  Wrote ${filename}`);
}

/** Resolve a member ID to a display name, falling back to the raw ID. */
async function resolveName(spond: Spond, memberId: string): Promise<string> {
  try {
    const person = await spond.getPerson(memberId);
    return `${person.firstName} ${person.lastName}`;
  } catch {
    return memberId;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
