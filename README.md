# QuaiForge — Pay with Blip

**Merchant Checkout Widget · Frontend & Smart Contract**  
QUAI × BLIP Buildathon Jos · 10–20 August 2026

---

## What is this?

QuaiForge is an embeddable "Pay with Blip" checkout widget that any merchant website can drop in. When a customer clicks the button, the widget hands them into Blip's in-app browser, waits for payment confirmation from two independent sources (Blip's `/fund/status` API and an on-chain event), then renders a receipt with a Quaiscan link.

The on-chain layer (`PaymentRegistry.sol`) is deployed on Quai Orchard testnet. It keeps a permanent, judge-inspectable record of every invoice and its confirmation — independent of Blip's off-chain status endpoint.

---

## Repository Layout

```
QuaiForge/
├── smart-contracts/          # Hardhat project — PaymentRegistry.sol
│   ├── contracts/
│   │   └── PaymentRegistry.sol
│   ├── scripts/
│   │   ├── deploy-payment-registry.js
│   │   ├── export-artifacts.js
│   │   └── utils/
│   ├── test/
│   │   └── PaymentRegistry.test.js
│   ├── hardhat.config.js
│   ├── .env.example
│   └── package.json
│
└── frontend/
    └── src/
        └── lib/
            └── artifacts/    # ABI files exported from smart-contracts
                ├── paymentRegistry.json
                └── templateRegistry.json
```

---

## Architecture

Two cooperating layers:

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│   Merchant Website  │     │      Blip App         │     │    Quai Network     │
│  (QuaiForge widget) │◄───►│  (in-app browser +    │◄───►│  (Orchard testnet)  │
│                     │     │  injected provider)   │ tx  │                     │
│                     │     │                       │     │  PaymentRegistry    │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
         │                                                          ▲
         │              reads confirmation directly                 │
         └──────────────────────────────────────────────────────────┘
              quais.js (JsonRpcProvider) + /fund/status polling
```

### Frontend

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js (quai-next-dapp boilerplate) | Pre-wired for Pelagus + Quaiscan APIs |
| Chain library | quais SDK | Official Quai SDK; handles shard-prefix address grinding |
| Wallet | Blip injected provider (`window.quai`) | EIP-1193 compatible |
| Styling | Tailwind / CSS Modules | Fast iteration for hackathon timeline |
| State | React local state + Context | Widget is small in scope |

**Components**

```
/components
  PayWithBlipButton.tsx   → entry point, embeddable in any host page
  CheckoutModal.tsx       → order summary, QR/deep-link, live status
  ReceiptCard.tsx         → final confirmation UI for merchant + customer

/hooks
  useInvoice.ts           → creates invoice, tracks status
  useBlipDeepLink.ts      → builds /browser and /fund/invoice links

/lib
  BlipProviderDetector.ts → getBlip() detection logic
  quaisClient.ts          → JsonRpcProvider/Contract instances (Orchard RPC)
  blipDeepLinks.ts        → URL builders for /browser, /fund/invoice, /fund/status
  paymentRegistry.ts      → contract read/write wrapper (ABI + address)

/pages (or /app)
  /widget-demo            → standalone demo page simulating a merchant storefront
```

### Smart Contract

`PaymentRegistry.sol` is a minimal, non-custodial invoice registry. Payment itself is a direct wallet-to-wallet `quai_sendTransaction`; the contract only records the invoice and its confirmed status.

**Design constraints:**

- Solidity pinned to `0.8.20` — Orchard testnet rejects newer pragma versions
- EVM version locked to `paris` — `PUSH0` (Shanghai) and later opcodes are not supported on Quai
- Standard `CREATE` (no `CREATE2`) — `quais.js` auto-grinds the shard-prefixed contract address at deployment
- Zero external dependencies — no OpenZeppelin, fully self-contained
- Non-custodial — does not hold or transfer QUAI

---

## Smart Contract Reference

### `PaymentRegistry.sol`

**Template:** `pay-with-blip-v1`

#### Invoice lifecycle

```
createInvoice() → Status.Pending
                       │
           ┌───────────┴───────────┐
    confirmPayment()         cancelInvoice()
           │                       │
   Status.Confirmed         Status.Cancelled
