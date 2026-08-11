// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

// ----------------------------------------------------------------------------
// QuaiForge Template B — Two-Party Escrow (v1)
//
// Design principles (from §5.1 of the architectural design):
//   • Fixed, conservative parameter set — no partial releases, no milestones
//   • Standard CREATE deployment via ContractFactory
//   • Immutable per deployment
//   • No external library dependencies — self-contained for auditability
//   • Solidity pinned to 0.8.20
//
// Constructor parameters (from §5.2 Template B):
//   payer_            — address that deposits funds
//   payee_            — address that receives funds on release
//   arbiter_          — optional mediator; pass address(0) for timelock-only mode
//   releaseMode_      — 0 = ARBITER_RELEASE, 1 = TIMELOCK
//   timelockDuration_ — seconds until anyone can release funds (timelock mode only)
//
// Open item resolved per architectural design §11.2:
//   refund() authority model:
//     • ARBITER_RELEASE mode: arbiter can call refund() to send funds back to payer
//     • TIMELOCK mode: no refund() — once deposited, funds release to payee after
//       the timelock expires.  This removes ambiguity and makes the timelock path
//       fully predictable.  Payer should only use timelock when they are certain
//       they want the payee to receive funds after time T.
//
// Safety note (§9): this template holds real value.  It is the most conservatively
// scoped template in v1 for exactly that reason.  Any extension (partial releases,
// multi-milestone, disputing) is explicitly deferred to post-hackathon (§10).
// ----------------------------------------------------------------------------

