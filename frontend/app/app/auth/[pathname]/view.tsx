"use client";

import Image from "next/image";
import { SignInForm } from "@/components/profile/sign-in-form";
import { SignUpForm } from "@/components/profile/sign-up-form";

export function AuthView({ pathname }: { pathname: string }) {
  const renderAuthForm = () => {
    switch (pathname) {
      case "sign-in":
        return <SignInForm />;
      case "sign-up":
        return <SignUpForm />;
    }
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-8 p-8">
      <Image
        src="/TriberspaceLogo2025.svg"
        alt="Triberspace"
        width={300}
        height={60}
        className="mb-1"
      />
      <div className="w-full max-w-md bg-white/5">
        {renderAuthForm()}
      </div>
    </div>
  );
}