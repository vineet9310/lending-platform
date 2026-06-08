import { connectToDatabase } from "./lib/mongodb";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      await connectToDatabase();
    } catch (error) {
      console.error("❌ MongoDB startup connection failed:", error);
    }
  }
}
