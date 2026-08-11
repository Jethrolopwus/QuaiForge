// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

// ----------------------------------------------------------------------------
// QuaiForge — PaymentRegistry (pay-with-blip-v1)
//
// Architecture: §3 of the "Pay with Blip" Merchant Checkout Widget design doc.
//
// Purpose:
//   Lightweight on-chain record of every Blip payment request and its
//   confirmation.  The contract does NOT custody funds — payment flows
//   directly wallet-to-wallet via quai_sendTransaction.  The registry
//   exists to provide:
//     • An independent, Quaiscan-verifiable source of invoice state
//     • Event emission the frontend can subscribe to (no pure polling)
//     • A judge-inspectable on-chain trail for the hackathon demo
//
// Constraints (§3.2):
//   • Solidity 0.8.20 — Orchard testnet rejects newer pragma versions
//   • No CREATE2 — standard CREATE so quais.js grinds the shard prefix
//   • No external library dependencies — zero-dependency, self-contained
//   • Non-custodial — does not hold or transfer QUAI
//
// Security note (§3.3 design notes):
//   confirmPayment() is intentionally open-access for the hackathon scope —
//   the caller is trusted to have independently verified payment via Blip's
//   /fund/status API or on-chain tx matching.  A production version would
//   add signature verification or an oracle/relayer pattern.  This is a
//   flagged next step, not a hidden limitation.
//
// Compiler settings for Quaiscan verification:
//   version:    0.8.20
//   evmVersion: paris
//   optimizer:  enabled, 200 runs
// ----------------------------------------------------------------------------

contract PaymentRegistry {

    // -----------------------------------------------------------------------
    // Types
    // -----------------------------------------------------------------------

    /// @dev Mirrors the lifecycle of a Blip payment request.
    enum Status { Pending, Confirmed, Cancelled }

    struct Invoice {
        address merchant;       // merchant wallet that should receive payment
        address payer;          // set once payment is confirmed
        uint256 amount;         // expected payment amount in wei
        string  orderRef;       // merchant-defined order / reference ID
        Status  status;
        uint256 createdAt;
        uint256 confirmedAt;    // 0 until confirmed
    }

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    /// @notice Template identifier — used by export-artifacts.js and frontend
    string public constant TEMPLATE_VERSION = "pay-with-blip-v1";

    /// @notice Auto-incrementing invoice counter; also serves as the next ID
    uint256 public nextInvoiceId;

    /// @notice invoiceId → Invoice
    mapping(uint256 => Invoice) public invoices;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    /// @dev Emitted when a new invoice is created.
    event InvoiceCreated(
        uint256 indexed invoiceId,
        address indexed merchant,
        uint256 amount,
        string  orderRef
    );

    /// @dev Emitted when a pending invoice is confirmed.
    event PaymentConfirmed(
        uint256 indexed invoiceId,
        address indexed payer,
        uint256 amount
    );

    /// @dev Emitted when a pending invoice is cancelled.
    event InvoiceCancelled(
        uint256 indexed invoiceId
    );

    // -----------------------------------------------------------------------
    // Core functions
    // -----------------------------------------------------------------------

    /**
     * @notice Merchant or frontend creates an invoice before handing the
     *         customer off to Blip.
     *
     * @param merchant  Address of the merchant wallet (must receive payment)
     * @param amount    Expected payment amount in wei (must be > 0)
     * @param orderRef  Merchant-defined order / reference string (non-empty)
     * @return invoiceId  Newly assigned invoice ID
     */
    function createInvoice(
        address merchant,
        uint256 amount,
        string calldata orderRef
    ) external returns (uint256 invoiceId) {
        require(merchant != address(0), "PaymentRegistry: merchant is zero address");
        require(amount > 0,             "PaymentRegistry: amount must be > 0");
        require(bytes(orderRef).length > 0, "PaymentRegistry: orderRef is empty");

        invoiceId = nextInvoiceId++;

        invoices[invoiceId] = Invoice({
            merchant:    merchant,
            payer:       address(0),
            amount:      amount,
            orderRef:    orderRef,
            status:      Status.Pending,
            createdAt:   block.timestamp,
            confirmedAt: 0
        });

        emit InvoiceCreated(invoiceId, merchant, amount, orderRef);
    }

    /**
     * @notice Called by the frontend after it independently verifies the
     *         on-chain payment (via Blip's /fund/status or by matching a
     *         transaction to the merchant address).
     *
     * @dev    Access is intentionally open for hackathon scope.
     *         A production version should gate this with a signature from
     *         the merchant or a trusted relayer.
     *
     * @param invoiceId  ID of the invoice to confirm
     * @param payer      Address of the wallet that sent the payment
     */
    function confirmPayment(uint256 invoiceId, address payer) external {
        require(payer != address(0), "PaymentRegistry: payer is zero address");

        Invoice storage inv = invoices[invoiceId];

        require(inv.createdAt > 0,             "PaymentRegistry: invoice does not exist");
        require(inv.status == Status.Pending,  "PaymentRegistry: invoice not pending");

        inv.payer       = payer;
        inv.status      = Status.Confirmed;
        inv.confirmedAt = block.timestamp;

        emit PaymentConfirmed(invoiceId, payer, inv.amount);
    }

    /**
     * @notice Cancel a pending invoice.
     *         Any caller may cancel for hackathon scope; restrict in production.
     *
     * @param invoiceId  ID of the invoice to cancel
     */
    function cancelInvoice(uint256 invoiceId) external {
        Invoice storage inv = invoices[invoiceId];

        require(inv.createdAt > 0,            "PaymentRegistry: invoice does not exist");
        require(inv.status == Status.Pending, "PaymentRegistry: invoice not pending");

        inv.status = Status.Cancelled;

        emit InvoiceCancelled(invoiceId);
    }

    // -----------------------------------------------------------------------
    // View helpers
    // -----------------------------------------------------------------------

    /**
     * @notice Returns the full Invoice struct for a given ID.
     * @param invoiceId  ID to look up
     */
    function getInvoice(uint256 invoiceId) external view returns (Invoice memory) {
        require(invoices[invoiceId].createdAt > 0, "PaymentRegistry: invoice does not exist");
        return invoices[invoiceId];
    }

    /**
     * @notice Convenience status check.
     * @param invoiceId  ID to look up
     * @return Current Status enum value (0=Pending, 1=Confirmed, 2=Cancelled)
     */
    function getStatus(uint256 invoiceId) external view returns (Status) {
        require(invoices[invoiceId].createdAt > 0, "PaymentRegistry: invoice does not exist");
        return invoices[invoiceId].status;
    }

    /**
     * @notice One-call deployment read-back for the deploy script and frontend.
     * @return nextId_          Current value of nextInvoiceId
     * @return templateVersion_ TEMPLATE_VERSION constant
     */
    function deploymentSummary()
        external
        view
        returns (
            uint256 nextId_,
            string  memory templateVersion_
        )
    {
        return (nextInvoiceId, TEMPLATE_VERSION);
    }
}
