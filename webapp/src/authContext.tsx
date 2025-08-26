import { createContext, useContext, useState } from 'react';

export type User = { id: number; nickname: string; email: string };

type SetAuthArg = { user: User | null; token: string | null };

type AuthContextValue = {
  user: User | null;
  token: string | null;
  setAuth: (a: SetAuthArg) => void;
  updateUser: (patch: Partial<User>) => void;
  logout: () => void;
};

const STORAGE_USER = 'user';
const STORAGE_TOKEN = 'token';

const AuthCtx = createContext<AuthContextValue>({
  user: null,
  token: null,
  setAuth: () => {},
  updateUser: () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_USER);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_TOKEN);
    } catch {
      return null;
    }
  });

  const setAuth = ({ user, token }: SetAuthArg) => {
    setUser(user);
    setToken(token);

    if (user && token) {
      localStorage.setItem(STORAGE_USER, JSON.stringify(user));
      localStorage.setItem(STORAGE_TOKEN, token);
    } else {
      localStorage.removeItem(STORAGE_USER);
      localStorage.removeItem(STORAGE_TOKEN);
    }
  };

  const updateUser = (patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_USER, JSON.stringify(next));
      return next;
    });
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_USER);
    localStorage.removeItem(STORAGE_TOKEN);
  };

  return (
    <AuthCtx.Provider value={{ user, token, setAuth, updateUser, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
