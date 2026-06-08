import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const command = process.argv[2] || "build";
const extraArgs = process.argv.slice(3);

function parseEnvFile(path) {
  const values = {};

  try {
    const text = readFileSync(path, "utf8");
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const index = line.indexOf("=");
      if (index === -1) continue;
      values[line.slice(0, index).trim()] = line.slice(index + 1).trim();
    }
  } catch {
    return values;
  }

  return values;
}

const config = parseEnvFile(resolve(root, ".env"));
const leoEnv = {
  ...process.env,
  HOME: root,
  NETWORK: config.ALEO_NETWORK || process.env.NETWORK || "testnet",
  ENDPOINT:
    config.ALEO_ENDPOINT ||
    process.env.ENDPOINT ||
    "https://api.explorer.provable.com/v1",
};

if (config.ALEO_PRIVATE_KEY) {
  leoEnv.PRIVATE_KEY = config.ALEO_PRIVATE_KEY;
}

function redact(text) {
  let output = text.replace(/APrivateKey[1-9A-HJ-NP-Za-km-z]+/g, "[redacted-private-key]");
  if (config.ALEO_PRIVATE_KEY) {
    output = output.replaceAll(config.ALEO_PRIVATE_KEY, "[redacted-private-key]");
  }
  return output;
}

const result = spawnSync(resolve(root, "bin/leo"), [command, "--path", root, "--home", root, ...extraArgs], {
  cwd: "/tmp",
  env: leoEnv,
  encoding: "utf8",
});

process.stdout.write(redact(result.stdout));
process.stderr.write(redact(result.stderr));
process.exit(result.status ?? 1);
