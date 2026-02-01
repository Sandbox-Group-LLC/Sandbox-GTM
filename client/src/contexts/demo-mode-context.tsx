import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface DemoModeContextType {
  isDemoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(() => {
    const stored = localStorage.getItem("revenueDemoMode");
    return stored === "true";
  });

  useEffect(() => {
    localStorage.setItem("revenueDemoMode", isDemoMode.toString());
  }, [isDemoMode]);

  return (
    <DemoModeContext.Provider value={{ isDemoMode, setDemoMode: setIsDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (!context) {
    throw new Error("useDemoMode must be used within a DemoModeProvider");
  }
  return context;
}
