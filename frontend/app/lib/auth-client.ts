import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields, usernameClient } from "better-auth/client/plugins";
// TODO: Uncomment when @triberspace/auth package is fully set up
// import type { auth } from "@triberspace/auth";

// Temporary auth type for deployment - remove when real auth is ready
type auth = any;

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  basePath: "/api/auth",
  
  fetchOptions: {
    credentials: "include",
  },
  
  plugins: [
    // TODO: Uncomment when @triberspace/auth is ready
    // inferAdditionalFields<typeof auth>(),
    usernameClient(),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;

// Custom sign-in handler that detects email vs username
export async function signInWithEmailOrUsername(identifier: string, password: string) {
  // Check if identifier is an email (contains @)
  const isEmail = identifier.includes('@');
  
  if (isEmail) {
    return authClient.signIn.email({
      email: identifier,
      password,
    });
  } else {
    return authClient.signIn.username({
      username: identifier,
      password,
    });
  }
}

console.log('Auth Client Config:', {
    baseURL: process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001",
    basePath: "/api/auth",
    fullURL: (process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001") + "/api/auth"
  });