"use client";

import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import { Toaster } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <AuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => {
        router.refresh();
      }}
      Link={Link}
      social={{
        providers: ["google"]
      }}
      signUp={{
        fields: []
      }}
    >
      {children}
      <Toaster theme="dark" />
    </AuthUIProvider>
  );
}