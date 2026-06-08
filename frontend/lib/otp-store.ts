import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (upstashUrl && upstashToken) {
  redis = new Redis({
    url: upstashUrl,
    token: upstashToken,
  });
}

// Global in-memory fallback for local development without Upstash Redis
interface OTPRecord {
  otp: string;
  attempts: number;
  expiresAt: number;
}

declare global {
  var mockOtpStore: Map<string, OTPRecord> | undefined;
}

if (!global.mockOtpStore) {
  global.mockOtpStore = new Map<string, OTPRecord>();
}

const mockStore = global.mockOtpStore;

// Clean up expired OTPs periodically in-memory
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of mockStore.entries()) {
    if (val.expiresAt < now) {
      mockStore.delete(key);
    }
  }
}, 60000); // every minute

export async function setOTP(key: string, otp: string, expirySeconds: number = 300): Promise<void> {
  const fullKey = `otp:${key}`;
  if (redis) {
    await redis.set(fullKey, otp, { ex: expirySeconds });
    await redis.set(`${fullKey}:attempts`, 0, { ex: expirySeconds });
  } else {
    mockStore.set(key, {
      otp,
      attempts: 0,
      expiresAt: Date.now() + expirySeconds * 1000,
    });
    console.log(`[DEV OTP STORE] Set OTP for ${key}: ${otp} (expires in ${expirySeconds}s)`);
  }
}

export async function getOTP(key: string): Promise<string | null> {
  const fullKey = `otp:${key}`;
  if (redis) {
    return await redis.get<string>(fullKey);
  } else {
    const record = mockStore.get(key);
    if (!record || record.expiresAt < Date.now()) {
      return null;
    }
    return record.otp;
  }
}

export async function getAttempts(key: string): Promise<number> {
  const fullKey = `otp:${key}:attempts`;
  if (redis) {
    const attempts = await redis.get<number>(fullKey);
    return attempts ? Number(attempts) : 0;
  } else {
    const record = mockStore.get(key);
    return record ? record.attempts : 0;
  }
}

export async function incrementAttempts(key: string): Promise<number> {
  const fullKey = `otp:${key}:attempts`;
  if (redis) {
    return (await redis.incr(fullKey)) as number;
  } else {
    const record = mockStore.get(key);
    if (record) {
      record.attempts += 1;
      return record.attempts;
    }
    return 0;
  }
}

export async function deleteOTP(key: string): Promise<void> {
  const fullKey = `otp:${key}`;
  if (redis) {
    await redis.del(fullKey);
    await redis.del(`${fullKey}:attempts`);
  } else {
    mockStore.delete(key);
  }
}
