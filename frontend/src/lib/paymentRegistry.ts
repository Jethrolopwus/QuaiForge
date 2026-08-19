/**
 * paymentRegistry — README §Frontend /lib
 *
 * Contract read/write wrapper around PaymentRegistry (pay-with-blip-v1).
 * ABI is consumed from src/lib/artifacts/paymentRegistry.json, exported by
 * `npm run export-artifacts` in smart-contracts/ — never edited by hand.
 *
 * Invoice lifecycle (README §Smart Contract Reference):
 *   createInvoice() → Pending → confirmPayment() → Confirmed
 *                             → cancelInvoice()  → Cancelled
 */

import { quais } from "quais";
import artifact from "./artifacts/paymentRegistry.json";
import { getHttpProvider, createWssProvider } from "./quaisClient";
import type { Eip1193Provider } from "./BlipProviderDetector";
const { abi } = artifact;

export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";

export const TEMPLATE_VERSION: string = artifact.templateVersion;

export enum InvoiceStatus {
  Pending = 0,
  Confirmed = 1,
  Cancelled = 2,
}

export interface Invoice {
  merchant: string;
  payer: string;
  amount: bigint;
  orderRef: string;
  status: InvoiceStatus;
  createdAt: bigint;
  confirmedAt: bigint;
}

export function isContractConfigured(): boolean {
  return CONTRACT_ADDRESS.length > 0;
}

/**
 * Validates the contract address and ABI version at startup.
 * Returns a human-readable warning string if something looks wrong, or null
 * if everything is fine. The caller should surface this prominently in the UI.
 *
 * Checks performed:
 *   1. NEXT_PUBLIC_CONTRACT_ADDRESS is set and non-empty
 *   2. Address passes quais.isAddress (basic hex format check)
 *   3. ABI templateVersion matches the expected "pay-with-blip-v1"
 */
export function getContractConfigWarning(): string | null {
  if (!CONTRACT_ADDRESS) {
    return "NEXT_PUBLIC_CONTRACT_ADDRESS is not set — running in demo/simulation mode.";
  }
  if (!quais.isAddress(CONTRACT_ADDRESS)) {
    return `NEXT_PUBLIC_CONTRACT_ADDRESS "${CONTRACT_ADDRESS}" is not a valid address — running in demo/simulation mode.`;
  }
  if (artifact.templateVersion !== "pay-with-blip-v1") {
    return `ABI templateVersion mismatch: expected "pay-with-blip-v1", got "${artifact.templateVersion}". Re-run npm run export-artifacts in smart-contracts/.`;
  }
  return null;
}

/** Read-only contract bound to the shared HTTP provider. */
export function getReadContract(): quais.Contract {
  return new quais.Contract(CONTRACT_ADDRESS, artifact.abi, getHttpProvider());
}

/** Signer-bound contract using the injected (Blip/Pelagus) provider. */
export async function getWriteContract(
  injected: Eip1193Provider
): Promise<quais.Contract> {
  const browserProvider = new quais.BrowserProvider(
    injected as quais.Eip1193Provider
  );
  const signer = await browserProvider.getSigner();
  return new quais.Contract(CONTRACT_ADDRESS, artifact.abi, signer);
}

/**
 * createInvoice(merchant, amount, orderRef) → invoiceId (README flow step 2).
 *
 * Primary: parses the InvoiceCreated event from the receipt logs.
 * Fallback: if the event is missing (e.g. log delivery lag), reads
 *           nextInvoiceId from the contract and subtracts 1 — the transaction
 *           already succeeded so the invoice exists; we just recover the ID.
 */
export async function createInvoice(
  injected: Eip1193Provider,
  merchant: string,
  amountWei: bigint,
  orderRef: string
): Promise<bigint> {
  const contract = await getWriteContract(injected);
  const tx = await contract.createInvoice(merchant, amountWei, orderRef);
  const receipt = await tx.wait();

  // --- Primary: recover invoiceId from the InvoiceCreated event -----------
  const iface = new quais.Interface(artifact.abi);
  for (const log of receipt.logs ?? []) {
    try {
      const parsed = iface.parseLog({ topics: log.topics, data: log.data });
      if (parsed?.name === "InvoiceCreated") {
        return parsed.args.invoiceId as bigint;
      }
    } catch {
      // not one of ours — skip
    }
  }

  // --- Fallback: tx succeeded but event not in receipt (log delivery lag) --
  // nextInvoiceId was post-incremented by the contract, so the new invoice is
  // at nextInvoiceId - 1.
  console.warn(
    "[paymentRegistry] InvoiceCreated event not found in receipt logs — " +
    "falling back to nextInvoiceId read."
  );
  try {
    const readContract = getReadContract();
    const nextId = (await readContract.nextInvoiceId()) as bigint;
    if (nextId > BigInt(0)) {
      return nextId - BigInt(1);
    }
  } catch (fallbackErr) {
    console.error("[paymentRegistry] nextInvoiceId fallback failed:", fallbackErr);
  }

  throw new Error(
    "createInvoice: could not determine invoiceId — event missing and nextInvoiceId fallback failed."
  );
}

/** confirmPayment(invoiceId, payer) — called after independent verification (README flow step 6). */
export async function confirmPayment(
  injected: Eip1193Provider,
  invoiceId: bigint,
  payer: string
): Promise<string> {
  const contract = await getWriteContract(injected);
  const tx = await contract.confirmPayment(invoiceId, payer);
  const receipt = await tx.wait();
  return receipt.hash as string;
}

/**
 * cancelInvoice(invoiceId) — marks the invoice Cancelled on-chain.
 * Any caller is permitted at hackathon scope (contract is open-access).
 * Returns the transaction hash.
 */
export async function cancelInvoice(
  injected: Eip1193Provider,
  invoiceId: bigint
): Promise<string> {
  const contract = await getWriteContract(injected);
  const tx = await contract.cancelInvoice(invoiceId);
  const receipt = await tx.wait();
  return receipt.hash as string;
}

/**
 * getStatus(invoiceId) — lightweight read-only status poll.
 * Use this as a WSS fallback: if the WebSocket drops before PaymentConfirmed
 * fires, poll this every N seconds until status !== Pending.
 */
export async function getStatus(invoiceId: bigint): Promise<InvoiceStatus> {
  const c = getReadContract();
  const raw = await c.getStatus(invoiceId);
  return Number(raw) as InvoiceStatus;
}

/** getInvoice(invoiceId) read-back. */
export async function getInvoice(invoiceId: bigint): Promise<Invoice> {
  const c = getReadContract();
  const r = await c.getInvoice(invoiceId);
  return {
    merchant: r.merchant,
    payer: r.payer,
    amount: r.amount,
    orderRef: r.orderRef,
    status: Number(r.status) as InvoiceStatus,
    createdAt: r.createdAt,
    confirmedAt: r.confirmedAt,
  };
}

/**
 * Subscribe to PaymentConfirmed for one invoiceId over WSS
 * (README §Network Details: WSS preferred over polling).
 * Returns an unsubscribe function that also closes the socket.
 */
export function onPaymentConfirmed(
  invoiceId: bigint,
  handler: (payer: string, amount: bigint) => void
): () => void {
  const wss = createWssProvider();
  const contract = new quais.Contract(CONTRACT_ADDRESS, artifact.abi, wss);
  const filter = contract.filters.PaymentConfirmed(invoiceId);

  const listener = (id: bigint, payer: string, amount: bigint) => {
    handler(payer, amount);
  };
  contract.on(filter, listener);

  return () => {
    contract.off(filter, listener);
    wss.destroy();
  };
}
