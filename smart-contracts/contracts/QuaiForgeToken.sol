// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

// ----------------------------------------------------------------------------
// QuaiForge Template A — ERC-20 Token (v1)
//
// Design principles (from §5.1 of the architectural design):
//   • Fixed, audited template — no arbitrary user logic
//   • Standard CREATE deployment via Hardhat ContractFactory
//   • Immutable per deployment — no proxy, no upgradeability
//   • OpenZeppelin 4.9.x base contracts (ERC20 + Ownable)
//   • Solidity pinned to 0.8.20 — hard ceiling on Quai
//
// Constructor parameters (from §5.2 Template A):
//   name          — token display name (e.g. "CommunityCoin")
//   symbol        — ticker symbol, ≤ 11 chars (enforced on frontend, guarded here)
//   initialSupply — total tokens minted to owner at deployment, in whole tokens
//                   (contract stores as wei: initialSupply * 10^decimals)
//   owner_        — address that receives the minted supply and owns the contract;
//                   defaults to msg.sender on the frontend, but is explicit here
//                   so the contract constructor is fully transparent to read-back
//
// Fixed v1 behaviour (§5.2):
//   • No post-deploy minting function — supply is fixed at deployment time
//   • No burn, no pause, no blacklist — simplest auditable footprint
//   • Owner can call renounceOwnership() / transferOwnership() (OZ Ownable)
//
// Post-hackathon extensions (explicitly deferred, §10):
//   • Mintable / burnable / pausable variants
//   • Vesting schedule integration
// ----------------------------------------------------------------------------

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract QuaiForgeToken is ERC20, Ownable {
    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    /// @notice Solidity version the contract was compiled with.
    /// Stored on-chain so the frontend read-back check (§6.3) can confirm
    /// the deployed artifact matches the expected template version.
    string public constant TEMPLATE_VERSION = "token-v1";

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    /**
     * @param name_          Token name (non-empty, validated on frontend)
     * @param symbol_        Token symbol (non-empty, ≤ 11 chars, validated on frontend)
     * @param initialSupply_ Whole-token amount to mint.  Stored as wei internally.
     *                       e.g. pass 1_000_000 to mint 1,000,000 tokens.
     *                       Must be > 0 (validated on frontend §5.3).
     * @param owner_         Address that receives minted supply and contract ownership.
     *                       Passing address(0) is rejected to prevent accidental loss.
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 initialSupply_,
        address owner_
    ) ERC20(name_, symbol_) Ownable() {
        require(bytes(name_).length > 0,   "QuaiForgeToken: name is empty");
        require(bytes(symbol_).length > 0, "QuaiForgeToken: symbol is empty");
        require(bytes(symbol_).length <= 11, "QuaiForgeToken: symbol exceeds 11 chars");
        require(initialSupply_ > 0,        "QuaiForgeToken: supply must be > 0");
        require(owner_ != address(0),      "QuaiForgeToken: owner is zero address");

        // Transfer Ownable ownership to the specified owner
        _transferOwnership(owner_);

        // Mint entire supply to the owner.
        // Multiplied by 10^decimals() (which is 18, the ERC20 default) so the
        // user-facing "whole token" amount matches what was shown in the Review step.
        _mint(owner_, initialSupply_ * (10 ** decimals()));
    }

    // -----------------------------------------------------------------------
    // Read-back helpers (§6.3)
    // Used by the frontend to confirm the deployment matched the review summary.
    // ERC20 already exposes name(), symbol(), totalSupply() — these are here for
    // clarity and are used in the test suite and deployment script verification.
    // -----------------------------------------------------------------------

    /**
     * @notice Returns a summary tuple that the frontend post-deploy read-back
     * (§6.3) calls in a single eth_call to confirm everything matches.
     */
    function deploymentSummary()
        external
        view
        returns (
            string memory name_,
            string memory symbol_,
            uint256 totalSupply_,
            address owner_,
            string memory templateVersion_,
            uint8 decimals_
        )
    {
        return (
            name(),
            symbol(),
            totalSupply(),
            owner(),
            TEMPLATE_VERSION,
            decimals()
        );
    }
}
