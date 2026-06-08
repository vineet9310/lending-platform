export interface EMIRow {
  emiNumber: number;
  dueDate: Date;
  outstandingPrincipal: number; // Opening balance
  principalComponent: number;
  interestComponent: number;
  totalEMI: number;
  closingBalance: number;
}

export interface EMICalculatorResult {
  emiAmount: number;
  totalPayable: number;
  totalInterest: number;
  schedule: EMIRow[];
}

/**
 * Calculates loan repayments and generates full amortization schedule.
 * Support Flat Rate and Reducing Balance. For compound interest, we calculate
 * reducing balance with periodic compounding where applicable.
 */
export function calculateEMI(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  interestType: 'flat' | 'reducing_balance' | 'compound' | 'interest_only' = 'reducing_balance',
  startDate: Date = new Date()
): EMICalculatorResult {
  if (principal <= 0 || tenureMonths <= 0) {
    return { emiAmount: 0, totalPayable: 0, totalInterest: 0, schedule: [] };
  }

  const annualRatePercent = annualRate / 100;
  const monthlyRate = annualRatePercent / 12;

  let emiAmount = 0;
  let totalPayable = 0;
  let totalInterest = 0;
  const schedule: EMIRow[] = [];

  if (interestType === 'interest_only') {
    // Interest-Only: pay only interest monthly, principal paid at the end
    const monthlyInterest = principal * monthlyRate;
    totalInterest = monthlyInterest * tenureMonths;
    totalPayable = principal + totalInterest;
    emiAmount = monthlyInterest; // Est. monthly is just the interest

    for (let i = 1; i <= tenureMonths; i++) {
      const nextDueDate = new Date(startDate);
      nextDueDate.setMonth(startDate.getMonth() + i);

      const isLastMonth = i === tenureMonths;
      const principalPart = isLastMonth ? principal : 0;
      const totalEMIPart = monthlyInterest + principalPart;
      const closing = isLastMonth ? 0 : principal;

      schedule.push({
        emiNumber: i,
        dueDate: nextDueDate,
        outstandingPrincipal: Math.round(principal * 100) / 100,
        principalComponent: Math.round(principalPart * 100) / 100,
        interestComponent: Math.round(monthlyInterest * 100) / 100,
        totalEMI: Math.round(totalEMIPart * 100) / 100,
        closingBalance: Math.round(closing * 100) / 100,
      });
    }
  } else if (interestType === 'flat') {
    // Flat Rate
    const monthlyInterest = (principal * annualRate) / 12 / 100;
    totalInterest = monthlyInterest * tenureMonths;
    totalPayable = principal + totalInterest;
    emiAmount = totalPayable / tenureMonths;

    let outstanding = principal;
    const principalPerMonth = principal / tenureMonths;

    for (let i = 1; i <= tenureMonths; i++) {
      const nextDueDate = new Date(startDate);
      nextDueDate.setMonth(startDate.getMonth() + i);

      const closing = outstanding - principalPerMonth;
      schedule.push({
        emiNumber: i,
        dueDate: nextDueDate,
        outstandingPrincipal: Math.round(outstanding * 100) / 100,
        principalComponent: Math.round(principalPerMonth * 100) / 100,
        interestComponent: Math.round(monthlyInterest * 100) / 100,
        totalEMI: Math.round(emiAmount * 100) / 100,
        closingBalance: Math.max(0, Math.round(closing * 100) / 100),
      });
      outstanding = closing;
    }
  } else {
    // Reducing Balance (Standard) / Compound (reducing balance with monthly compounding)
    // For reducing balance, EMI is calculated using:
    // EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
    if (annualRate === 0) {
      emiAmount = principal / tenureMonths;
      totalPayable = principal;
      totalInterest = 0;

      let outstanding = principal;
      const principalPerMonth = principal / tenureMonths;

      for (let i = 1; i <= tenureMonths; i++) {
        const nextDueDate = new Date(startDate);
        nextDueDate.setMonth(startDate.getMonth() + i);
        const closing = outstanding - principalPerMonth;

        schedule.push({
          emiNumber: i,
          dueDate: nextDueDate,
          outstandingPrincipal: Math.round(outstanding * 100) / 100,
          principalComponent: Math.round(principalPerMonth * 100) / 100,
          interestComponent: 0,
          totalEMI: Math.round(emiAmount * 100) / 100,
          closingBalance: Math.max(0, Math.round(closing * 100) / 100),
        });
        outstanding = closing;
      }
    } else {
      emiAmount =
        (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
        (Math.pow(1 + monthlyRate, tenureMonths) - 1);

      totalPayable = emiAmount * tenureMonths;
      totalInterest = totalPayable - principal;

      let outstanding = principal;

      for (let i = 1; i <= tenureMonths; i++) {
        const nextDueDate = new Date(startDate);
        nextDueDate.setMonth(startDate.getMonth() + i);

        const interestPart = outstanding * monthlyRate;
        const principalPart = emiAmount - interestPart;
        const closing = outstanding - principalPart;

        schedule.push({
          emiNumber: i,
          dueDate: nextDueDate,
          outstandingPrincipal: Math.round(outstanding * 100) / 100,
          principalComponent: Math.round(principalPart * 100) / 100,
          interestComponent: Math.round(interestPart * 100) / 100,
          totalEMI: Math.round(emiAmount * 100) / 100,
          closingBalance: Math.max(0, Math.round(closing * 100) / 100),
        });
        outstanding = closing;
      }
    }
  }

  return {
    emiAmount: Math.round(emiAmount * 100) / 100,
    totalPayable: Math.round(totalPayable * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    schedule,
  };
}
