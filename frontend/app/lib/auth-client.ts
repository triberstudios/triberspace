import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  basePath: "/api/auth",
  
  fetchOptions: {
    credentials: "include",
  },
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;

console.log('Auth Client Config:', {
    baseURL: process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001",
    basePath: "/api/auth",
    fullURL: (process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001") + "/api/auth"
  });