```

#### Functions

| Function | Description |
|---|---|
| `createInvoice(merchant, amount, orderRef)` | Creates a new pending invoice. Returns `invoiceId`. |
| `confirmPayment(invoiceId, payer)` | Marks invoice confirmed after off-chain payment is verified. |
| `cancelInvoice(invoiceId)` | Cancels a pending invoice. |
| `getInvoice(invoiceId)` | Returns the full `Invoice` struct. |
| `getStatus(invoiceId)` | Returns current `Status` enum (0=Pending, 1=Confirmed, 2=Cancelled). |
| `deploymentSummary()` | Returns `(nextInvoiceId, TEMPLATE_VERSION)` — used by deploy script and frontend. |

#### Events

| Event | Emitted when |
|---|---|
| `InvoiceCreated(invoiceId, merchant, amount, orderRef)` | New invoice created |
| `PaymentConfirmed(invoiceId, payer, amount)` | Invoice confirmed |
| `InvoiceCancelled(invoiceId)` | Invoice cancelled |

#### Invoice struct

```solidity
struct Invoice {
    address merchant;    // wallet that should receive payment
    address payer;       // set once confirmed
    uint256 amount;      // expected amount in wei
    string  orderRef;    // merchant-defined order/reference ID
    Status  status;
    uint256 createdAt;
    uint256 confirmedAt; // 0 until confirmed
}
```

> **Security note:** `confirmPayment()` is intentionally open-access for the hackathon — the caller is trusted to have independently verified payment via `/fund/status` or on-chain tx matching. A production version would add signature verification or an oracle/relayer pattern. This is a flagged next step, not a hidden limitation.

---

## End-to-End Payment Flow

```
1. Customer clicks "Pay with Blip" on merchant site
       │
2. Frontend calls createInvoice(merchant, amount, orderRef)
   → receives invoiceId from PaymentRegistry
       │
3. Frontend builds Blip deep link
   • If inside Blip already → skip to /fund/invoice
   • If on external browser → /browser?url=... → redirects into Blip,
     then opens /fund/invoice with amount + merchant address
       │
4. Customer approves in Blip
   → quai_sendTransaction broadcasts payment wallet-to-wallet
       │
5. Frontend polls two sources in parallel
   • Blip's /fund/status endpoint
   • PaymentConfirmed event via quais.js provider listener / getLogs
       │
6. Once payment is verified:
   frontend calls confirmPayment(invoiceId, payerAddress)
   → PaymentConfirmed event fires on-chain
       │
