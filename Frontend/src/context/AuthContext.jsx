import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authAPI, getDashboardPathByRole } from "../services/api";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [role, setRole] = useState((localStorage.getItem("role") || "").toUpperCase());
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const clearSession = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    setToken("");
    setRole("");
    setUser(null);
  };

  const fetchUserProfile = async () => {
    try {
      const profile = await authAPI.getProfile();
      setUser(profile);
      localStorage.setItem("user", JSON.stringify(profile));

      const resolvedRole = (profile?.role || role || "").toUpperCase();
      if (resolvedRole) {
        setRole(resolvedRole);
        localStorage.setItem("role", resolvedRole);
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error.message);
      clearSession();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = () => {
    authAPI.googleLogin();
  };

  const handleOAuthCallback = (search = window.location.search) => {
    const result = authAPI.handleOAuthCallback(search);

    if (!result) return false;

    setToken(result.token);
    setRole(result.role);
    return true;
  };

  const logout = () => {
    clearSession();
    authAPI.logout();
  };

  const dashboardPath = getDashboardPathByRole(role);

  const value = useMemo(
    () => ({
      user,
      token,
      role,
      loading,
      isAuthenticated: Boolean(token),
      isAdmin: role === "ADMIN",
      isManager: role === "MANAGER",
      isTechnician: role === "TECHNICIAN",
      isLecturer: role === "LECTURER",
      isStudent: role === "STUDENT",
      dashboardPath,
      login,
      logout,
      handleOAuthCallback,
      refreshProfile: fetchUserProfile,
    }),
    [user, token, role, loading, dashboardPath]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};