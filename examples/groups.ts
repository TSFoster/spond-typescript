/**
 * groups.ts
 *
 * Exports each group you belong to as a JSON file in ./exports/.
 *
 * Usage:
 *   SPOND_USERNAME=you@example.com SPOND_PASSWORD=secret npx tsx examples/groups.ts
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { Spond } from "../dist/index.js";

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

async function main() {
  const username = requireEnv("SPOND_USERNAME");
  const password = requireEnv("SPOND_PASSWORD");

  const spond = new Spond({ username, password });
  const exportsDir = "./exports";

  await mkdir(exportsDir, { recursive: true });

  console.log("Fetching groups…");
  const groups = await spond.getGroups();
  console.log(`Found ${groups.length} group(s). Writing to ${exportsDir}/\n`);

  for (const group of groups) {
    const filename = join(exportsDir, `${sanitiseFilename(group.name)}.json`);
    await writeFile(filename, JSON.stringify(group, null, 2), "utf8");
    console.log(`  Wrote ${filename}`);
  }

  spond.close();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
