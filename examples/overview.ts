/**
 * overview.ts
 *
 * Prints a quick summary of your groups, upcoming events, recent chats, and
 * (optionally) club transactions. Useful as a quick sanity-check that
 * everything is working.
 *
 * Usage:
 *   SPOND_USERNAME=you@example.com SPOND_PASSWORD=secret npx tsx examples/overview.ts
 *
 * Club transactions (optional):
 *   SPOND_USERNAME=... SPOND_PASSWORD=... SPOND_CLUB_ID=<id> npx tsx examples/overview.ts
 */

import { Spond, SpondClub } from "../dist/index.js";
import type { Event, GroupDetailed, Transaction } from "../dist/index.js";

const MAX_EVENTS = 10;
const MAX_CHATS = 10;
const MAX_TRANSACTIONS = 10;

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.error(`Error: ${name} environment variable is required.`);
    process.exit(1);
  }
  return val;
}

function abbreviate(text: string, length = 64): string {
  if (text.length > length) return `${text.slice(0, length)}[…]`;
  return text;
}

function groupSummary(g: GroupDetailed): string {
  return `id='${g.id}', name='${g.name}', members=${g.members.length}`;
}

function eventSummary(e: Event): string {
  return `id='${e.id}', heading='${e.heading}', start='${e.startTimestamp}'`;
}

function transactionSummary(t: Transaction): string {
  const paid = t["paidAt"] as string | undefined;
  const name = t["paymentName"] as string | undefined;
  const payer = t["paidByName"] as string | undefined;
  return `id='${t.id}', paidAt='${paid}', payment='${name}', payer='${payer}'`;
}

async function main() {
  const username = requireEnv("SPOND_USERNAME");
  const password = requireEnv("SPOND_PASSWORD");
  const clubId = process.env["SPOND_CLUB_ID"];

  const spond = new Spond({ username, password });

  // Groups
  console.log("\nFetching groups…");
  const groups = await spond.getGroups();
  console.log(`${groups.length} group(s):`);
  for (const [i, g] of groups.entries()) {
    console.log(`  [${i}] ${groupSummary(g)}`);
  }

  // Events
  console.log(`\nFetching up to ${MAX_EVENTS} events…`);
  const events = await spond.getEvents({ maxEvents: MAX_EVENTS });
  console.log(`${events.length} event(s):`);
  for (const [i, e] of events.entries()) {
    console.log(`  [${i}] ${eventSummary(e)}`);
  }

  // Messages / chats
  console.log(`\nFetching up to ${MAX_CHATS} chats…`);
  const chats = await spond.getMessages(MAX_CHATS);
  console.log(`${chats.length} chat(s):`);
  for (const [i, chat] of chats.entries()) {
    const msg = chat["message"] as Record<string, unknown> | undefined;
    const text = typeof msg?.["text"] === "string" ? msg["text"] : "";
    const ts = msg?.["timestamp"] ?? "unknown";
    console.log(`  [${i}] timestamp='${ts}', text='${abbreviate(text)}'`);
  }

  // Club transactions (only if SPOND_CLUB_ID is set)
  if (clubId) {
    const club = new SpondClub({ username, password });
    console.log(
      `\nFetching up to ${MAX_TRANSACTIONS} transactions for club '${clubId}'…`,
    );
    const transactions = await club.getTransactions(clubId, {
      maxItems: MAX_TRANSACTIONS,
    });
    console.log(`${transactions.length} transaction(s):`);
    for (const [i, t] of transactions.entries()) {
      console.log(`  [${i}] ${transactionSummary(t)}`);
    }
  } else {
    console.log("\n(Set SPOND_CLUB_ID to also show club transactions.)");
  }

  spond.close();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
