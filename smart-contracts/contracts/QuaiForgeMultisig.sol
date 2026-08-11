// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

// ----------------------------------------------------------------------------
// QuaiForge Template C — Minimal Multisig Wallet (v1)
//
// Design principles (from §5.1 of the architectural design):
//   • Custom lightweight implementation — NOT a full Gnosis Safe deployment.
//     Kept minimal to reduce gas and complexity within the hackathon scope.
//   • Standard CREATE deployment via ContractFactory
//   • Immutable signer set and threshold per deployment
//   • Self-contained — no external library dependencies
//   • Solidity pinned to 0.8.20
//
// Constructor parameters (from §5.2 Template C):
//   signers_   — array of signer addresses (≥ 2, no duplicates, no zero addresses)
//   threshold_ — number of confirmations required to execute (≥ 1, ≤ signers.length)
//
// Frontend parameter validation (§5.3):
//   All rules below are also enforced on-chain as an additional safety layer:
//   • signers.length ≥ 2
//   • threshold ≥ 1
//   • threshold ≤ signers.length
//   • no duplicate addresses in signers
//   • no zero addresses in signers
//
// Core propose / confirm / execute pattern (§5.2 Template C):
//   submitTransaction(to, value, data)  — any signer proposes
//   confirmTransaction(txIndex)         — any signer confirms
//   revokeConfirmation(txIndex)         — a signer cancels their own confirmation
//   executeTransaction(txIndex)         — any signer executes once threshold met
//   getTransaction(txIndex)             — view a pending/executed transaction
// ----------------------------------------------------------------------------

