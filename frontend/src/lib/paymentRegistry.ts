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

/** createInvoice(merchant, amount, orderRef) → invoiceId (README flow step 2). */
export async function createInvoice(
  injected: Eip1193Provider,
  merchant: string,
  amountWei: bigint,
  orderRef: string
): Promise<bigint> {
  const contract = await getWriteContract(injected);
  const tx = await contract.createInvoice(merchant, amountWei, orderRef);
  const receipt = await tx.wait();

  // Recover invoiceId from the InvoiceCreated event in this receipt.
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
  throw new Error("InvoiceCreated event not found in transaction receipt");
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
