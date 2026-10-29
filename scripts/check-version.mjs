// Fails when the three version fields disagree. Run in CI before a release so a
// tag can never ship a build that reports a different version than it is.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const tauri = JSON.parse(
  fs.readFileSync(path.join(root, "src-tauri", "tauri.conf.json"), "utf8"),
);
const cargo = fs.readFileSync(path.join(root, "src-tauri", "Cargo.toml"), "utf8");
const cargoVersion = /^version = "([^"]+)"/m.exec(cargo)?.[1];

const versions = {
  "package.json": pkg.version,
  "tauri.conf.json": tauri.version,
  "Cargo.toml": cargoVersion,
};

if (new Set(Object.values(versions)).size !== 1) {
  console.error("Version mismatch:", versions);
  process.exit(1);
}

const tag = process.env.GITHUB_REF_NAME;
if (tag && tag.startsWith("v") && tag.slice(1) !== pkg.version) {
  console.error(`Tag ${tag} does not match package version ${pkg.version}`);
  process.exit(1);
}

console.log(`Version ${pkg.version} is consistent`);
