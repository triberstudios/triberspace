import { config } from 'dotenv';
import { resolve } from 'path';
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { db } from "@triberspace/database";

// Load .env from root directory
config({ path: resolve(__dirname, '../../../.env') });

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
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ],
  plugins: [
    username()
  ]
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;