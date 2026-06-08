import twilio from "twilio";

interface SendSMSOptions {
  to: string;
  body: string;
}

export async function sendSMS({ to, body }: SendSMSOptions) {
  console.log(`[SMS DISPATCH] To: ${to} | Body: ${body}`);

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log("================ MOCK SMS CONTENT ================");
    console.log(`To: ${to}`);
    console.log(`Body: ${body}`);
    console.log("==================================================");
    return { success: true, mock: true };
  }

  try {
    const client = twilio(accountSid, authToken);
    const message = await client.messages.create({
      body,
      from: fromNumber,
      to,
    });

    console.log(`[SMS SUCCESS] Sid: ${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error("[SMS ERROR] Failed to send SMS via Twilio:", error);
    return { success: false, error };
  }
}
