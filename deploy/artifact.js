import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Loads the compiled TaskAttest artifact (ABI + bytecode) straight from the
 * Foundry build output in ../out. This is the same verified build the tests
 * ran against — no separate/duplicated artifact to drift out of sync.
 *
 * If ../out is missing (e.g. a fresh clone that never ran `forge build`),
 * this throws a clear, actionable error instead of a cryptic undefined.
 */
export function loadTaskAttestArtifact() {
  const artifactPath = path.resolve(__dirname, "..", "out", "TaskAttest.sol", "TaskAttest.json");

  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      `Compiled artifact not found at ${artifactPath}.\n` +
        `Run a Foundry build first (in WSL/Git Bash):\n` +
        `  forge install foundry-rs/forge-std\n` +
        `  forge install OpenZeppelin/openzeppelin-contracts\n` +
        `  forge build`
    );
  }

  const raw = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const abi = raw.abi;
  const bytecode = raw.bytecode?.object;

  if (!abi || !Array.isArray(abi) || abi.length === 0) {
    throw new Error(`Artifact at ${artifactPath} has no usable ABI.`);
  }
  if (!bytecode || !bytecode.startsWith("0x") || bytecode.length < 4) {
    throw new Error(`Artifact at ${artifactPath} has no usable bytecode.`);
  }

  return { abi, bytecode };
}
