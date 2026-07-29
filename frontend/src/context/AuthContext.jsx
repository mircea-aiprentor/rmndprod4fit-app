import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);
const KEY = "pa_trainer";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : false;
    } catch {
      return false;
    }
  });

  const applyAuth = (trainer) => {
    localStorage.setItem(KEY, JSON.stringify(trainer));
    setUser(trainer);
  };

  const logout = () => {
    localStorage.removeItem(KEY);
    setUser(false);
  };

  const refreshUser = async () => {};

  return (
    <AuthContext.Provider value={{ user, setUser, applyAuth, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
