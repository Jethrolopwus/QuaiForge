// QuaiForge — Test Suite: QuaiForgeEscrow (escrow-v1)
// Run: npx hardhat test test/QuaiForgeEscrow.test.js --network localhost
//
// Uses built-in Hardhat JSON-RPC time helpers (evm_increaseTime + evm_mine)
// — no @nomicfoundation/hardhat-network-helpers dependency required.
//
// Coverage:
//   ✓ Constructor validation (all rejection cases)
//   ✓ ARBITER_RELEASE mode: deploy, deposit, release, refund
//   ✓ TIMELOCK mode: deploy, deposit, release after expiry, reject early release
//   ✓ State machine transitions: AWAITING_DEPOSIT → FUNDED → RELEASED / REFUNDED
//   ✓ Double-deposit, double-release rejection
//   ✓ Reject plain Ether (receive / fallback)
//   ✓ Read-back helpers: balance(), timeRemaining(), deploymentSummary()

const { expect } = require("chai");
const { ethers }  = require("hardhat");

// Release mode enum mirrors the contract — BigInt to match ethers v6 return values
const Mode  = { ARBITER_RELEASE: 0n, TIMELOCK: 1n };
// State enum mirrors the contract — BigInt to match ethers v6 return values
const St    = { AWAITING_DEPOSIT: 0n, FUNDED: 1n, RELEASED: 2n, REFUNDED: 3n };

const ONE_QUAI = ethers.parseEther("1");

// Advance EVM time by `seconds` and mine a block
async function increaseTime(seconds) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

