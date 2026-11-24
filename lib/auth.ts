import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { type NextAuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getDb } from "./db";
import * as schema from "@/db/schema";

export const authOptions: NextAuthOptions = {
  get adapter() {
    return DrizzleAdapter(getDb(), {
      usersTable: schema.users,
      accountsTable: schema.accounts,
      // The existing migration makes sessionToken unique and non-null. The adapter
      // looks it up by equality but types that column as a primary key.
      // @ts-expect-error UUID id is the primary key in this schema.
      sessionsTable: schema.sessions,
      verificationTokensTable: schema.verificationTokens,
    });
  },
  session: { strategy: "database" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    session: async ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
};

export const getServerAuthSession = () =>
  process.env.DATABASE_URL ? getServerSession(authOptions) : Promise.resolve(null);
