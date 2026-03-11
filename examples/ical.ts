/**
 * ical.ts
 *
 * Exports all upcoming events as an iCalendar (.ics) file at ./exports/spond.ics.
 * The file can be imported into any calendar application (Google Calendar,
 * Apple Calendar, Outlook, etc.).
 *
 * Usage:
 *   SPOND_USERNAME=you@example.com SPOND_PASSWORD=secret npx tsx examples/ical.ts
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { Spond, type Event } from "../dist/index.js";

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.error(`Error: ${name} environment variable is required.`);
    process.exit(1);
  }
  return val;
}

// ---------------------------------------------------------------------------
// iCalendar generation — no external dependencies
// ---------------------------------------------------------------------------

/** Fold long lines per RFC 5545 (max 75 octets, continuation with a space). */
function foldLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;

  const chunks: string[] = [];
  let offset = 0;
  let first = true;
  while (offset < bytes.length) {
    const limit = first ? 75 : 74; // first line 75, continuation lines 74 + 1 space
    chunks.push(new TextDecoder().decode(bytes.slice(offset, offset + limit)));
    offset += limit;
    first = false;
  }
  return chunks.join("\r\n ");
}

/** Escape special characters in iCalendar text values. */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

/** Format a Date as an iCalendar datetime string (UTC). */
function formatDt(dateStr: string): string {
  return new Date(dateStr)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function eventToVEvent(event: Event): string {
  const lines: string[] = [
    "BEGIN:VEVENT",
    `UID:${event.id}@spond`,
    `DTSTAMP:${formatDt(new Date().toISOString())}`,
    `DTSTART:${formatDt(event.startTimestamp)}`,
    `DTEND:${formatDt(event.endTimestamp)}`,
    `SEQUENCE:${event.updated}`,
    `SUMMARY:${escapeText(event.heading)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  }

  if (event.type === "cancelled") {
    lines.push("STATUS:CANCELLED");
  }

  const loc = (event as unknown as Record<string, unknown>)["location"] as
    | Record<string, string>
    | undefined;
  if (loc) {
    const locationStr = [loc["feature"], loc["address"]]
      .filter(Boolean)
      .join(", ");
    if (locationStr) lines.push(`LOCATION:${escapeText(locationStr)}`);
  }

  lines.push("END:VEVENT");

  return lines.map(foldLine).join("\r\n");
}

function buildCalendar(events: Event[]): string {
  const vEvents = events.map(eventToVEvent).join("\r\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//spond-typescript//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    vEvents,
    "END:VCALENDAR",
    "", // trailing newline
  ].join("\r\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const username = requireEnv("SPOND_USERNAME");
  const password = requireEnv("SPOND_PASSWORD");

  const spond = new Spond({ username, password });
  const exportsDir = "./exports";
  await mkdir(exportsDir, { recursive: true });

  console.log("Fetching events…");
  const events = await spond.getEvents();
  console.log(`Found ${events.length} event(s).`);

  const icsContent = buildCalendar(events);
  const outputPath = join(exportsDir, "spond.ics");
  await writeFile(outputPath, icsContent, "utf8");

  console.log(`Written to ${outputPath}`);

  spond.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
