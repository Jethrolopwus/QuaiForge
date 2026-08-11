// QuaiForge — Test Suite: QuaiForgeMultisig (multisig-v1)
// Run: npx hardhat test test/QuaiForgeMultisig.test.js --network localhost
//
// Coverage:
//   ✓ Constructor validation (all rejection cases)
//   ✓ Signer set and threshold stored correctly
//   ✓ Receive Ether / balance()
//   ✓ submitTransaction() — only signers, zero-address destination rejected
//   ✓ confirmTransaction() — only signers, only once per signer
//   ✓ revokeConfirmation() — signer can revoke their own confirmation
//   ✓ executeTransaction() — requires threshold, executes correctly
//   ✓ Full end-to-end: 2-of-3 multisig flow
//   ✓ deploymentSummary() read-back (§6.3)

const { expect } = require("chai");
const { ethers }  = require("hardhat");

describe("QuaiForgeMultisig", function () {
  let owner, alice, bob, carol, stranger;

  beforeEach(async () => {
    [owner, alice, bob, carol, stranger] = await ethers.getSigners();
  });

  // ── Helper: deploy a 2-of-3 multisig (alice, bob, carol) ─────────────────
  async function deploy2of3() {
    const F = await ethers.getContractFactory("QuaiForgeMultisig");
    const c = await F.deploy([alice.address, bob.address, carol.address], 2);
    await c.waitForDeployment();
    return c;
  }

  // ── Constructor validation ───────────────────────────────────────────────
  describe("constructor — parameter validation", () => {
    it("reverts with fewer than 2 signers", async () => {
      const F = await ethers.getContractFactory("QuaiForgeMultisig");
      await expect(F.deploy([alice.address], 1))
        .to.be.revertedWith("QuaiForgeMultisig: need at least 2 signers");
    });

    it("reverts when threshold is zero", async () => {
      const F = await ethers.getContractFactory("QuaiForgeMultisig");
      await expect(F.deploy([alice.address, bob.address], 0))
        .to.be.revertedWith("QuaiForgeMultisig: threshold must be >= 1");
    });

    it("reverts when threshold exceeds signer count", async () => {
      const F = await ethers.getContractFactory("QuaiForgeMultisig");
      await expect(F.deploy([alice.address, bob.address], 3))
        .to.be.revertedWith("QuaiForgeMultisig: threshold exceeds signer count");
    });

    it("reverts on zero address in signers", async () => {
      const F = await ethers.getContractFactory("QuaiForgeMultisig");
      await expect(F.deploy([alice.address, ethers.ZeroAddress], 1))
        .to.be.revertedWith("QuaiForgeMultisig: zero address signer");
    });

    it("reverts on duplicate signer address", async () => {
      const F = await ethers.getContractFactory("QuaiForgeMultisig");
      await expect(F.deploy([alice.address, alice.address], 1))
        .to.be.revertedWith("QuaiForgeMultisig: duplicate signer address");
    });

    it("deploys successfully with valid params (2-of-3)", async () => {
      const c = await deploy2of3();
      expect(await c.getAddress()).to.be.properAddress;
    });

    it("deploys successfully with threshold == signer count (unanimous)", async () => {
      const F = await ethers.getContractFactory("QuaiForgeMultisig");
      const c = await F.deploy([alice.address, bob.address], 2);
      await c.waitForDeployment();
      expect(await c.threshold()).to.equal(2n);
    });
  });

  // ── Signer set ───────────────────────────────────────────────────────────
  describe("signer set after deployment", () => {
    it("getSigners() returns all signers", async () => {
      const c = await deploy2of3();
      const signers = await c.getSigners();
      expect(signers.length).to.equal(3);
      expect(signers).to.include(alice.address);
      expect(signers).to.include(bob.address);
      expect(signers).to.include(carol.address);
    });

    it("isSigner mapping is correct", async () => {
      const c = await deploy2of3();
      expect(await c.isSigner(alice.address)).to.be.true;
      expect(await c.isSigner(bob.address)).to.be.true;
      expect(await c.isSigner(carol.address)).to.be.true;
      expect(await c.isSigner(stranger.address)).to.be.false;
    });

    it("threshold is stored correctly", async () => {
      const c = await deploy2of3();
      expect(await c.threshold()).to.equal(2n);
    });
  });

  // ── Receive Ether ────────────────────────────────────────────────────────
  describe("receive Ether", () => {
    it("accepts Ether and emits Deposit event", async () => {
      const c = await deploy2of3();
      const amount = ethers.parseEther("1");
      await expect(stranger.sendTransaction({ to: await c.getAddress(), value: amount }))
        .to.emit(c, "Deposit")
        .withArgs(stranger.address, amount);
      expect(await c.balance()).to.equal(amount);
    });
  });

  // ── submitTransaction ────────────────────────────────────────────────────
  describe("submitTransaction()", () => {
    it("signer can submit a transaction", async () => {
      const c = await deploy2of3();
      await expect(c.connect(alice).submitTransaction(bob.address, 0, "0x"))
        .to.emit(c, "TransactionSubmitted")
        .withArgs(alice.address, 0, bob.address, 0, "0x");
      expect(await c.transactionCount()).to.equal(1n);
    });

    it("reverts when non-signer submits", async () => {
      const c = await deploy2of3();
      await expect(c.connect(stranger).submitTransaction(bob.address, 0, "0x"))
        .to.be.revertedWith("QuaiForgeMultisig: caller is not a signer");
    });

    it("reverts when destination is zero address", async () => {
      const c = await deploy2of3();
      await expect(c.connect(alice).submitTransaction(ethers.ZeroAddress, 0, "0x"))
        .to.be.revertedWith("QuaiForgeMultisig: destination is zero address");
    });

    it("increments transaction count for each submission", async () => {
      const c = await deploy2of3();
      await c.connect(alice).submitTransaction(bob.address, 0, "0x");
      await c.connect(bob).submitTransaction(carol.address, 0, "0x");
      expect(await c.transactionCount()).to.equal(2n);
    });
  });

  // ── confirmTransaction ───────────────────────────────────────────────────
  describe("confirmTransaction()", () => {
    it("signer can confirm and confirmationCount increments", async () => {
      const c = await deploy2of3();
      await c.connect(alice).submitTransaction(bob.address, 0, "0x");
      await expect(c.connect(alice).confirmTransaction(0))
        .to.emit(c, "TransactionConfirmed")
        .withArgs(alice.address, 0);
      const [,,,, count] = await c.getTransaction(0);
      expect(count).to.equal(1n);
    });

    it("reverts when non-signer confirms", async () => {
      const c = await deploy2of3();
      await c.connect(alice).submitTransaction(bob.address, 0, "0x");
      await expect(c.connect(stranger).confirmTransaction(0))
        .to.be.revertedWith("QuaiForgeMultisig: caller is not a signer");
    });

    it("reverts double-confirm from same signer", async () => {
      const c = await deploy2of3();
      await c.connect(alice).submitTransaction(bob.address, 0, "0x");
      await c.connect(alice).confirmTransaction(0);
      await expect(c.connect(alice).confirmTransaction(0))
        .to.be.revertedWith("QuaiForgeMultisig: tx already confirmed by caller");
    });

    it("reverts confirm on non-existent tx", async () => {
      const c = await deploy2of3();
      await expect(c.connect(alice).confirmTransaction(99))
        .to.be.revertedWith("QuaiForgeMultisig: tx does not exist");
    });
  });

  // ── revokeConfirmation ───────────────────────────────────────────────────
  describe("revokeConfirmation()", () => {
    it("signer can revoke their own confirmation", async () => {
      const c = await deploy2of3();
      await c.connect(alice).submitTransaction(bob.address, 0, "0x");
      await c.connect(alice).confirmTransaction(0);
      await expect(c.connect(alice).revokeConfirmation(0))
        .to.emit(c, "ConfirmationRevoked")
        .withArgs(alice.address, 0);
      const [,,,, count] = await c.getTransaction(0);
      expect(count).to.equal(0n);
    });

    it("reverts revoke when signer has not confirmed", async () => {
      const c = await deploy2of3();
      await c.connect(alice).submitTransaction(bob.address, 0, "0x");
      await expect(c.connect(alice).revokeConfirmation(0))
        .to.be.revertedWith("QuaiForgeMultisig: caller has not confirmed this tx");
    });
  });

  // ── executeTransaction ───────────────────────────────────────────────────
  describe("executeTransaction()", () => {
    it("reverts when below threshold", async () => {
      const c = await deploy2of3();
      await c.connect(alice).submitTransaction(bob.address, 0, "0x");
      await c.connect(alice).confirmTransaction(0);
      // only 1 of 2 required — should fail
      await expect(c.connect(alice).executeTransaction(0))
        .to.be.revertedWith("QuaiForgeMultisig: not enough confirmations");
    });

    it("reverts when non-signer tries to execute", async () => {
      const c = await deploy2of3();
      await c.connect(alice).submitTransaction(bob.address, 0, "0x");
      await c.connect(alice).confirmTransaction(0);
      await c.connect(bob).confirmTransaction(0);
      await expect(c.connect(stranger).executeTransaction(0))
        .to.be.revertedWith("QuaiForgeMultisig: caller is not a signer");
    });

    it("reverts double execution", async () => {
      const c = await deploy2of3();
      // Fund the wallet
      await stranger.sendTransaction({ to: await c.getAddress(), value: ethers.parseEther("1") });
      await c.connect(alice).submitTransaction(carol.address, 0, "0x");
      await c.connect(alice).confirmTransaction(0);
      await c.connect(bob).confirmTransaction(0);
      await c.connect(alice).executeTransaction(0);
      await expect(c.connect(alice).executeTransaction(0))
        .to.be.revertedWith("QuaiForgeMultisig: tx already executed");
    });

    it("reverts when wallet has insufficient balance for value transfer", async () => {
      const c = await deploy2of3();
      const amount = ethers.parseEther("5");
      await c.connect(alice).submitTransaction(carol.address, amount, "0x");
      await c.connect(alice).confirmTransaction(0);
      await c.connect(bob).confirmTransaction(0);
      await expect(c.connect(alice).executeTransaction(0))
        .to.be.revertedWith("QuaiForgeMultisig: insufficient balance");
    });
  });

  // ── Full end-to-end: 2-of-3 flow ─────────────────────────────────────────
  describe("end-to-end: 2-of-3 ETH transfer", () => {
    it("executes a value transfer after 2 confirmations", async () => {
      const c = await deploy2of3();
      const fund = ethers.parseEther("2");
      const send = ethers.parseEther("1");

      // Fund the multisig
      await stranger.sendTransaction({ to: await c.getAddress(), value: fund });
      expect(await c.balance()).to.equal(fund);

      // Alice submits a tx to send 1 QUAI to carol
      await c.connect(alice).submitTransaction(carol.address, send, "0x");

      // Alice confirms
      await c.connect(alice).confirmTransaction(0);
      // 1 confirmation — cannot execute yet
      await expect(c.connect(alice).executeTransaction(0))
        .to.be.revertedWith("QuaiForgeMultisig: not enough confirmations");

      // Bob confirms
      await c.connect(bob).confirmTransaction(0);

      // Now threshold (2) is met — execute
      const carolBefore = await ethers.provider.getBalance(carol.address);
      await expect(c.connect(alice).executeTransaction(0))
        .to.emit(c, "TransactionExecuted")
        .withArgs(alice.address, 0);
      const carolAfter = await ethers.provider.getBalance(carol.address);

      expect(carolAfter - carolBefore).to.equal(send);
      expect(await c.balance()).to.equal(fund - send);

      const [,,, executed,] = await c.getTransaction(0);
      expect(executed).to.be.true;
    });

    it("revoke + re-confirm changes effective confirmation count", async () => {
      const c = await deploy2of3();
      await c.connect(alice).submitTransaction(carol.address, 0, "0x");
      await c.connect(alice).confirmTransaction(0);
      await c.connect(bob).confirmTransaction(0);

      // Bob revokes
      await c.connect(bob).revokeConfirmation(0);
      let [,,,, count] = await c.getTransaction(0);
      expect(count).to.equal(1n);

      // Cannot execute with only 1 confirmation
      await expect(c.connect(alice).executeTransaction(0))
        .to.be.revertedWith("QuaiForgeMultisig: not enough confirmations");

      // Carol re-confirms instead
      await c.connect(carol).confirmTransaction(0);
      [,,,, count] = await c.getTransaction(0);
      expect(count).to.equal(2n);

      // Now executable
      await expect(c.connect(alice).executeTransaction(0))
        .to.emit(c, "TransactionExecuted");
    });
  });

  // ── deploymentSummary() read-back (§6.3) ─────────────────────────────────
  describe("deploymentSummary()", () => {
    it("returns correct values in a single call", async () => {
      const c = await deploy2of3();
      const [rSigners, rThreshold, rTxCount, rBalance, rVersion] =
        await c.deploymentSummary();

      expect(rSigners.length).to.equal(3);
      expect(rThreshold).to.equal(2n);
      expect(rTxCount).to.equal(0n);
      expect(rBalance).to.equal(0n);
      expect(rVersion).to.equal("multisig-v1");
    });
  });
});
