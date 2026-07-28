import { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = loading, false = anon, object = user
  const token = localStorage.getItem("pa_token");

  useEffect(() => {
    if (!token) {
      setUser(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem("pa_token");
        setUser(false);
      });
  }, [token]);

  const applyAuth = (data) => {
    localStorage.setItem("pa_token", data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("pa_token");
    setUser(false);
  };

  const refreshUser = async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data.user);
    } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{ user, setUser, applyAuth, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