describe("QuaiForgeEscrow", function () {
  let payer, payee, arbiter, stranger;

  beforeEach(async () => {
    [, payer, payee, arbiter, stranger] = await ethers.getSigners();
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  async function deployArbiter() {
    const F = await ethers.getContractFactory("QuaiForgeEscrow");
    const c = await F.deploy(
      payer.address, payee.address, arbiter.address,
      Mode.ARBITER_RELEASE, 0
    );
    await c.waitForDeployment();
    return c;
  }

  async function deployTimelock(duration = 600) {
    const F = await ethers.getContractFactory("QuaiForgeEscrow");
    const c = await F.deploy(
      payer.address, payee.address, ethers.ZeroAddress,
      Mode.TIMELOCK, duration
    );
    await c.waitForDeployment();
    return c;
  }

  // ── Constructor validation ────────────────────────────────────────────────
  describe("constructor — parameter validation", () => {
    it("reverts when payer is zero address", async () => {
      const F = await ethers.getContractFactory("QuaiForgeEscrow");
      await expect(
        F.deploy(ethers.ZeroAddress, payee.address, arbiter.address, Mode.ARBITER_RELEASE, 0)
      ).to.be.revertedWith("QuaiForgeEscrow: payer is zero address");
    });

    it("reverts when payee is zero address", async () => {
      const F = await ethers.getContractFactory("QuaiForgeEscrow");
      await expect(
        F.deploy(payer.address, ethers.ZeroAddress, arbiter.address, Mode.ARBITER_RELEASE, 0)
      ).to.be.revertedWith("QuaiForgeEscrow: payee is zero address");
    });

    it("reverts when payer equals payee", async () => {
      const F = await ethers.getContractFactory("QuaiForgeEscrow");
      await expect(
        F.deploy(payer.address, payer.address, arbiter.address, Mode.ARBITER_RELEASE, 0)
      ).to.be.revertedWith("QuaiForgeEscrow: payer and payee are the same");
    });

    it("reverts with invalid release mode", async () => {
      const F = await ethers.getContractFactory("QuaiForgeEscrow");
      await expect(
        F.deploy(payer.address, payee.address, arbiter.address, 2, 0)
      ).to.be.revertedWith("QuaiForgeEscrow: invalid release mode");
    });

    it("reverts ARBITER_RELEASE without an arbiter", async () => {
      const F = await ethers.getContractFactory("QuaiForgeEscrow");
      await expect(
        F.deploy(payer.address, payee.address, ethers.ZeroAddress, Mode.ARBITER_RELEASE, 0)
      ).to.be.revertedWith("QuaiForgeEscrow: arbiter required for ARBITER_RELEASE mode");
    });

    it("reverts ARBITER_RELEASE with non-zero timelockDuration", async () => {
      const F = await ethers.getContractFactory("QuaiForgeEscrow");
      await expect(
        F.deploy(payer.address, payee.address, arbiter.address, Mode.ARBITER_RELEASE, 100)
      ).to.be.revertedWith("QuaiForgeEscrow: timelockDuration must be 0 for ARBITER_RELEASE mode");
    });

    it("reverts ARBITER_RELEASE when arbiter is payer or payee", async () => {
      const F = await ethers.getContractFactory("QuaiForgeEscrow");
      await expect(
        F.deploy(payer.address, payee.address, payer.address, Mode.ARBITER_RELEASE, 0)
      ).to.be.revertedWith("QuaiForgeEscrow: arbiter must be a neutral third party");
    });

    it("reverts TIMELOCK when timelockDuration is zero", async () => {
      const F = await ethers.getContractFactory("QuaiForgeEscrow");
      await expect(
        F.deploy(payer.address, payee.address, ethers.ZeroAddress, Mode.TIMELOCK, 0)
      ).to.be.revertedWith("QuaiForgeEscrow: timelockDuration must be > 0 for TIMELOCK mode");
    });

    it("deploys in ARBITER_RELEASE mode", async () => {
      const c = await deployArbiter();
      expect(await c.releaseMode()).to.equal(Mode.ARBITER_RELEASE);
      expect(await c.timelockDeadline()).to.equal(0n);
      expect(await c.getAddress()).to.be.properAddress;
    });

    it("deploys in TIMELOCK mode", async () => {
      const c = await deployTimelock(3600);
      expect(await c.releaseMode()).to.equal(Mode.TIMELOCK);
      expect(await c.timelockDeadline()).to.be.gt(0n);
    });
  });

  // ── ARBITER_RELEASE mode ──────────────────────────────────────────────────
  describe("ARBITER_RELEASE mode", () => {
    let escrow;
    beforeEach(async () => { escrow = await deployArbiter(); });

    it("starts in AWAITING_DEPOSIT state", async () => {
      expect(await escrow.state()).to.equal(St.AWAITING_DEPOSIT);
    });

    it("payer deposits and state moves to FUNDED", async () => {
      await expect(escrow.connect(payer).deposit({ value: ONE_QUAI }))
        .to.emit(escrow, "Deposited").withArgs(payer.address, ONE_QUAI);
      expect(await escrow.state()).to.equal(St.FUNDED);
      expect(await escrow.depositedAmount()).to.equal(ONE_QUAI);
    });

    it("reverts deposit from non-payer", async () => {
      await expect(escrow.connect(stranger).deposit({ value: ONE_QUAI }))
        .to.be.revertedWith("QuaiForgeEscrow: caller is not payer");
    });

    it("reverts zero-value deposit", async () => {
      await expect(escrow.connect(payer).deposit({ value: 0 }))
        .to.be.revertedWith("QuaiForgeEscrow: deposit amount must be > 0");
    });

    it("reverts double deposit", async () => {
      await escrow.connect(payer).deposit({ value: ONE_QUAI });
      await expect(escrow.connect(payer).deposit({ value: ONE_QUAI }))
        .to.be.revertedWith("QuaiForgeEscrow: invalid state for this action");
    });

    it("arbiter releases funds to payee", async () => {
      await escrow.connect(payer).deposit({ value: ONE_QUAI });
      const before = await ethers.provider.getBalance(payee.address);
      await expect(escrow.connect(arbiter).release())
        .to.emit(escrow, "Released").withArgs(payee.address, ONE_QUAI);
      expect(await ethers.provider.getBalance(payee.address) - before).to.equal(ONE_QUAI);
      expect(await escrow.state()).to.equal(St.RELEASED);
    });

    it("reverts release from non-arbiter", async () => {
      await escrow.connect(payer).deposit({ value: ONE_QUAI });
      await expect(escrow.connect(stranger).release())
        .to.be.revertedWith("QuaiForgeEscrow: only arbiter can release in ARBITER_RELEASE mode");
    });

    it("arbiter refunds funds to payer", async () => {
      await escrow.connect(payer).deposit({ value: ONE_QUAI });
      const before = await ethers.provider.getBalance(payer.address);
      await expect(escrow.connect(arbiter).refund())
        .to.emit(escrow, "Refunded").withArgs(payer.address, ONE_QUAI);
      expect(await ethers.provider.getBalance(payer.address) - before).to.equal(ONE_QUAI);
      expect(await escrow.state()).to.equal(St.REFUNDED);
    });

    it("reverts refund from non-arbiter", async () => {
      await escrow.connect(payer).deposit({ value: ONE_QUAI });
      await expect(escrow.connect(stranger).refund())
        .to.be.revertedWith("QuaiForgeEscrow: caller is not arbiter");
    });

    it("reverts release/refund before deposit", async () => {
      await expect(escrow.connect(arbiter).release())
        .to.be.revertedWith("QuaiForgeEscrow: invalid state for this action");
      await expect(escrow.connect(arbiter).refund())
        .to.be.revertedWith("QuaiForgeEscrow: invalid state for this action");
    });

    it("reverts double release", async () => {
      await escrow.connect(payer).deposit({ value: ONE_QUAI });
      await escrow.connect(arbiter).release();
      await expect(escrow.connect(arbiter).release())
        .to.be.revertedWith("QuaiForgeEscrow: invalid state for this action");
    });
  });

  // ── TIMELOCK mode ─────────────────────────────────────────────────────────
  describe("TIMELOCK mode", () => {
    const DURATION = 600;
    let escrow;
    beforeEach(async () => { escrow = await deployTimelock(DURATION); });

    it("starts in AWAITING_DEPOSIT state", async () => {
      expect(await escrow.state()).to.equal(St.AWAITING_DEPOSIT);
    });

    it("timelockDeadline is in the future", async () => {
      const block = await ethers.provider.getBlock("latest");
      expect(Number(await escrow.timelockDeadline())).to.be.gt(block.timestamp);
    });

    it("timeRemaining() is > 0 before deadline", async () => {
      expect(await escrow.timeRemaining()).to.be.gt(0n);
    });

    it("timeRemaining() returns 0 after deadline", async () => {
      await increaseTime(DURATION + 10);
      expect(await escrow.timeRemaining()).to.equal(0n);
    });

    it("ARBITER_RELEASE mode timeRemaining() always returns 0", async () => {
      const c = await deployArbiter();
      expect(await c.timeRemaining()).to.equal(0n);
    });

    it("payer can deposit", async () => {
      await expect(escrow.connect(payer).deposit({ value: ONE_QUAI }))
        .to.emit(escrow, "Deposited");
      expect(await escrow.state()).to.equal(St.FUNDED);
    });

    it("reverts release before timelock expires", async () => {
      await escrow.connect(payer).deposit({ value: ONE_QUAI });
      await expect(escrow.connect(stranger).release())
        .to.be.revertedWith("QuaiForgeEscrow: timelock has not expired");
    });

    it("anyone can release to payee after timelock expires", async () => {
      await escrow.connect(payer).deposit({ value: ONE_QUAI });
      await increaseTime(DURATION + 1);
      await expect(escrow.connect(stranger).release())
        .to.emit(escrow, "Released").withArgs(payee.address, ONE_QUAI);
      expect(await escrow.state()).to.equal(St.RELEASED);
    });

    it("refund() is not callable in TIMELOCK mode (no arbiter)", async () => {
      await escrow.connect(payer).deposit({ value: ONE_QUAI });
      await expect(escrow.connect(stranger).refund())
        .to.be.revertedWith("QuaiForgeEscrow: caller is not arbiter");
    });
  });

  // ── Reject plain Ether ────────────────────────────────────────────────────
  describe("receive / fallback rejection", () => {
    it("reverts direct Ether transfer", async () => {
      const c = await deployArbiter();
      await expect(
        stranger.sendTransaction({ to: await c.getAddress(), value: ONE_QUAI })
      ).to.be.revertedWith("QuaiForgeEscrow: use deposit() to fund this escrow");
    });
  });

  // ── Read-back helpers ─────────────────────────────────────────────────────
  describe("balance() and deploymentSummary()", () => {
    it("balance() reflects deposited amount", async () => {
      const c = await deployArbiter();
      expect(await c.balance()).to.equal(0n);
      await c.connect(payer).deposit({ value: ONE_QUAI });
      expect(await c.balance()).to.equal(ONE_QUAI);
    });

    it("deploymentSummary() correct for ARBITER_RELEASE", async () => {
      const c = await deployArbiter();
      const [rPayer, rPayee, rArbiter, rMode, rDeadline, rState, rVer] =
        await c.deploymentSummary();
      expect(rPayer).to.equal(payer.address);
      expect(rPayee).to.equal(payee.address);
      expect(rArbiter).to.equal(arbiter.address);
      expect(rMode).to.equal(Mode.ARBITER_RELEASE);
      expect(rDeadline).to.equal(0n);
      expect(rState).to.equal(St.AWAITING_DEPOSIT);
      expect(rVer).to.equal("escrow-v1");
    });

    it("deploymentSummary() correct for TIMELOCK", async () => {
      const c = await deployTimelock(3600);
      const [rPayer, rPayee, rArbiter, rMode, rDeadline, rState, rVer] =
        await c.deploymentSummary();
      expect(rPayer).to.equal(payer.address);
      expect(rPayee).to.equal(payee.address);
      expect(rArbiter).to.equal(ethers.ZeroAddress);
      expect(rMode).to.equal(Mode.TIMELOCK);
      expect(Number(rDeadline)).to.be.gt(0);
      expect(rState).to.equal(St.AWAITING_DEPOSIT);
      expect(rVer).to.equal("escrow-v1");
    });
  });
});
