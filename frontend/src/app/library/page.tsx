import Link from "next/link";
import { cookies } from "next/headers";
import { getChannelForUser } from "@/services/channel";
import { SiteHeader } from "@/app/_components/site-header";
import { LibraryGrid } from "./library-grid";
import { OpenRooms } from "./open-rooms";
import { OpenRoomButton } from "./open-room-button";

/**
 * This is the signed-in home. There is deliberately no separate /home: rooms
 * are disposable and the link is the artifact, so a "your rooms" screen would
 * be empty for most people. Open rooms appear here as a strip, only when there
 * are any.
 */
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const { room } = await searchParams;
  const authToken = (await cookies()).get("Authentication");

  if (!authToken) {
    return (
      <Shell>
        <h1 className="text-lg font-semibold">Sign in to see your library</h1>
        <p className="mt-3 max-w-[52ch] text-md text-grey">
          Uploads live with your account.{" "}
          <Link
            href="/auth"
            className="text-butter underline underline-offset-4"
          >
            Sign in
          </Link>{" "}
          to add films, or{" "}
          <Link href="/" className="text-butter underline underline-offset-4">
            open a room
          </Link>{" "}
          as a guest.
        </p>
      </Shell>
    );
  }

  const channel = await getChannelForUser(authToken.value);
  const videos = channel && channel !== false ? channel.videos ?? [] : [];

  return (
    <Shell>
      {!room && <OpenRooms />}

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mute mb-3">Library</p>
          <h1 className="text-xl font-semibold">
            {room ? (
              <>
                Pick something for <code className="text-butter">{room}</code>
              </>
            ) : (
              "Your films"
            )}
          </h1>
        </div>

        {!room && <OpenRoomButton />}
      </div>

      <LibraryGrid videos={videos} roomCode={room ?? null} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen">
      <div className="border-b border-hair">
        <SiteHeader>
          <Link
            href="/"
            className="text-md text-grey transition-colors hover:text-ash"
          >
            Home
          </Link>
        </SiteHeader>
      </div>
      <section className="mx-auto max-w-shell px-6 py-12 md:px-10">
        {children}
      </section>
    </main>
  );
}
