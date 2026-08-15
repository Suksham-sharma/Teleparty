import Link from "next/link";
import { StartParty } from "./_components/start-party";
import { RoomPreview } from "./_components/room-preview";
import { SiteHeader } from "./_components/site-header";

export default function LandingPage() {
  return (
    <main className="min-h-screen pb-16">
      <SiteHeader>
        <Link
          href="/auth"
          className="text-md text-grey transition-colors hover:text-ash"
        >
          Sign in
        </Link>
      </SiteHeader>

      <section className="mx-auto max-w-shell px-6 pb-12 pt-10 text-center md:px-10 md:pt-16">
        <h1 className="mx-auto text-2xl leading-[1.02] tracking-[-0.035em] md:text-3xl">
          <span className="font-extralight">Best nights in,</span>
          <br />
          <span className="font-extralight">with </span>
          {/* Each option stacks in one grid cell, so the line never reflows. */}
          <span className="rotate-stack">
            <b className="font-bold text-butter">friends.</b>
            <b className="font-bold text-butter">family.</b>
            <b className="font-bold text-butter">everyone.</b>
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-[52ch] text-md font-light text-grey">
          One link and you&rsquo;re all watching the same frame, to the second,
          all night. No app, no account &mdash; they open the link and sit down.
        </p>

        <StartParty />
      </section>

      {/* The product, running. Not a description of it. */}
      <RoomPreview />
    </main>
  );
}
