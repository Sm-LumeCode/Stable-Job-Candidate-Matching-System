import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type UserRole = "admin" | "recruiter" | "candidate";

export interface AuthUser {
  user_id: number;
  username: string;
  role: UserRole;
  access_token: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (username: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "stablehire_token";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      try {
        const parsed: AuthUser = JSON.parse(stored);
        setUser(parsed);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string, role: UserRole) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Login failed");
    }
    const authUser: AuthUser = {
      user_id: data.user_id,
      username: data.username,
      role: data.role as UserRole,
      access_token: data.access_token,
    };
    localStorage.setItem(TOKEN_KEY, JSON.stringify(authUser));
    setUser(authUser);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