contract QuaiForgeMultisig {
    // -----------------------------------------------------------------------
    // Types
    // -----------------------------------------------------------------------

    struct Transaction {
        address to;
        uint256 value;
        bytes   data;
        bool    executed;
        uint256 confirmationCount;
    }

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    /// @notice Template identifier for frontend read-back (§6.3)
    string public constant TEMPLATE_VERSION = "multisig-v1";

    address[] public signers;
    uint256   public immutable threshold;

    // txIndex → signer address → has confirmed?
    mapping(uint256 => mapping(address => bool)) public isConfirmed;

    // address → is a signer?
    mapping(address => bool) public isSigner;

    Transaction[] public transactions;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    event Deposit(address indexed sender, uint256 amount);
    event TransactionSubmitted(
        address indexed submitter,
        uint256 indexed txIndex,
        address indexed to,
        uint256 value,
        bytes data
    );
    event TransactionConfirmed(address indexed signer, uint256 indexed txIndex);
    event ConfirmationRevoked(address indexed signer, uint256 indexed txIndex);
    event TransactionExecuted(address indexed executor, uint256 indexed txIndex);

    // -----------------------------------------------------------------------
    // Modifiers
    // -----------------------------------------------------------------------

    modifier onlySigner() {
        require(isSigner[msg.sender], "QuaiForgeMultisig: caller is not a signer");
        _;
    }

    modifier txExists(uint256 txIndex) {
        require(txIndex < transactions.length, "QuaiForgeMultisig: tx does not exist");
        _;
    }

    modifier notExecuted(uint256 txIndex) {
        require(!transactions[txIndex].executed, "QuaiForgeMultisig: tx already executed");
        _;
    }

    modifier notConfirmed(uint256 txIndex) {
        require(
            !isConfirmed[txIndex][msg.sender],
            "QuaiForgeMultisig: tx already confirmed by caller"
        );
        _;
    }

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    /**
     * @param signers_   Ordered list of signer addresses.
     *                   Frontend validates: length ≥ 2, no duplicates, no zero addr.
     *                   On-chain checks repeat all rules for defence-in-depth.
     * @param threshold_ How many confirmations are needed to execute.
     *                   Frontend validates: 1 ≤ threshold ≤ signers.length.
     */
    constructor(address[] memory signers_, uint256 threshold_) {
        require(signers_.length >= 2,               "QuaiForgeMultisig: need at least 2 signers");
        require(threshold_ >= 1,                    "QuaiForgeMultisig: threshold must be >= 1");
        require(threshold_ <= signers_.length,      "QuaiForgeMultisig: threshold exceeds signer count");

        for (uint256 i = 0; i < signers_.length; i++) {
            address signer = signers_[i];
            require(signer != address(0),           "QuaiForgeMultisig: zero address signer");
            require(!isSigner[signer],              "QuaiForgeMultisig: duplicate signer address");

            isSigner[signer] = true;
            signers.push(signer);
        }

        threshold = threshold_;
    }

    // -----------------------------------------------------------------------
    // Receive Ether
    // -----------------------------------------------------------------------

    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    // -----------------------------------------------------------------------
    // Core functions — propose / confirm / revoke / execute
    // -----------------------------------------------------------------------

    /**
     * @notice Any signer can propose a new transaction.
     * @param to    Destination address (contract or EOA)
     * @param value QUAI amount in wei
     * @param data  ABI-encoded calldata (empty bytes for plain transfers)
     * @return txIndex  Index of the newly created transaction
     */
    function submitTransaction(
        address to,
        uint256 value,
        bytes calldata data
    )
        external
        onlySigner
        returns (uint256 txIndex)
    {
        require(to != address(0), "QuaiForgeMultisig: destination is zero address");

        txIndex = transactions.length;

        transactions.push(Transaction({
            to:                to,
            value:             value,
            data:              data,
            executed:          false,
            confirmationCount: 0
        }));

        emit TransactionSubmitted(msg.sender, txIndex, to, value, data);
    }

    /**
     * @notice Confirm a pending transaction.
     * Each signer can confirm a given transaction exactly once.
     * @param txIndex Index of the transaction to confirm
     */
    function confirmTransaction(uint256 txIndex)
        external
        onlySigner
        txExists(txIndex)
        notExecuted(txIndex)
        notConfirmed(txIndex)
    {
        isConfirmed[txIndex][msg.sender] = true;
        transactions[txIndex].confirmationCount++;

        emit TransactionConfirmed(msg.sender, txIndex);
    }

    /**
     * @notice Revoke a previously given confirmation.
     * A signer can withdraw their confirmation before execution.
     * @param txIndex Index of the transaction to revoke confirmation for
     */
    function revokeConfirmation(uint256 txIndex)
        external
        onlySigner
        txExists(txIndex)
        notExecuted(txIndex)
    {
        require(
            isConfirmed[txIndex][msg.sender],
            "QuaiForgeMultisig: caller has not confirmed this tx"
        );

        isConfirmed[txIndex][msg.sender] = false;
        transactions[txIndex].confirmationCount--;

        emit ConfirmationRevoked(msg.sender, txIndex);
    }

    /**
     * @notice Execute a transaction once confirmation threshold is met.
     * Any signer can trigger execution.
     * @param txIndex Index of the transaction to execute
     */
    function executeTransaction(uint256 txIndex)
        external
        onlySigner
        txExists(txIndex)
        notExecuted(txIndex)
    {
        Transaction storage txn = transactions[txIndex];

        require(
            txn.confirmationCount >= threshold,
            "QuaiForgeMultisig: not enough confirmations"
        );
        require(
            address(this).balance >= txn.value,
            "QuaiForgeMultisig: insufficient balance"
        );

        txn.executed = true;

        (bool success, ) = txn.to.call{value: txn.value}(txn.data);
        require(success, "QuaiForgeMultisig: execution failed");

        emit TransactionExecuted(msg.sender, txIndex);
    }

    // -----------------------------------------------------------------------
    // View helpers
    // -----------------------------------------------------------------------

    /**
     * @notice Returns the full Transaction struct for a given index.
     */
    function getTransaction(uint256 txIndex)
        external
        view
        txExists(txIndex)
        returns (
            address to,
            uint256 value,
            bytes memory data,
            bool executed,
            uint256 confirmationCount
        )
    {
        Transaction storage txn = transactions[txIndex];
        return (txn.to, txn.value, txn.data, txn.executed, txn.confirmationCount);
    }

    /**
     * @notice Returns the current signer list.
     */
    function getSigners() external view returns (address[] memory) {
        return signers;
    }

    /**
     * @notice Returns the total number of submitted transactions.
     */
    function transactionCount() external view returns (uint256) {
        return transactions.length;
    }

    /**
     * @notice Returns current QUAI balance held in the wallet.
     */
    function balance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice One-call summary for frontend post-deploy read-back (§6.3).
     */
    function deploymentSummary()
        external
        view
        returns (
            address[] memory signers_,
            uint256 threshold_,
            uint256 transactionCount_,
            uint256 balance_,
            string  memory templateVersion_
        )
    {
        return (
            signers,
            threshold,
            transactions.length,
            address(this).balance,
            TEMPLATE_VERSION
        );
    }
}
