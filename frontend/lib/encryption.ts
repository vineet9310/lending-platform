import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";

// Fallbacks for development; in production these MUST be set
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "32-character-secret-key-default-32"; 
const ENCRYPTION_IV = process.env.ENCRYPTION_IV || "16-character-iv-de";

// Helper to ensure key and IV lengths are correct
function getCryptoKeys() {
  // Key must be exactly 32 bytes (256 bits)
  let key = Buffer.from(ENCRYPTION_KEY, "utf-8");
  if (key.length !== 32) {
    // Hash key if it is not 32 bytes
    key = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
  }

  // IV must be exactly 16 bytes (128 bits)
  let iv = Buffer.from(ENCRYPTION_IV, "utf-8");
  if (iv.length !== 16) {
    // Hash IV if it is not 16 bytes
    iv = crypto.createHash("md5").update(ENCRYPTION_IV).digest();
  }

  return { key, iv };
}

export function encrypt(text: string): string {
  if (!text) return "";
  try {
    const { key, iv } = getCryptoKeys();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  } catch (error) {
    console.error("[ENCRYPTION ERROR] Failed to encrypt:", error);
    throw new Error("Encryption failed");
  }
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";
  try {
    const { key, iv } = getCryptoKeys();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("[DECRYPTION ERROR] Failed to decrypt:", error);
    // Return original text or empty if decrypt fails (e.g. if key changed)
    return "[Decryption Error]";
  }
}
