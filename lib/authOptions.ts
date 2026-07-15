import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Only accounts on this Google Workspace domain are allowed to sign in.
// Set GOOGLE_WORKSPACE_DOMAIN in Vercel env vars, e.g. "leadfox.io".
const ALLOWED_DOMAIN = process.env.GOOGLE_WORKSPACE_DOMAIN;

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Hints Google to only show accounts from this Workspace domain.
          // This is a UX nicety, NOT a security boundary on its own —
          // the real check happens in the signIn callback below.
          hd: ALLOWED_DOMAIN,
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      if (!ALLOWED_DOMAIN) {
        console.warn(
          "[auth] GOOGLE_WORKSPACE_DOMAIN is not set — allowing any Google account. Set it in Vercel env vars."
        );
        return true;
      }
      const email = (profile as { email?: string })?.email ?? "";
      const domain = email.split("@")[1]?.toLowerCase();
      return domain === ALLOWED_DOMAIN.toLowerCase();
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
