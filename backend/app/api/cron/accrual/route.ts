import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { EMISchedule } from "@/models/EMISchedule";
import { User } from "@/models/User";
import { sendSMS } from "@/lib/twilio";
import { AuditLog } from "@/models/AuditLog";
import { differenceInDays } from "date-fns";

export async function POST(req: Request) {
  try {
    // Basic authorization check for cron (if configured)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const today = new Date();
    
    // Find all outstanding EMIs where dueDate is in the past and status is not fully paid/waived
    const overdueEmis = await EMISchedule.find({
      dueDate: { $lt: today },
      status: { $nin: ["paid", "waived"] },
    }).populate("borrower", "fullName email phone");

    console.log(`[DAILY CRON] Found ${overdueEmis.length} potentially overdue EMIs.`);

    let penaltiesAccruedCount = 0;
    let remindersSentCount = 0;

    const penaltyRateDaily = Number(process.env.PENALTY_RATE_DAILY) || 2; // default 2%

    for (const emi of overdueEmis) {
      const daysOverdue = differenceInDays(today, emi.dueDate);
      if (daysOverdue <= 0) continue;

      const prevStatus = emi.status;
      const prevPenalty = emi.penaltyAmount;

      // 1. Mark as overdue
      emi.status = "overdue";

      // 2. Add penalty: 2% of totalEMI per day overdue
      const penaltyAmount = emi.totalEMI * (penaltyRateDaily / 100) * daysOverdue;
      emi.penaltyAmount = Math.round(penaltyAmount * 100) / 100;
      emi.penaltyReason = `Late payment penalty: ${penaltyRateDaily}% per day overdue (${daysOverdue} days)`;
      
      penaltiesAccruedCount++;

      // 3. Send SMS reminders on day 1, 3, and 7 overdue
      // Check if we need to send reminder
      let shouldSendReminder = false;
      let reminderDay = 0;

      if (daysOverdue === 1 && emi.reminderSentAt.length === 0) {
        shouldSendReminder = true;
        reminderDay = 1;
      } else if (daysOverdue === 3 && emi.reminderSentAt.length === 1) {
        shouldSendReminder = true;
        reminderDay = 3;
      } else if (daysOverdue === 7 && emi.reminderSentAt.length === 2) {
        shouldSendReminder = true;
        reminderDay = 7;
      }

      if (shouldSendReminder) {
        const borrower = emi.borrower as any;
        const totalAmount = emi.totalEMI + emi.penaltyAmount;

        const smsMessage = `URGENT LendEasy: Your EMI of PKR ${emi.totalEMI.toLocaleString()} is ${daysOverdue} day(s) overdue! Penalty accrued: PKR ${emi.penaltyAmount.toLocaleString()}. Total due: PKR ${totalAmount.toLocaleString()}. Please pay immediately.`;
        
        await sendSMS({
          to: borrower.phone,
          body: smsMessage,
        });

        emi.reminderSentAt.push(today);
        remindersSentCount++;
      }

      await emi.save();

      // Write Audit Log for status change and interest accrual
      if (prevStatus !== "overdue" || prevPenalty !== emi.penaltyAmount) {
        await AuditLog.create({
          action: "EMI_INTEREST_ACCRUED",
          entityType: "emi",
          entityId: emi._id,
          previousState: { status: prevStatus, penaltyAmount: prevPenalty },
          newState: { status: emi.status, penaltyAmount: emi.penaltyAmount, penaltyReason: emi.penaltyReason },
        });
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: overdueEmis.length,
      penaltiesAccrued: penaltiesAccruedCount,
      remindersSent: remindersSentCount,
    });
  } catch (error: any) {
    console.error("[CRON INTEREST-ACCRUAL ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process daily interest accrual" },
      { status: 500 }
    );
  }
}
