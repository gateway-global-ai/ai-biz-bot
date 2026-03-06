import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  adminKey: string | null;
  investorSession: string | null;
  investorName: string | null;
  isAdmin: boolean;
  isInvestor: boolean;
  loginAsAdmin: (key: string) => void;
  loginAsInvestor: (sessionToken: string, name: string) => void;
  logout: () => void;
  getAuthHeaders: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Use localStorage for persistence across browser sessions (24+ hours)
  const [adminKey, setAdminKey] = useState<string | null>(() => 
    localStorage.getItem("adminKey")
  );
  const [investorSession, setInvestorSession] = useState<string | null>(() => 
    localStorage.getItem("investorSession")
  );
  const [investorName, setInvestorName] = useState<string | null>(() => 
    localStorage.getItem("investorName")
  );

  const isAdmin = !!adminKey;
  const isInvestor = !!investorSession;

  const loginAsAdmin = (key: string) => {
    setAdminKey(key);
    localStorage.setItem("adminKey", key);
  };

  const loginAsInvestor = (sessionToken: string, name: string) => {
    setInvestorSession(sessionToken);
    setInvestorName(name);
    localStorage.setItem("investorSession", sessionToken);
    localStorage.setItem("investorName", name);
  };

  const logout = async () => {
    if (investorSession) {
      await fetch("/api/investor/logout", {
        method: "POST",
        headers: { "X-Investor-Session": investorSession }
      }).catch(() => {});
    }
    setAdminKey(null);
    setInvestorSession(null);
    setInvestorName(null);
    localStorage.removeItem("adminKey");
    localStorage.removeItem("investorSession");
    localStorage.removeItem("investorName");
  };

  const getAuthHeaders = (): Record<string, string> => {
    if (adminKey) {
      return { "X-Admin-Key": adminKey };
    }
    if (investorSession) {
      return { "X-Investor-Session": investorSession };
    }
    return {};
  };

  return (
    <AuthContext.Provider value={{
      adminKey,
      investorSession,
      investorName,
      isAdmin,
      isInvestor,
      loginAsAdmin,
      loginAsInvestor,
      logout,
      getAuthHeaders
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
