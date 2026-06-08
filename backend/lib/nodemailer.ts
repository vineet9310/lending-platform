import nodemailer from "nodemailer";

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail({ to, subject, html }: SendMailOptions) {
  console.log(`[EMAIL DISPATCH] To: ${to} | Subject: ${subject}`);

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT) || 587;

  if (!smtpUser || !smtpPass) {
    console.log("================ MOCK EMAIL CONTENT ================");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${html.replace(/<[^>]*>/g, " ")}`); // strip tags for clean console display
    console.log("====================================================");
    return { success: true, mock: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: `"${process.env.NEXT_PUBLIC_APP_NAME || "LendEasy"}" <${smtpUser}>`,
      to,
      subject,
      html,
    });

    console.log(`[EMAIL SUCCESS] MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[EMAIL ERROR] Failed to send email via SMTP:", error);
    // Even if SMTP fails, do not crash the app in development
    return { success: false, error };
  }
}