contract QuaiForgeEscrow {
    // -----------------------------------------------------------------------
    // Types
    // -----------------------------------------------------------------------

    enum ReleaseMode { ARBITER_RELEASE, TIMELOCK }
    enum State       { AWAITING_DEPOSIT, FUNDED, RELEASED, REFUNDED }

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    /// @notice Template identifier for frontend read-back (§6.3)
    string public constant TEMPLATE_VERSION = "escrow-v1";

    address public immutable payer;
    address public immutable payee;
    address public immutable arbiter;      // address(0) when no arbiter
    ReleaseMode public immutable releaseMode;
    uint256 public immutable timelockDeadline; // 0 when ARBITER_RELEASE mode

    State public state;
    uint256 public depositedAmount;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    event Deposited(address indexed by, uint256 amount);
    event Released(address indexed to,  uint256 amount);
    event Refunded(address indexed to,  uint256 amount);

    // -----------------------------------------------------------------------
    // Modifiers
    // -----------------------------------------------------------------------

    modifier onlyPayer() {
        require(msg.sender == payer, "QuaiForgeEscrow: caller is not payer");
        _;
    }

    modifier onlyArbiter() {
        require(
            arbiter != address(0) && msg.sender == arbiter,
            "QuaiForgeEscrow: caller is not arbiter"
        );
        _;
    }

    modifier inState(State expected) {
        require(state == expected, "QuaiForgeEscrow: invalid state for this action");
        _;
    }

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    /**
     * @param payer_            Address authorised to deposit
     * @param payee_            Address that receives released funds
     * @param arbiter_          Mediator address (pass address(0) for timelock-only)
     * @param releaseMode_      0 = ARBITER_RELEASE, 1 = TIMELOCK
     * @param timelockDuration_ Seconds after deployment before anyone can release
     *                          (required and must be > 0 when releaseMode_ == TIMELOCK)
     *                          (ignored / must be 0 when releaseMode_ == ARBITER_RELEASE)
     */
    constructor(
        address payer_,
        address payee_,
        address arbiter_,
        uint8   releaseMode_,
        uint256 timelockDuration_
    ) {
        require(payer_  != address(0), "QuaiForgeEscrow: payer is zero address");
        require(payee_  != address(0), "QuaiForgeEscrow: payee is zero address");
        require(payer_  != payee_,     "QuaiForgeEscrow: payer and payee are the same");
        require(releaseMode_ <= 1,     "QuaiForgeEscrow: invalid release mode");

        ReleaseMode mode = ReleaseMode(releaseMode_);

        if (mode == ReleaseMode.ARBITER_RELEASE) {
            require(
                arbiter_ != address(0),
                "QuaiForgeEscrow: arbiter required for ARBITER_RELEASE mode"
            );
            require(
                timelockDuration_ == 0,
                "QuaiForgeEscrow: timelockDuration must be 0 for ARBITER_RELEASE mode"
            );
            require(
                arbiter_ != payer_ && arbiter_ != payee_,
                "QuaiForgeEscrow: arbiter must be a neutral third party"
            );
        } else {
            // TIMELOCK mode
            require(
                timelockDuration_ > 0,
                "QuaiForgeEscrow: timelockDuration must be > 0 for TIMELOCK mode"
            );
            // arbiter_ is ignored in timelock mode — set to zero for clarity
            // (we still allow a non-zero value to be passed but we store zero)
        }

        payer       = payer_;
        payee       = payee_;
        releaseMode = mode;

        // Immutables must each be assigned exactly once and not inside a branch.
        // Compute both values unconditionally, then assign.
        address resolvedArbiter =
            mode == ReleaseMode.ARBITER_RELEASE ? arbiter_ : address(0);
        uint256 resolvedDeadline =
            mode == ReleaseMode.TIMELOCK ? block.timestamp + timelockDuration_ : 0;

        arbiter          = resolvedArbiter;
        timelockDeadline = resolvedDeadline;

        state = State.AWAITING_DEPOSIT;
    }

    // -----------------------------------------------------------------------
    // Core functions
    // -----------------------------------------------------------------------

    /**
     * @notice Deposit QUAI into escrow.
     * Only the payer can deposit, only once (must be AWAITING_DEPOSIT state).
     * The deposited amount is recorded so release/refund can confirm the full
     * amount is transferred.
     */
    function deposit() external payable onlyPayer inState(State.AWAITING_DEPOSIT) {
        require(msg.value > 0, "QuaiForgeEscrow: deposit amount must be > 0");
        depositedAmount = msg.value;
        state = State.FUNDED;
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @notice Release funds to payee.
     *
     * ARBITER_RELEASE mode: only the arbiter can call this.
     * TIMELOCK mode:        anyone can call this after timelockDeadline.
     *
     * State must be FUNDED.
     */
    function release() external inState(State.FUNDED) {
        if (releaseMode == ReleaseMode.ARBITER_RELEASE) {
            require(
                msg.sender == arbiter,
                "QuaiForgeEscrow: only arbiter can release in ARBITER_RELEASE mode"
            );
        } else {
            // TIMELOCK mode
            require(
                block.timestamp >= timelockDeadline,
                "QuaiForgeEscrow: timelock has not expired"
            );
        }

        uint256 amount = depositedAmount;
        state = State.RELEASED;

        // Effects-before-interactions pattern to prevent reentrancy
        (bool success, ) = payee.call{value: amount}("");
        require(success, "QuaiForgeEscrow: transfer to payee failed");

        emit Released(payee, amount);
    }

    /**
     * @notice Refund deposited funds back to payer.
     *
     * Only available in ARBITER_RELEASE mode — the arbiter calls this when they
     * decide the payer's conditions were not met.
     *
     * Not available in TIMELOCK mode — timelock escrows are one-way by design
     * (§11.2 resolution).
     *
     * State must be FUNDED.
     */
    function refund() external onlyArbiter inState(State.FUNDED) {
        require(
            releaseMode == ReleaseMode.ARBITER_RELEASE,
            "QuaiForgeEscrow: refund not available in TIMELOCK mode"
        );

        uint256 amount = depositedAmount;
        state = State.REFUNDED;

        (bool success, ) = payer.call{value: amount}("");
        require(success, "QuaiForgeEscrow: refund to payer failed");

        emit Refunded(payer, amount);
    }

    // -----------------------------------------------------------------------
    // View helpers
    // -----------------------------------------------------------------------

    /**
     * @notice Returns the current QUAI balance held in this escrow.
     */
    function balance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice For TIMELOCK mode: seconds remaining until release is permitted.
     * Returns 0 if timelock has expired or if in ARBITER_RELEASE mode.
     */
    function timeRemaining() external view returns (uint256) {
        if (releaseMode == ReleaseMode.ARBITER_RELEASE) return 0;
        if (block.timestamp >= timelockDeadline) return 0;
        return timelockDeadline - block.timestamp;
    }

    /**
     * @notice One-call summary for frontend post-deploy read-back (§6.3).
     */
    function deploymentSummary()
        external
        view
        returns (
            address payer_,
            address payee_,
            address arbiter_,
            uint8   releaseMode_,
            uint256 timelockDeadline_,
            uint8   state_,
            string  memory templateVersion_
        )
    {
        return (
            payer,
            payee,
            arbiter,
            uint8(releaseMode),
            timelockDeadline,
            uint8(state),
            TEMPLATE_VERSION
        );
    }

    // -----------------------------------------------------------------------
    // Reject plain Ether transfers (only deposit() is accepted)
    // -----------------------------------------------------------------------

    receive() external payable {
        revert("QuaiForgeEscrow: use deposit() to fund this escrow");
    }

    fallback() external payable {
        revert("QuaiForgeEscrow: use deposit() to fund this escrow");
    }
}
