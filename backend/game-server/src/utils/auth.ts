import type { BetterAuthSession } from "../types";

/**
 * Verify Better Auth session token by calling the API
 */
export async function verifyBetterAuthToken(token: string): Promise<BetterAuthSession> {
  const apiUrl = process.env.API_URL || "http://localhost:3001";

  try {
    // Call your existing Better Auth API to verify the session
    const response = await fetch(`${apiUrl}/api/auth/get-session`, {
      headers: {
        "Cookie": `better-auth.session_token=${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Session verification failed: ${response.status}`);
    }

    const data = await response.json();

    // Validate session structure
    if (!data.session?.userId || !data.user) {
      throw new Error("Invalid session structure");
    }

    return {
      userId: data.session.userId,
      user: {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        name: data.user.name
      }
    };
  } catch (error) {
    console.error("Auth verification error:", error);
    throw new Error("Failed to verify session token");
  }
}
