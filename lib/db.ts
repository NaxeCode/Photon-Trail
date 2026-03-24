import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import * as schema from "@/db/schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const isLocalPostgres = (() => {
  try {
    const url = new URL(connectionString);
    return ["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
})();

export const db = isLocalPostgres
  ? drizzleNodePg(
      new Pool({
        connectionString,
      }),
      { schema },
    )
  : drizzleNeon(neon(connectionString), { schema });
