'use client';

import { use } from 'react';
import { AuthView } from "./view";

export default function AuthPage({
  params
}: {
  params: Promise<{ pathname: string }>
}) {
  const { pathname } = use(params);
  return <AuthView pathname={pathname} />;
}