import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { requireEnv } from "@/lib/env";

export const db = drizzle(neon(requireEnv("DATABASE_URL")), { schema });
