import { betterAuth } from "better-auth";
import { getDb } from "@/lib/db";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

function createAuth() {
  const secret=process.env.BETTER_AUTH_SECRET;
  if(!secret||secret.length<32||secret.includes("REPLACE_"))throw new Error("BETTER_AUTH_SECRET belum dikonfigurasi dengan aman.");
  return betterAuth({
    database: getDb(),
    secret,
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: MIN_PASSWORD_LENGTH, maxPasswordLength: MAX_PASSWORD_LENGTH },
    trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
    user: { additionalFields: { role: { type: "string", required: false, defaultValue: "admin", input: false } } },
    session: { expiresIn: 60 * 60 * 8 },
    rateLimit: { enabled: true, storage: "memory", window: 60, max: 20 },
  });
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() { return instance ??= createAuth(); }
