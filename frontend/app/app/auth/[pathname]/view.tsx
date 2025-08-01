"use client";

import { AuthCard } from "@daveyplate/better-auth-ui";

export function AuthView({ pathname }: { pathname: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-3xl font-semibold">triberspace</h1>
        <p className="text-muted-foreground">A new dimension.</p>
      </div>
      
      <div className="w-full max-w-md [&>*]:flex [&>*]:flex-col [&>*]:gap-6 [&_form]:flex [&_form]:flex-col [&_form]:gap-4 [&_form>div]:flex [&_form>div]:flex-col [&_form>div]:gap-2">
        <AuthCard 
          pathname={pathname}
          redirectTo="/explore"
          className="rounded-lg border bg-card px-4 py-8"
        />
      </div>
    </div>
  );
}