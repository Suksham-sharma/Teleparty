"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { userLogin, userSignup } from "@/services/auth";
import { createChannel } from "@/services/channel";

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
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        handleAuthClick();
      }}
    >
      {!isSignIn && (
        <Field id="name" label="Name">
          <Input
            id="name"
            placeholder="Your name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-grey transition-colors hover:text-ash"
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>
      </Field>

      <Button type="submit" disabled={isLoading} className="!mt-6 h-12 w-full">
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
    <div className="space-y-2">
      <label htmlFor={id} className="block text-base text-grey">
        {label}
      </label>
      {children}
    </div>
  );
}

export default AuthComponent;
