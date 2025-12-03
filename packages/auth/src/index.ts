import { config } from 'dotenv';
import { resolve } from 'path';
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { createAuthMiddleware } from "better-auth/api";
import { db, creators, users } from "@triberspace/database";
import { eq } from "drizzle-orm";

// Load .env from root directory
config({ path: resolve(__dirname, '../../../.env') });

const isProduction = process.env.NODE_ENV === 'production';

// Generate 12-character nanoid-style public_id for creators
function generateCreatorId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      redirectURI: `${process.env.BETTER_AUTH_URL}/api/auth/callback/google`,
      mapProfileToUser: (profile) => {
        // Split Google's name into firstName and lastName
        const nameParts = profile.name ? profile.name.trim().split(' ') : [''];
        const firstName = nameParts[0] || null;
        const lastName = nameParts.length >= 2 ? nameParts.slice(1).join(' ') : null;
        
        return {
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          emailVerified: profile.email_verified,
          firstName,
          lastName,
        };
      },
    },
  },
  user: {
    additionalFields: {
      firstName: {
        type: "string",
        required: false,
        defaultValue: null
      },
      lastName: {
        type: "string", 
        required: false,
        defaultValue: null
      },
      avatar_url: {
        type: "string",
        required: false,
        defaultValue: null
      },
      socialLinks: {
        type: "string",
        required: false,
        defaultValue: null
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false
      }
    }
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  basePath: "/api/auth",
  trustedOrigins: [
    // Development
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3003", // Engine
    "http://127.0.0.1:3003",
    // Production
    "https://triber.space",
    "https://engine.triber.space",
    "https://api.triber.space",
  ],
  advanced: {
    // Enable cross-subdomain cookies in production
    // In development, localhost automatically shares cookies across all ports
    crossSubDomainCookies: isProduction ? {
      enabled: true,
      domain: "triber.space", // Root domain (Better Auth adds leading dot automatically)
    } : undefined,

    // Use secure cookies in production
    useSecureCookies: isProduction,

    // Cookie attributes
    defaultCookieAttributes: {
      sameSite: "lax", // Works for subdomains, more secure than "none"
      secure: isProduction, // HTTPS only in production
    }
  },
  plugins: [
    username()
  ],
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // Auto-create creator record for all new signups
      if (ctx.path.startsWith("/sign-up")) {
        const newSession = ctx.context.newSession;
        if (newSession?.user) {
          try {
            // Auto-set firstName/lastName if missing (for email/password signups)
            // Google OAuth already provides these via mapProfileToUser
            const user = newSession.user as any;
            if (!user.firstName || !user.lastName) {
              await db.update(users).set({
                firstName: user.firstName || user.username || 'User',
                lastName: user.lastName || ''
              }).where(eq(users.id, user.id));
              console.log(`✅ Auto-set firstName/lastName for user: ${user.id}`);
            }

            // Create creator record
            await db.insert(creators).values({
              userId: newSession.user.id,
              publicId: generateCreatorId(),
              bio: null
            });
            console.log(`✅ Creator record auto-created for user: ${newSession.user.id}`);
          } catch (error: any) {
            // Log error but don't block signup
            // User can still use platform, just won't be a creator yet
            console.error('⚠️  Failed to auto-create creator record:', error.message);
          }
        }
      }
    })
  }
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;