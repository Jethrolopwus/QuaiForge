/**
 * blipDeepLinks — README §Frontend /lib
 *
 * URL builders for Blip's documented deep-link paths (blippay.me/docs):
 *
 *   /browser?url=...      opens a dApp inside Blip's in-app browser
 *   /fund/invoice         Managed QUAI checkout (params: invoice ref, address, title)
 *   /fund/status          Funding status screen (params: session, address)
 *
 * All three are universal links: if Blip is not installed they fall back to a
 * Blip web page offering App Store / Google Play install — no custom fallback
 * UI is needed in the widget (README §Resilience Notes).
 *
 * Note: /fund/invoice and /fund/status open screens inside Blip; they are
 * deep links, not JSON REST endpoints. On-chain confirmation therefore comes
 * from the PaymentRegistry event listener (see paymentRegistry.ts), with the
 * Blip-side rail driven by the quai_sendTransaction result.
 */

const BLIP_BASE = "https://blippay.me";

/** Deep link that opens `dappUrl` inside Blip's in-app browser. */
export function buildOpenInBlipLink(dappUrl: string): string {
  return `${BLIP_BASE}/browser?url=${encodeURIComponent(dappUrl)}`;
}

/** Managed QUAI checkout deep link for a created invoice. */
export function buildFundInvoiceLink(params: {
  invoiceRef: string;
  merchantAddress: string;
  title?: string;
}): string {
  const q = new URLSearchParams({
    ref: params.invoiceRef,
    address: params.merchantAddress,
  });
  if (params.title) q.set("title", params.title);
  return `${BLIP_BASE}/fund/invoice?${q.toString()}`;
}

/** Funding status screen deep link. */
export function buildFundStatusLink(params: {
  session: string;
  address: string;
}): string {
  const q = new URLSearchParams({
    session: params.session,
    address: params.address,
  });
  return `${BLIP_BASE}/fund/status?${q.toString()}`;
}
