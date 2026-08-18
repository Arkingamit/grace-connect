import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pluginDir = join(
  root,
  "node_modules/@codetrix-studio/capacitor-google-auth"
);

if (!existsSync(pluginDir)) {
  process.exit(0);
}

const files = [
  ["scripts/codetrix-google-auth.Package.swift", "Package.swift"],
  [
    "scripts/codetrix-google-auth.CapacitorBridge.swift",
    "ios/Plugin/CapacitorBridge.swift",
  ],
];

for (const [from, to] of files) {
  copyFileSync(join(root, from), join(pluginDir, to));
}

console.log("Added SPM support to @codetrix-studio/capacitor-google-auth");
