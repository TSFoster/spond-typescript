/**
 * transactions.ts
 *
 * Exports Spond Club transactions to ./exports/transactions.csv.
 *
 * Usage:
 *   SPOND_USERNAME=you@example.com SPOND_PASSWORD=secret SPOND_CLUB_ID=<id> \
 *     npx tsx examples/transactions.ts
 *
 * Flags:
 *   --max <n>   Maximum number of transactions to fetch (default: 1000).
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { SpondClub, type Transaction } from "../dist/index.js";

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.error(`Error: ${name} environment variable is required.`);
    process.exit(1);
  }
  return val;
}

function parseArgs(): { max: number } {
  const args = process.argv.slice(2);
  const idx = args.indexOf("--max");
  const max = idx !== -1 ? parseInt(args[idx + 1] ?? "1000", 10) : 1000;
  return { max };
}

/** Convert a list of transaction objects to a CSV string. */
function toCsv(transactions: Transaction[]): string {
  if (transactions.length === 0) return "";

  // Collect all unique keys across all transactions as the header row
  const headers = Array.from(
    new Set(transactions.flatMap((t) => Object.keys(t))),
  );

  const escape = (value: unknown): string => {
    const str = value == null ? "" : String(value);
    return str.includes(",") || str.includes('"') || str.includes("\n")
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };

  const rows = [
    headers.join(","),
    ...transactions.map((t) => headers.map((h) => escape(t[h])).join(",")),
  ];

  return rows.join("\n") + "\n";
}

async function main() {
  const username = requireEnv("SPOND_USERNAME");
  const password = requireEnv("SPOND_PASSWORD");
  const clubId = requireEnv("SPOND_CLUB_ID");
  const { max } = parseArgs();

  const club = new SpondClub({ username, password });
  const exportsDir = "./exports";
  await mkdir(exportsDir, { recursive: true });

  console.log(`Fetching up to ${max} transactions for club '${clubId}'…`);
  const transactions = await club.getTransactions(clubId, { maxItems: max });

  if (transactions.length === 0) {
    console.log("No transactions found.");
    club.close();
    return;
  }

  const outputPath = join(exportsDir, "transactions.csv");
  await writeFile(outputPath, toCsv(transactions), "utf8");

  console.log(
    `Collected ${transactions.length} transaction(s). Written to ${outputPath}`,
  );

  club.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
