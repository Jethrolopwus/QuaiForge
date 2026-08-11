// QuaiForge — shared deployment utilities
// Used by all three deploy-*.js scripts to ensure consistent output,
// read-back verification, and artifact logging.

const fs   = require("fs");
const path = require("path");

/**
 * Print a section header to stdout.
 * @param {string} title
 */
function heading(title) {
  const line = "─".repeat(60);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(line);
}

/**
 * Wait for a specified number of milliseconds.
 * Used to add a small pause between deployment confirmation and read-back.
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Log a deployed contract address and tx hash to deploy-addresses.json
 * in the smart-contracts root.  Creates the file if it doesn't exist.
 * @param {string} templateId  e.g. "token-v1"
 * @param {string} address     deployed contract address
 * @param {string} txHash      deployment transaction hash
 * @param {string} network     hardhat network name
 */
function recordDeployment(templateId, address, txHash, network) {
  const outPath = path.join(__dirname, "../../deploy-addresses.json");
  let record = {};

  if (fs.existsSync(outPath)) {
    try {
      record = JSON.parse(fs.readFileSync(outPath, "utf8"));
    } catch (_) {
      record = {};
    }
  }

  if (!record[network]) record[network] = {};

  record[network][templateId] = {
    address,
    txHash,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(outPath, JSON.stringify(record, null, 2) + "\n");
  console.log(`\n  📝 Recorded in deploy-addresses.json`);
}

/**
 * Print a Quaiscan explorer link for a deployed address.
 * @param {string} address
 * @param {string} network  "orchard" | other
 */
function quaiscanLink(address, network) {
  if (network === "orchard") {
    console.log(`\n  🔍 Quaiscan: https://orchard.quaiscan.io/address/${address}`);
  }
}

module.exports = { heading, sleep, recordDeployment, quaiscanLink };
