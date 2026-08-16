"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import AuthComponent from "./authComponent";
import { isUserAuthenticated } from "@/lib/authHook";
import { Wordmark } from "@/app/_components/site-header";
import { Ambient } from "@/app/_components/ambient";
import { Lamp } from "@/app/_components/lamp";

/**
 * Same doorway shape as the join gate: a left-aligned single column on the
 * ambient, the thing you're walking into stated first, the input beneath it.
 * The two screens should read as the same room from different doors.
 *
 * The one divergence is the lamp beside it. The gate fills its upper half with
 * real content — the room's code, who is already sitting there — and auth has
 * nothing equivalent to say, so the column alone left a desktop viewport two
 * thirds empty. The lamp is atmosphere on the ambient layer, not a second
 * column of content: aria-hidden, blended, and dropped entirely below lg.
 */
export default function AuthPage() {
  // Returning users are the common case, so sign-in is the default.
  const [isSignIn, setIsSignIn] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      if (isUserAuthenticated()) {
        toast.success("You are already signed in");
        router.push("/library");
      }
    };
    checkAuth();
  }, [router]);

  return (
    <main className="relative flex min-h-screen flex-col">
      <Ambient />

      <div className="px-6 py-5 md:px-10">
        <Wordmark />
      </div>

      <div className="flex flex-1 items-center px-6 pb-20 md:px-10">
        <div className="mx-auto grid w-full max-w-shell items-center justify-center gap-16 lg:grid-cols-[minmax(0,620px)_minmax(0,380px)] lg:gap-24">
          <div className="w-full max-w-[680px]">
            <p className="label-mute mb-5">
              {isSignIn ? "Sign in" : "Create an account"}
            </p>

            <h1 className="text-2xl font-extralight tracking-[-0.03em] md:text-[3.25rem] md:leading-[1.05]">
              {isSignIn ? (
                <>
                  Welcome <span className="font-bold text-butter">back.</span>
                </>
              ) : (
                <>
                  Keep your{" "}
                  <span className="font-bold text-butter">films.</span>
                </>
              )}
            </h1>

            <p className="mt-5 max-w-[46ch] text-md font-light text-grey">
              An account is only for the library — somewhere to upload films and
              find them again. Joining a room never needs one.
            </p>

            <div className="mt-9 max-w-[390px]">
              <AuthComponent isSignIn={isSignIn} />
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-base">
              <span className="text-grey">
                {isSignIn ? "New here?" : "Already have an account?"}{" "}
                <button
                  onClick={() => setIsSignIn(!isSignIn)}
                  className="text-butter underline underline-offset-4"
                >
                  {isSignIn ? "Create an account" : "Sign in"}
                </button>
              </span>
              <span className="hidden h-3 w-px bg-hair-strong sm:block" />
              <Link
                href="/"
                className="text-grey transition-colors hover:text-ash"
              >
                Join a room instead
              </Link>
            </div>
          </div>

          <div className="hidden lg:block">
            <Lamp />
          </div>
        </div>
      </div>
    </main>
  );
}
