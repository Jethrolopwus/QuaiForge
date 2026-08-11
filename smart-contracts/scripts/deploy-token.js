// QuaiForge — Deployment Script: Template A (ERC-20 Token)
// Usage:
//   npx hardhat run scripts/deploy-token.js --network orchard
//   npx hardhat run scripts/deploy-token.js --network localhost
//
// Configuration is read from environment variables (see .env.example).
// Required: DEPLOYER_PRIVATE_KEY
//
// Token parameters are set via the TOKEN_* env vars below, with sensible
// defaults for testnet demos.  In production, always set these explicitly.

require("dotenv").config();

const { ethers }  = require("hardhat");
const { heading, sleep, recordDeployment, quaiscanLink } = require("./utils/deployHelpers");

// ---------------------------------------------------------------------------
// Deployment parameters — override via environment variables
// ---------------------------------------------------------------------------
const PARAMS = {
  name:          process.env.TOKEN_NAME          || "QuaiForge Demo Token",
  symbol:        process.env.TOKEN_SYMBOL        || "QFT",
  initialSupply: process.env.TOKEN_INITIAL_SUPPLY || "1000000",  // whole tokens
  // owner defaults to deployer wallet — override only if deploying for a third party
  owner:         process.env.TOKEN_OWNER_ADDRESS || null,
};

async function main() {
  heading("QuaiForge — Deploy: QuaiForgeToken (template-v1)");

  // -------------------------------------------------------------------------
  // Signer
  // -------------------------------------------------------------------------
  const [deployer] = await ethers.getSigners();
  const owner = PARAMS.owner || deployer.address;

  console.log(`\n  Deployer : ${deployer.address}`);
  console.log(`  Owner    : ${owner}`);
  console.log(`  Network  : ${hre.network.name}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`  Balance  : ${ethers.formatEther(balance)} QUAI`);

  if (balance === 0n) {
    console.error("\n  ⚠️  Deployer balance is 0 — fund from https://orchard.faucet.quai.network before deploying");
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Parameter summary (mirrors the Review step in the UI)
  // -------------------------------------------------------------------------
  console.log("\n  ── Token Parameters ──────────────────────────────────");
  console.log(`  Name           : ${PARAMS.name}`);
  console.log(`  Symbol         : ${PARAMS.symbol}`);
  console.log(`  Initial Supply : ${Number(PARAMS.initialSupply).toLocaleString()} tokens`);
  console.log(`  Owner          : ${owner}`);

  // -------------------------------------------------------------------------
  // Deploy
  // -------------------------------------------------------------------------
  console.log("\n  Deploying QuaiForgeToken...");

  const factory  = await ethers.getContractFactory("QuaiForgeToken");
  const contract = await factory.deploy(
    PARAMS.name,
    PARAMS.symbol,
    BigInt(PARAMS.initialSupply),
    owner
  );

  console.log(`  Tx hash : ${contract.deploymentTransaction()?.hash}`);
  console.log("  Waiting for confirmation...");

  // Wait for 1 block confirmation
  const receipt = await contract.deploymentTransaction()?.wait(1);

  const address = await contract.getAddress();

  console.log(`\n  ✅ QuaiForgeToken deployed at: ${address}`);
  console.log(`  Block             : ${receipt?.blockNumber}`);
  console.log(`  Gas used          : ${receipt?.gasUsed?.toString()}`);

  // -------------------------------------------------------------------------
  // Post-deploy read-back check (§6.3)
  // Reads back all constructor parameters and compares to what was deployed.
  // If anything doesn't match, it's flagged prominently — it should NEVER
  // happen with a fixed template artifact, but the check is the safety net.
  // -------------------------------------------------------------------------
  console.log("\n  ── Read-back verification (§6.3) ─────────────────────");
  await sleep(1000); // small pause to let the node index the new contract

  const deployed = await ethers.getContractAt("QuaiForgeToken", address);
  const summary  = await deployed.deploymentSummary();

  const [
    rName,
    rSymbol,
    rTotalSupply,
    rOwner,
    rTemplateVersion,
    rDecimals,
  ] = summary;

  const expectedSupplyWei = BigInt(PARAMS.initialSupply) * (10n ** 18n);

  const checks = [
    { label: "name",            expected: PARAMS.name,        actual: rName },
    { label: "symbol",          expected: PARAMS.symbol,      actual: rSymbol },
    { label: "totalSupply(wei)",expected: expectedSupplyWei.toString(), actual: rTotalSupply.toString() },
    { label: "owner",           expected: owner.toLowerCase(), actual: rOwner.toLowerCase() },
    { label: "templateVersion", expected: "token-v1",          actual: rTemplateVersion },
    { label: "decimals",        expected: "18",                actual: rDecimals.toString() },
  ];

  let allPassed = true;
  for (const { label, expected, actual } of checks) {
    const pass = expected === actual;
    console.log(`  ${pass ? "✅" : "❌"} ${label.padEnd(20)}: ${actual}`);
    if (!pass) {
      console.error(`     Expected: ${expected}`);
      allPassed = false;
    }
  }

  if (!allPassed) {
    console.error("\n  ⚠️  READ-BACK MISMATCH — deployment may not have matched parameters!");
    process.exit(1);
  }

  console.log("\n  ✅ All read-back checks passed.");

  // -------------------------------------------------------------------------
  // Record deployment and print explorer link
  // -------------------------------------------------------------------------
  recordDeployment("token-v1", address, receipt?.hash, hre.network.name);
  quaiscanLink(address, hre.network.name);

  console.log("\n  🎉 Token deployment complete.\n");
}

main().catch((err) => {
  console.error("\n  ❌ Deployment failed:", err.message || err);
  process.exitCode = 1;
});
