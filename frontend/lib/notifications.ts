import { sendMail } from "./nodemailer";
import { sendSMS } from "./twilio";

interface NotificationParams {
  email: string;
  phone: string;
  fullName: string;
  eventName:
    | "registration"
    | "application_submitted"
    | "kyc_approved"
    | "kyc_rejected"
    | "loan_approved"
    | "loan_rejected"
    | "disbursement_done"
    | "emi_reminder"
    | "emi_due"
    | "emi_overdue"
    | "loan_closed";
  details?: Record<string, any>;
}

export async function sendNotification({
  email,
  phone,
  fullName,
  eventName,
  details = {},
}: NotificationParams) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "LendEasy";
  const currency = process.env.NEXT_PUBLIC_CURRENCY || "PKR";
  
  let emailSubject = "";
  let emailHtml = "";
  let smsBody = "";

  switch (eventName) {
    case "registration":
      emailSubject = `Welcome to ${appName}!`;
      emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #1e40af;">Welcome ${fullName}!</h2>
          <p>Your registration is complete. Thank you for choosing ${appName} for your financial needs.</p>
          <p>Please log in to your dashboard to complete your profile and begin applying for loans.</p>
        </div>
      `;
      smsBody = `Welcome to ${appName}, ${fullName}! Your account has been verified successfully.`;
      break;

    case "application_submitted":
      const appNum = details.applicationNumber || "N/A";
      emailSubject = `Loan Application Submitted - ${appNum}`;
      emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #1e40af;">Application Received</h2>
          <p>Dear ${fullName},</p>
          <p>Your loan application <strong>${appNum}</strong> for <strong>${currency} ${details.amount?.toLocaleString()}</strong> has been submitted successfully.</p>
          <p>Our verification team is reviewing it. Next, please upload your KYC documents in your dashboard to proceed.</p>
        </div>
      `;
      smsBody = `LendEasy: Application ${appNum} of ${currency} ${details.amount?.toLocaleString()} submitted. Please upload KYC docs to proceed.`;
      break;

    case "kyc_approved":
      emailSubject = `KYC Verification Approved`;
      emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #22c55e;">KYC Approved</h2>
          <p>Dear ${fullName},</p>
          <p>Your identity and income verification documents (KYC) have been approved.</p>
          <p>The next step is to submit your collateral details to complete the application process.</p>
        </div>
      `;
      smsBody = `LendEasy: Your KYC documents have been verified and approved. Please submit collateral details.`;
      break;

    case "kyc_rejected":
      emailSubject = `KYC Verification Rejected`;
      emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #ef4444;">KYC Rejected</h2>
          <p>Dear ${fullName},</p>
          <p>We regret to inform you that your KYC verification was rejected for the following reason:</p>
          <blockquote style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 10px; margin: 15px 0;">
            ${details.reason || "Documents were unclear or invalid."}
          </blockquote>
          <p>Please log in to your dashboard and re-upload valid documents.</p>
        </div>
      `;
      smsBody = `LendEasy: Your KYC has been rejected: ${details.reason || "Invalid documents"}. Please re-submit on portal.`;
      break;

    case "loan_approved":
      const interestRate = details.interestRate || "N/A";
      const offeredAmount = details.offeredAmount || "N/A";
      emailSubject = `Congratulations! Loan Offer Approved`;
      emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #22c55e;">Loan Approved!</h2>
          <p>Dear ${fullName},</p>
          <p>We are pleased to offer you a loan of <strong>${currency} ${offeredAmount?.toLocaleString()}</strong> at an annual interest rate of <strong>${interestRate}%</strong>.</p>
          <p>Please review and sign your loan agreement on your dashboard to receive your funds.</p>
        </div>
      `;
      smsBody = `LendEasy: Congrats! Your loan of ${currency} ${offeredAmount?.toLocaleString()} is approved at ${interestRate}%. Log in to sign agreement.`;
      break;

    case "loan_rejected":
      emailSubject = `Loan Application Status`;
      emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #ef4444;">Application Rejected</h2>
          <p>Dear ${fullName},</p>
          <p>We regret to inform you that your loan application has been rejected for the following reason:</p>
          <blockquote style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 10px; margin: 15px 0;">
            ${details.reason || "Does not meet our current lending criteria."}
          </blockquote>
        </div>
      `;
      smsBody = `LendEasy: Your loan application was rejected: ${details.reason || "Does not meet criteria"}.`;
      break;

    case "disbursement_done":
      emailSubject = `Funds Disbursed - ${details.loanNumber}`;
      emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #1e40af;">Funds Disbursed</h2>
          <p>Dear ${fullName},</p>
          <p>Your loan amount of <strong>${currency} ${details.amount?.toLocaleString()}</strong> has been disbursed to your account.</p>
          <p><strong>Disbursement Reference:</strong> ${details.reference || "N/A"}</p>
          <p>Your EMI schedule starts on <strong>${details.firstDueDate || "N/A"}</strong>.</p>
        </div>
      `;
      smsBody = `LendEasy: Loan ${details.loanNumber} funds of ${currency} ${details.amount?.toLocaleString()} disbursed. Ref: ${details.reference}. First EMI due: ${details.firstDueDate}.`;
      break;

    case "emi_reminder":
      emailSubject = `Upcoming EMI Reminder - Due in 3 Days`;
      emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #1e40af;">EMI Payment Reminder</h2>
          <p>Dear ${fullName},</p>
          <p>This is a reminder that your EMI of <strong>${currency} ${details.amount?.toLocaleString()}</strong> is due on <strong>${details.dueDate}</strong>.</p>
          <p>Please log in and pay on time to avoid late payment penalties.</p>
        </div>
      `;
      smsBody = `LendEasy Reminder: Your EMI of ${currency} ${details.amount?.toLocaleString()} is due on ${details.dueDate}. Pay now to avoid late fees.`;
      break;

    case "emi_due":
      emailSubject = `EMI Payment Due Today`;
      emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 8px;">EMI Due Today</h2>
          <p>Dear ${fullName},</p>
          <p>Your EMI of <strong>${currency} ${details.amount?.toLocaleString()}</strong> is due today, <strong>${details.dueDate}</strong>.</p>
          <p>Please log in to your dashboard to pay immediately.</p>
        </div>
      `;
      smsBody = `LendEasy Urgent: Your EMI of ${currency} ${details.amount?.toLocaleString()} is due TODAY. Please pay immediately.`;
      break;

    case "emi_overdue":
      emailSubject = `URGENT: EMI Repayment Overdue`;
      emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #ef4444; border-bottom: 2px solid #ef4444; padding-bottom: 8px;">Overdue Notice</h2>
          <p>Dear ${fullName},</p>
          <p>Your EMI of <strong>${currency} ${details.amount?.toLocaleString()}</strong> due on <strong>${details.dueDate}</strong> is now overdue.</p>
          <p>A daily penalty of <strong>${details.penaltyRate || 2}%</strong> is being accrued on the outstanding amount.</p>
          <p>Current outstanding amount: <strong>${currency} ${(details.amount + (details.penalty || 0))?.toLocaleString()}</strong></p>
          <p>Please pay immediately to halt further penalties.</p>
        </div>
      `;
      smsBody = `LendEasy OVERDUE: Your EMI of ${currency} ${details.amount?.toLocaleString()} is overdue! Late fees of 2%/day apply. Pay immediately.`;
      break;

    case "loan_closed":
      emailSubject = `Congratulations! Your Loan is Fully Repaid`;
      emailHtml = `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #22c55e;">Loan Fully Repaid</h2>
          <p>Dear ${fullName},</p>
          <p>Congratulations! Your loan <strong>${details.loanNumber}</strong> has been fully repaid.</p>
          <p>Your No Objection Certificate (NOC) has been generated. You can download it in your dashboard.</p>
        </div>
      `;
      smsBody = `LendEasy: Congratulations! Your loan ${details.loanNumber} is fully closed. Download your NOC on dashboard.`;
      break;
  }

  // Trigger both sending processes asynchronously
  await Promise.all([
    sendMail({ to: email, subject: emailSubject, html: emailHtml }),
    sendSMS({ to: phone, body: smsBody }),
  ]);
}
