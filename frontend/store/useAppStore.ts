import { create } from "zustand";

interface UserState {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AppStore {
  user: UserState | null;
  setUser: (user: UserState | null) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  
  // Loan application multi-step wizard state
  wizardStep: number;
  setWizardStep: (step: number) => void;
  wizardData: any;
  updateWizardData: (data: any) => void;
  resetWizard: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  theme: "light",
  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === "light" ? "dark" : "light";
      if (typeof window !== "undefined") {
        document.documentElement.classList.toggle("dark", nextTheme === "dark");
      }
      return { theme: nextTheme };
    }),

  // Wizard
  wizardStep: 1,
  setWizardStep: (wizardStep) => set({ wizardStep }),
  wizardData: {
    amountRequested: "" as any,
    tenureMonths: "" as any,
    purpose: "",
    purposeDetail: "",
    employmentType: "",
    monthlyIncome: "" as any,
    existingLoans: "" as any,
    interestType: "",
    // KYC
    identityDocType: "",
    identityDocNumber: "",
    identityDocExpiryDate: "",
    addressDocType: "",
    addressDocIssuedDate: "",
    incomeDocType: "",
    // Collateral
    collateralType: "",
    collateralDescription: "",
    collateralValue: "" as any,
    collateralLocation: "",
    collateralRegistrationNumber: "",
  },
  updateWizardData: (data) =>
    set((state) => ({
      wizardData: { ...state.wizardData, ...data },
    })),
  resetWizard: () =>
    set({
      wizardStep: 1,
      wizardData: {
        amountRequested: "" as any,
        tenureMonths: "" as any,
        purpose: "",
        purposeDetail: "",
        employmentType: "",
        monthlyIncome: "" as any,
        existingLoans: "" as any,
        interestType: "",
        identityDocType: "",
        identityDocNumber: "",
        identityDocExpiryDate: "",
        addressDocType: "",
        addressDocIssuedDate: "",
        incomeDocType: "",
        collateralType: "",
        collateralDescription: "",
        collateralValue: "" as any,
        collateralLocation: "",
        collateralRegistrationNumber: "",
      },
    }),
}));