7. ReceiptCard renders:
   transaction hash · amount · Quaiscan link
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- A wallet with Orchard testnet QUAI (see [Orchard Faucet](https://orchard.faucet.quai.network))
- Blip app installed (for end-to-end testing)

### Smart Contract Setup

```bash
cd smart-contracts
npm install
```

Copy and fill in the environment file:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `DEPLOYER_PRIVATE_KEY` | Private key of the wallet paying deployment gas |
| `ORCHARD_RPC_URL` | Orchard RPC endpoint (default: `https://orchard.rpc.quai.network/cyprus1`) |
| `MERCHANT_ADDRESS` | Wallet address that should receive payments |
| `CONTRACT_ADDRESS` | Populated after deployment — copy from deploy output |
| `QUAISCAN_API_KEY` | Optional — for automated source verification on Quaiscan |

Fund your deployer wallet from the [Orchard Faucet](https://orchard.faucet.quai.network) before deploying.

### Available Scripts

```bash
# Compile contracts
npm run compile

# Run the full test suite (Hardhat in-process network)
npm test

# Deploy to Orchard testnet
npm run deploy

# Deploy to a local Hardhat node
npm run node          # terminal 1 — starts local node
npm run deploy:local  # terminal 2 — deploys against it

# Clean build artifacts
npm run clean

# Export ABIs to frontend/src/lib/artifacts/
npm run export-artifacts
```

### Deploy to Orchard Testnet

```bash
npm run deploy
```

The deploy script will:
1. Check deployer balance (exits early if zero)
2. Deploy `PaymentRegistry` using standard `CREATE`
3. Run a read-back verification (`deploymentSummary()`)
4. Run a smoke test (`createInvoice` → `getInvoice` round-trip)
5. Write the contract address to `deploy-addresses.json`
6. Print the Quaiscan URL for source verification

After deployment, copy the contract address into `.env`:

```
CONTRACT_ADDRESS=0x...
```

Then export the ABI to the frontend:

```bash
npm run export-artifacts
```

### Post-Deploy: Verify on Quaiscan

Verify your source code at [orchard.quaiscan.io](https://orchard.quaiscan.io) so judges can inspect the contract. Use these compiler settings:

| Setting | Value |
|---|---|
| Compiler | `0.8.20` |
| EVM Version | `paris` |
| Optimizer | Enabled, 200 runs |

---

## Network Details

| Property | Value |
|---|---|
| Network | Orchard Testnet |
| Chain ID | `15000` |
| RPC (HTTP) | `https://orchard.rpc.quai.network/cyprus1` |
| RPC (WSS) | `wss://orchard.rpc.quai.network/cyprus1` |
| Faucet | https://orchard.faucet.quai.network |
| Explorer | https://orchard.quaiscan.io |

> Use the WSS endpoint in the frontend's event listener for near-instant `PaymentConfirmed` delivery instead of polling.

---

## Testing

The test suite covers:

- Deployment — initial state, `TEMPLATE_VERSION`, `deploymentSummary()`
- `createInvoice()` — success path, all input validation, event emission, auto-incrementing IDs, `getInvoice()` read-back
- `confirmPayment()` — success path, event emission, state update, duplicate confirmation rejection, wrong-status rejection, non-existent invoice rejection, zero-address payer rejection
- `cancelInvoice()` — success path, event emission, state update, double-cancel rejection, wrong-status rejection, non-existent invoice rejection
- `getInvoice()` / `getStatus()` — correct returns, reverts on non-existent ID
- `deploymentSummary()` — reflects `nextInvoiceId` changes after creates
- Cross-function ordering — confirm-then-cancel and cancel-then-confirm both fail correctly

```bash
cd smart-contracts
npm test
```

---

## Resilience Notes

**Blip deep link fallback** — if Blip is not installed, `/browser` and `/fund/invoice` links fall back to a Blip web page offering App Store / Google Play install. This is handled by Blip's own documented behavior; no custom fallback UI is required in the widget.

**Per-origin wallet scoping** — Blip scopes app wallet addresses per origin. The same customer visiting two different merchant sites gets two different addresses. The widget must not assume address continuity across sessions or merchants.

**Dual confirmation polling** — the frontend polls both `/fund/status` and the on-chain `PaymentConfirmed` event in parallel. Whichever source responds first triggers the receipt render, giving resilience against either source being slow.

---

## Open Items

| Item | Status |
|---|---|
| Decide whether `PaymentRegistry` ships in the MVP or demo uses `/fund/status`-only path | Open |
| `confirmPayment()` access control — open call vs. merchant-only vs. relayer-gated | Needs decision before demo day |
| Confirm Orchard RPC latency is acceptable for live polling; fall back to WSS if not | To be validated |

---

## Built With

- [Quai Network](https://qu.ai) — EVM-compatible blockchain
- [Blip](https://blip.build) — in-app browser wallet with deep link funding protocol
- [quais SDK](https://github.com/dominant-strategies/quais.js) — Quai chain library
- [Hardhat](https://hardhat.org) — Ethereum development environment
- [Next.js](https://nextjs.org) — React framework (frontend boilerplate)

---

*QuaiForge — QUAI × BLIP Buildathon Jos, 10–20 August 2026*
