import { spawnSync } from "node:child_process";

const ALICE = "aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px";
const BOB = "aleo1ayymcezu09pnkmyyshvnlp82t9qvqeg5ej4w85c9gfalmhe9fczss6v5fp";

function runLeo(args) {
  const result = spawnSync("./bin/leo", args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      HOME: process.cwd(),
    },
    encoding: "utf8",
  });

  if (result.status !== 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  return result.stdout;
}

function extractRecord(output) {
  const bulletIndex = output.indexOf("• {");
  const start = bulletIndex === -1 ? output.indexOf("{") : output.indexOf("{", bulletIndex);
  if (start === -1) {
    throw new Error("could not find output record");
  }

  let depth = 0;
  for (let index = start; index < output.length; index += 1) {
    if (output[index] === "{") depth += 1;
    if (output[index] === "}") depth -= 1;
    if (depth === 0) {
      return output.slice(start, index + 1);
    }
  }

  throw new Error("could not parse output record");
}

console.log("Minting 100 private tokens to Alice...");
const mintedOutput = runLeo(["run", "mint_private", ALICE, "100u64"]);
const mintedRecord = extractRecord(mintedOutput);
console.log(mintedRecord);

console.log();
console.log("Transferring 35 private tokens to Bob...");
const transferOutput = runLeo(["run", "transfer_private", mintedRecord, BOB, "35u64"]);
const outputStart = transferOutput.indexOf("➡️  Output");
console.log(outputStart === -1 ? transferOutput : transferOutput.slice(outputStart));
