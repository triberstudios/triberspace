"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { Eye, EyeClosed } from "@phosphor-icons/react";
import { signInWithEmailOrUsername } from "@/lib/auth-client";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import Link from "next/link";

export function SignInForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signInWithEmailOrUsername(identifier, password);
      toast.success("Successfully signed in!");
      router.push("/explore");
    } catch (error: any) {
      toast.error(error.message || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "http://localhost:3000/explore"
      });
    } catch (error: any) {
      toast.error(error.message || "Google sign-in failed");
    }
  };

  return (
    <div className="rounded-lg border bg-card px-8 py-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Sign In</h1>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to access your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="identifier" className="text-sm font-medium">
              Email or Username
            </Label>
            <Input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              disabled={isLoading}
              className="file:text-foreground placeholder:text-muted-foreground selection:text-primary selection:bg-primary focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-transparent px-3 py-1 text-base shadow-xs transition-all disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm flex h-9 w-full rounded-md border border-input focus-visible:outline-none focus-visible:ring-[3px]"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="file:text-foreground placeholder:text-muted-foreground selection:text-primary selection:bg-primary focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-transparent px-3 py-1 text-base shadow-xs transition-all disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm flex h-9 w-full rounded-md border border-input focus-visible:outline-none focus-visible:ring-[3px] pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeClosed className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full cursor-pointer">
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="flex items-center gap-4">
          <div className="flex-1 border-t border-border"></div>
          <span className="text-sm text-muted-foreground">Or</span>
          <div className="flex-1 border-t border-border"></div>
        </div>

        <Button
          variant="outline"
          className="w-full cursor-pointer"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/auth/sign-up" className="underline underline-offset-4 hover:text-primary">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}