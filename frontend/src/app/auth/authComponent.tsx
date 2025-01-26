import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createChannel, userLogin, userSignup } from "@/services/api";
import { motion } from "framer-motion";
import { CircleUser, Mail, EyeOff, Eye, Lock, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

function AuthComponent({ isSignIn }: { isSignIn: boolean }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(true);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

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

      toast.success("Signed in successfully");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.push("/home");
    } catch (error: unknown) {
      console.log("Error signing in", error);
      toast.error("Error signing in");
    }
  };

  const handleSignup = async () => {
    console.log("Signing up...");
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

      const channelCreated = await handleDefaultChannelCreation(name);

      if (!channelCreated) {
        toast.error("Error creating default channel");
        return;
      }

      toast.success("Signed up successfully");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.push("/home");
    } catch (error: unknown) {
      console.log("Error signing up", error);
      toast.error("Error signing up");
    }
  };

  const handleDefaultChannelCreation = async (name: string) => {
    try {
      const response = await createChannel(
        `${name}'s Channel`,
        `For Streaming and Creating everlasting memories`
      );
      if (!response) {
        toast.error("Error creating default channel");
        return false;
      }
      return true;
    } catch (error: unknown) {
      console.log("Error creating default channel", error);
      toast.error("Error creating default channel");
      return false;
    }
  };

  const handleAuthClick = async () => {
    setIsLoading(true);
    if (isSignIn) await handleSignin();
    else await handleSignup();

    console.log("Auth clicked");
    setIsLoading(false);
  };

  return (
    <motion.form
      key={isSignIn ? "signin" : "signup"}
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
      onSubmit={(e) => {
        console.log("Submitting form...");
        e.preventDefault();
        handleAuthClick();
      }}
    >
      {!isSignIn && (
        <div className="space-y-2 items-center">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <div className="relative items-center">
            <Input
              id="name"
              placeholder="Enter your name"
              className="pl-10"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <CircleUser className="absolute left-3 top-2 h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <div className="relative">
          <Input
            id="email"
            placeholder="Enter your email"
            className="pl-10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Mail className="absolute left-3 top-2 h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 pr-10"
          />
          <Lock className="absolute left-3 top-2 h-5 w-5 text-muted-foreground" />
          <Button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-3 top-2 h-5 w-5 text-muted-foreground bg-white hover:bg-gray-100"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </Button>
        </div>
      </div>

      <div>
        <Button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Please wait
            </>
          ) : isSignIn ? (
            "Sign in"
          ) : (
            "Sign up"
          )}
        </Button>
      </div>
    </motion.form>
  );
}

export default AuthComponent;
