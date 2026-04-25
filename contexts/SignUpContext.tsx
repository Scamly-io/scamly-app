import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type SignUpData = {
  email: string;
  password: string;
  firstName: string;
  /** DD/MM/YYYY while collecting; parsed on final sign-up */
  dob: string;
  country: string;
  gender: string;
  referralSource: string;
};

type SignUpContextType = {
  signUpData: SignUpData;
  updateSignUpData: (data: Partial<SignUpData>) => void;
  resetSignUpData: () => void;
};

const initialData: SignUpData = {
  email: "",
  password: "",
  firstName: "",
  dob: "",
  country: "",
  gender: "",
  referralSource: "",
};

const SignUpContext = createContext<SignUpContextType | undefined>(undefined);

export function SignUpProvider({ children }: { children: ReactNode }) {
  const [signUpData, setSignUpData] = useState<SignUpData>(initialData);

  const updateSignUpData = useCallback((data: Partial<SignUpData>) => {
    setSignUpData((prev) => ({ ...prev, ...data }));
  }, []);

  const resetSignUpData = useCallback(() => {
    setSignUpData(initialData);
  }, []);

  return (
    <SignUpContext.Provider value={{ signUpData, updateSignUpData, resetSignUpData }}>
      {children}
    </SignUpContext.Provider>
  );
}

export function useSignUp(): SignUpContextType {
  const context = useContext(SignUpContext);
  if (!context) {
    throw new Error("useSignUp must be used within a SignUpProvider");
  }
  return context;
}
