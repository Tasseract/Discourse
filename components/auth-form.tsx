"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notify } from "@/lib/notifications";
import Link from "next/link";

interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        const res = await authClient.signUp.email({
          email,
          password,
          name,
        });

        if (res.error) {
          throw new Error(res.error.message || "Signup failed");
        }

        notify.success("Account created successfully!");
        router.push("/");
      } else {
        const res = await authClient.signIn.email({
          email,
          password,
        });

        if (res.error) {
          throw new Error(res.error.message || "Login failed");
        }

        notify.success("Logged in successfully!");
        router.push("/");
      }
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-center">
          {mode === "login" ? "Log in" : "Sign up"}
        </h1>
        <p className="text-sm text-center text-gray-600 dark:text-gray-400">
          {mode === "login"
            ? "Enter your credentials to access your account"
            : "Create an account to get started"}
        </p>
      </div>

      {mode === "signup" && (
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            required
            disabled={loading}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
          minLength={8}
          disabled={loading}
        />
        {mode === "signup" && (
          <p className="text-xs text-gray-500">
            Password must be at least 8 characters
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}
      </Button>

      <p className="text-sm text-center text-gray-600 dark:text-gray-400">
        {mode === "login" ? (
          <>
            Don't have an account?{" "}
            <Link href="/signup" className="text-blue-600 hover:underline">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:underline">
              Log in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
