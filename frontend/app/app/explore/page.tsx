"use client";

import { useSession } from "@/lib/auth-client";
import { AuthCard } from "@daveyplate/better-auth-ui";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ExplorePage() {
  const { data: session, isPending } = useSession();

  return (
    <div className="p-8 flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold">Explore</h1>
        <p className="text-lg text-muted-foreground">
          Authentication testing ground
        </p>
      </div>

      <div className="flex flex-col gap-8 max-w-md">
        <div className="bg-card border rounded-lg p-8">
          <h2 className="text-2xl font-medium mb-4">Authentication Status</h2>
          <div className="flex flex-col gap-4">
            <div className="text-sm">
              <span className="font-medium">Status:</span>{" "}
              {isPending ? "Loading..." : session ? "Authenticated" : "Not authenticated"}
            </div>
            <div className="text-sm">
              <span className="font-medium">User:</span>{" "}
              {session ? `${session.user.name} (${session.user.email})` : "None"}
            </div>
            {session && (
              <div className="text-sm">
                <span className="font-medium">Session ID:</span> {session.session.id}
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border rounded-lg p-8 max-w-md">
          <h2 className="text-2xl font-medium mb-4">Authentication</h2>
          {session ? (
            <div className="flex flex-col gap-4">
              <p className="text-muted-foreground">
                You are signed in! Test protected features or try signing out.
              </p>
              <div className="flex gap-4">
                <Button asChild>
                  <Link href="/auth/sign-out">Sign Out</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-muted-foreground">
                Sign in or create an account to test authentication features.
              </p>
              <div className="flex gap-4">
                <Button asChild>
                  <Link href="/auth/sign-in">Sign In</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/auth/sign-up">Sign Up</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}