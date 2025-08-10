"use client";

import { AuthCard } from "@daveyplate/better-auth-ui";
import { SignInForm } from "@/components/ui/sign-in-form";
import { SignUpForm } from "@/components/ui/sign-up-form";

export function AuthView({ pathname }: { pathname: string }) {
  const renderAuthForm = () => {
    switch (pathname) {
      case "sign-in":
        return <SignInForm />;
      case "sign-up":
        return <SignUpForm />;
      default:
        return (
          <AuthCard 
            pathname={pathname}
            redirectTo="http://localhost:3000/explore"
            className="rounded-lg border bg-card px-4 py-8"
          />
        );
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-3xl font-semibold">triberspace</h1>
        <p className="text-muted-foreground">A new dimension.</p>
      </div>
      
      <div className="w-full max-w-md">
        {renderAuthForm()}
      </div>
    </div>
  );
}