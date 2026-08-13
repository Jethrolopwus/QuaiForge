import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="forge-grid relative min-h-screen">
      <div className="forge-halo pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-20 text-center">
        <p className="mb-8 rounded-full border border-forge-accent/60 bg-forge-primary/5 px-5 py-2 font-mono text-xs uppercase tracking-[0.25em] text-forge-primary">
          QUAI × BLIP Buildathon Jos
        </p>

        <Image
          src="/quaiforge-mark.png"
          alt="QuaiForge logo"
          width={160}
          height={160}
          priority
          className="mb-6 h-36 w-36 rounded-full shadow-glow sm:h-40 sm:w-40"
        />

        <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
          Quai<span className="text-forge-primary">Forge</span>
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-300">
          One button. No code.{" "}
          <span className="font-semibold text-forge-primary">
            Real Quai payments.
          </span>{" "}
          A drop-in &ldquo;Pay with Blip&rdquo; checkout widget any merchant
          site can embed — invoices recorded on-chain, payments
          wallet-to-wallet.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/widget-demo"
            className="rounded-xl bg-forge-secondary px-8 py-3.5 font-semibold text-forge-ink shadow-glow-sm transition hover:bg-forge-primary hover:shadow-glow focus:outline-none focus:ring-2 focus:ring-forge-primary focus:ring-offset-2 focus:ring-offset-forge-ink"
          >
            Open the merchant demo
          </Link>
          <a
            href="https://orchard.quaiscan.io"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-forge-accent px-8 py-3.5 text-forge-primary transition hover:border-forge-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-forge-primary"
          >
            Orchard explorer
          </a>
        </div>

        <dl className="mt-16 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-3">
          <Fact term="Non-custodial" detail="Payment is a direct wallet-to-wallet quai_sendTransaction — the widget never holds funds." />
          <Fact term="Dual confirmation" detail="Blip payment result and the on-chain PaymentConfirmed event verified in parallel." />
          <Fact term="On-chain record" detail="Every invoice lives in PaymentRegistry on Orchard — inspectable on Quaiscan." />
        </dl>
      </div>
    </main>
  );
}

function Fact({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="rounded-xl border border-forge-line bg-forge-dark/70 p-4">
      <dt className="font-mono text-xs uppercase tracking-wider text-forge-primary">
        {term}
      </dt>
      <dd className="mt-2 text-sm leading-relaxed text-neutral-300">{detail}</dd>
    </div>
  );
}
