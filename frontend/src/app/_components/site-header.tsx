import Link from "next/link";

/**
 * The mark is a lit filament beside the name — the accent's whole rationale.
 * See docs/DESIGN.md §6.
 */
export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2.5 text-lg font-semibold tracking-tight text-white"
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-butter" />
      watchparty
    </Link>
  );
}

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    // Wraps to two rows on narrow screens rather than pushing actions off-edge.
    <header className="mx-auto flex max-w-shell flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-5 md:px-10">
      <Wordmark />
      <div className="flex items-center gap-3 sm:gap-4">{children}</div>
    </header>
  );
}
