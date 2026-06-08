import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env");

function parseEnvFile(path) {
  const entries = {};
  const text = readFileSync(path, "utf8");

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const index = line.indexOf("=");
    if (index === -1) continue;

    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    entries[key] = value;
  }

  return entries;
}

const config = parseEnvFile(envPath);
const required = ["ALEO_PRIVATE_KEY", "ALEO_NETWORK", "ALEO_ENDPOINT"];
const missing = required.filter((key) => !config[key]);

if (missing.length > 0) {
  console.error(`Missing required .env value(s): ${missing.join(", ")}`);
  process.exit(1);
}

const leoEnv = {
  ...process.env,
  HOME: root,
  PRIVATE_KEY: config.ALEO_PRIVATE_KEY,
  NETWORK: config.ALEO_NETWORK,
  ENDPOINT: config.ALEO_ENDPOINT,
};

function redact(text) {
  return text
    .replaceAll(config.ALEO_PRIVATE_KEY, "[redacted-private-key]")
    .replace(/APrivateKey[1-9A-HJ-NP-Za-km-z]+/g, "[redacted-private-key]");
}

function runLeo(args) {
  const result = spawnSync(resolve(root, "bin/leo"), args, {
    cwd: "/tmp",
    env: leoEnv,
    encoding: "utf8",
  });

  process.stdout.write(redact(result.stdout));
  process.stderr.write(redact(result.stderr));

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Deploying ${config.ALEO_PROGRAM_ID || "program"} to ${config.ALEO_NETWORK}...`);
runLeo([
  "deploy",
  "--path",
  root,
  "--home",
  root,
  "--network",
  config.ALEO_NETWORK,
  "--endpoint",
  config.ALEO_ENDPOINT,
  "--broadcast",
  "--yes",
]);
