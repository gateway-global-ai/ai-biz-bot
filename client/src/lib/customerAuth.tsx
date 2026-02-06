import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface CustomerUser {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  plan: string;
  planStartedAt: string | null;
}

interface CustomerAuthContextType {
  user: CustomerUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: CustomerUser) => void;
  logout: () => Promise<void>;
  checkSession: () => Promise<boolean>;
  updateUser: (user: CustomerUser) => void;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

const CUSTOMER_TOKEN_KEY = "gateway_customer_token";

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = (newToken: string, newUser: CustomerUser) => {
    localStorage.setItem(CUSTOMER_TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    const storedToken = token || localStorage.getItem(CUSTOMER_TOKEN_KEY);
    if (storedToken) {
      try {
        await fetch("/api/customer/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });
      } catch (e) {
        console.error("Customer logout error:", e);
      }
    }
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const updateUser = (newUser: CustomerUser) => {
    setUser(newUser);
  };

  const checkSession = async (): Promise<boolean> => {
    const storedToken = localStorage.getItem(CUSTOMER_TOKEN_KEY);
    if (!storedToken) {
      setIsLoading(false);
      return false;
    }

    try {
      const response = await fetch("/api/customer/session", {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.valid && data.user) {
          setToken(storedToken);
          setUser(data.user);
          setIsLoading(false);
          return true;
        }
      }

      localStorage.removeItem(CUSTOMER_TOKEN_KEY);
      setToken(null);
      setUser(null);
      setIsLoading(false);
      return false;
    } catch (e) {
      console.error("Customer session check error:", e);
      setIsLoading(false);
      return false;
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  return (
    <CustomerAuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        checkSession,
        updateUser,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error("useCustomerAuth must be used within a CustomerAuthProvider");
  }
  return context;
}
