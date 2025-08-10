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
        fields: ["userName"]
      }}
      additionalFields={{
        userName: {
          label: "Username",
          placeholder: "Choose a unique username",
          description: "3-20 characters, letters, numbers, and underscores only",
          required: true,
          type: "string"
        }
      }}
    >
      {children}
      <Toaster theme="dark" />
    </AuthUIProvider>
  );
}