"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AuthComponent from "./authComponent";

export default function AuthPage() {
  const [isSignIn, setIsSignIn] = useState(false);

  const toggleAuthMode = () => {
    setIsSignIn(!isSignIn);
  };

  return (
    <div className="flex min-h-screen">
      <div className="flex w-1/2 flex-col p-8">
        <div className="mb-12">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600" />
            <span className="text-xl font-bold">Teleparty</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center max-w-md mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={isSignIn ? "signin-header" : "signup-header"}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="mb-2 text-6xl font-black tracking-tight">
                {isSignIn ? "Welcome Back" : "Get Started"}
              </h1>
              <p className="mb-8 text-lg text-muted-foreground">
                {isSignIn ? "New to Teleparty?" : "Already have an account?"}{" "}
                <button
                  onClick={toggleAuthMode}
                  className="text-indigo-600 hover:underline"
                >
                  {isSignIn ? "Sign up" : "Sign in"}
                </button>
              </p>
            </motion.div>
          </AnimatePresence>
          <AuthComponent isSignIn={isSignIn} />
          <AnimatePresence mode="wait"></AnimatePresence>
        </div>
      </div>

      <div className="relative flex w-1/2 items-center justify-center bg-indigo-600 p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.1)_0%,rgba(0,0,0,0.1)_100%)]" />

        <AnimatePresence mode="wait">
          <motion.div
            key={isSignIn ? "signin-content" : "signup-content"}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 space-y-8 text-center text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 400 300"
              className="mx-auto h-64 w-64"
            >
              {/* SVG Content (same as previous version) */}
              <rect
                x="100"
                y="50"
                width="200"
                height="120"
                rx="10"
                fill="rgba(255,255,255,0.1)"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="2"
              />
              <circle cx="150" cy="220" r="20" fill="rgba(255,255,255,0.4)" />
              <circle cx="250" cy="220" r="20" fill="rgba(255,255,255,0.4)" />
            </svg>

            <div className="space-y-4 px-4">
              <AnimatePresence mode="wait">
                <motion.h2
                  key={isSignIn ? "signin-title" : "signup-title"}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="text-3xl font-bold tracking-tighter sm:text-4xl"
                >
                  {isSignIn
                    ? "Welcome Back to Teleparty"
                    : "Connect and Watch Together"}
                </motion.h2>
              </AnimatePresence>
              <AnimatePresence mode="wait">
                <motion.p
                  key={isSignIn ? "signin-subtitle" : "signup-subtitle"}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm opacity-80"
                >
                  {isSignIn
                    ? "Continue your movie night with friends"
                    : "Join a new way to stream with friends"}
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(white 1px, transparent 1px)`,
              backgroundSize: "50px 50px",
              opacity: 0.1,
            }}
          />
        </div>
      </div>
    </div>
  );
}
