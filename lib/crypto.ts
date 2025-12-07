import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

function getKey() {
  const secret = process.env.PLAID_ENCRYPTION_KEY ?? process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("PLAID_ENCRYPTION_KEY is not set");
  }

  return scryptSync(secret, "plaid-token", 32);
}

export function encryptSecret(value: string) {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(payload: string) {
  const [iv, tag, data] = payload.split(".");
  if (!iv || !tag || !data) {
    throw new Error("Invalid encrypted payload");
  }

  const key = getKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(data, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
