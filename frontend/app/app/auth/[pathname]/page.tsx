import { AuthView } from "./view";

export function generateStaticParams() {
  return [
    { pathname: "sign-in" },
    { pathname: "sign-up" },
  ];
}

export default async function AuthPage({ 
  params 
}: { 
  params: Promise<{ pathname: string }> 
}) {
  const { pathname } = await params;
  return <AuthView pathname={pathname} />;
}