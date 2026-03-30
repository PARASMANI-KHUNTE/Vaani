import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { exchangeGoogleLogin } from "@/lib/api";

const validateEnvVars = () => {
  const requiredEnvVars = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "NEXTAUTH_SECRET",
  ] as const;

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
};

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      idToken: true,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.provider === "google" && account.id_token) {
        validateEnvVars();
        const session = await exchangeGoogleLogin(account.id_token);

        token.backendAccessToken = session.accessToken;
        token.backendUser = session.user;
      }

      return token;
    },
    async session({ session, token }) {
      session.backendAccessToken = token.backendAccessToken;
      session.backendUser = token.backendUser;

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET!,
};
