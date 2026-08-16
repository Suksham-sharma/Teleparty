"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { userLogin, userSignup } from "@/services/auth";
import { createChannel } from "@/services/channel";

// Unfilled fields: three solid `card` blocks stacked read heavier than the
// form deserves on a true-black page. An outline recedes and lets focus do the
// talking — the field you're in is the one that lights up. `hair-strong`, not
// `hair`: at 1.55:1 `hair` is below the non-text threshold and must never be
// the only thing marking a region (docs/DESIGN.md §5, rule 4).
const FIELD = "border-hair-strong bg-transparent";

function AuthComponent({ isSignIn }: { isSignIn: boolean }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignin = async () => {
    try {
      if (!email || !password) {
        toast.error("Please fill in all fields");
        return;
      }

      if (!email.includes("@")) {
        toast.warning("Invalid email");
        return;
      }

      const response = await userLogin(email, password);
      if (!response) {
        toast.error("Error signing in");
        return;
      }

      toast.success("Signed in");
      router.push("/library");
    } catch (error: unknown) {
      console.log("Error signing in", error);
      toast.error("Error signing in");
    }
  };

  const handleSignup = async () => {
    try {
      if (!name || !email || !password) {
        toast.error("Please fill in all fields");
        return;
      }

      if (!email.includes("@")) {
        toast.warning("Invalid email");
        return;
      }

      const response = await userSignup(email, name, password);
      if (!response) {
        toast.error("Error signing up");
        return;
      }

      // Best-effort: the library needs a channel to hang uploads off, but a
      // failure here must not strand a signed-in user with no way forward.
      await handleDefaultChannelCreation(name);

      toast.success("Account created");
      router.push("/library");
    } catch (error: unknown) {
      console.log("Error signing up", error);
      toast.error("Error signing up");
    }
  };

  const handleDefaultChannelCreation = async (name: string) => {
    try {
      const response = await createChannel(
        `${name}'s library`,
        "Uploads for watch parties"
      );
      return Boolean(response);
    } catch (error: unknown) {
      console.error("Could not create default channel", error);
      return false;
    }
  };

  const handleAuthClick = async () => {
    setIsLoading(true);
    if (isSignIn) await handleSignin();
    else await handleSignup();
    setIsLoading(false);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleAuthClick();
      }}
    >
      {/*
        Default 44px controls, deliberately not the join gate's 52px. The gate
        has one input inline with a button — a single horizontal line — so the
        pill carries. Stacked three deep the shape compounds, and at 52px the
        fields match the submit button exactly, leaving the form with no
        hierarchy. The button is the only 48px thing here.
      */}
      <div className="space-y-3.5">
        {!isSignIn && (
          <Field id="name" label="Name">
            <Input
              id="name"
              placeholder="Your name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={FIELD}
            />
          </Field>
        )}

        <Field id="email" label="Email">
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={FIELD}
          />
        </Field>

        <Field id="password" label="Password">
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Your password"
              autoComplete={isSignIn ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${FIELD} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              // The icon is 17px but the target must not be: WCAG 2.5.8 wants
              // 24x24 minimum, so the button is a 36px circle with the glyph
              // centred in it. Position keeps the glyph optically where it was.
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-grey transition-colors hover:bg-card-2 hover:text-ash"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </Field>
      </div>

      <Button type="submit" disabled={isLoading} className="mt-6 h-12 w-full">
        {isLoading && <Loader2 className="animate-spin" />}
        {isLoading ? "Please wait" : isSignIn ? "Sign in" : "Create account"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block pl-1 text-sm font-medium text-grey-dim"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export default AuthComponent;
