"use client";

/**
 * useBlipDeepLink — README §Frontend /hooks
 *
 * Builds the /browser and /fund/invoice links for the current page +
 * invoice, and reports whether the page is already inside Blip
 * (README flow step 3: skip the /browser hop when already inside).
 */

import { useEffect, useMemo, useState } from "react";
import { getBlip } from "@/lib/BlipProviderDetector";
import {
  buildOpenInBlipLink,
  buildFundInvoiceLink,
} from "@/lib/blipDeepLinks";

export function useBlipDeepLink(params: {
  merchantAddress: string;
  invoiceRef: string;
  title?: string;
}) {
  const [insideBlip, setInsideBlip] = useState(false);
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    setInsideBlip(getBlip() !== null);
    setPageUrl(window.location.href);
  }, []);

  const openInBlipLink = useMemo(
    () => (pageUrl ? buildOpenInBlipLink(pageUrl) : ""),
    [pageUrl]
  );

  const fundInvoiceLink = useMemo(
    () =>
      buildFundInvoiceLink({
        invoiceRef: params.invoiceRef,
        merchantAddress: params.merchantAddress,
        title: params.title,
      }),
    [params.invoiceRef, params.merchantAddress, params.title]
  );

  return { insideBlip, openInBlipLink, fundInvoiceLink };
}
