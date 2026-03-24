import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { type NextAuthOptions, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "./db";
import * as schema from "@/db/schema";

const devBypassUser = {
  id: "",
  name: "Local Dev",
  email: "demo@photontrail.app",
};

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db, {
    users: schema.users,
    accounts: schema.accounts,
    sessions: schema.sessions,
    verificationTokens: schema.verificationTokens,
  }),
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

export const getServerAuthSession = () => getServerSession(authOptions);

export function isDevAuthBypassed() {
  return process.env.NODE_ENV !== "production" && process.env.DEV_BYPASS_AUTH === "true";
}

export async function getAppSession() {
  if (isDevAuthBypassed()) {
    const [user] = await db
      .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.email, devBypassUser.email));

    return {
      user: {
        id: user?.id ?? "",
        name: user?.name ?? devBypassUser.name,
        email: user?.email ?? devBypassUser.email,
      },
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    };
  }

  return getServerSession(authOptions);
}

export async function getRequiredUserId() {
  const session = await getAppSession();
  return session?.user?.id ?? null;
}
