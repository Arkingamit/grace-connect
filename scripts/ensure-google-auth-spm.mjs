import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pluginDir = join(
  root,
  "node_modules/@codetrix-studio/capacitor-google-auth"
);
const dest = join(pluginDir, "Package.swift");
const src = join(root, "scripts/codetrix-google-auth.Package.swift");

if (!existsSync(pluginDir)) {
  process.exit(0);
}

copyFileSync(src, dest);
console.log("Added Package.swift to @codetrix-studio/capacitor-google-auth");
