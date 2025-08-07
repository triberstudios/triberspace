import { config } from 'dotenv';
import { resolve } from 'path';
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
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
      userName: {
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
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;