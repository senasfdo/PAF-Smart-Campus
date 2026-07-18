import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const RoleRoute = ({ allowedRoles = [], children }) => {
  const { role, loading, dashboardPath } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
      </div>
    );
  }

  const normalizedRole = (role || "").toUpperCase();
  const canAccess = allowedRoles.map((r) => r.toUpperCase()).includes(normalizedRole);

  if (!canAccess) {
    return <Navigate to={dashboardPath || "/"} replace />;
  }

  return children || <Outlet />;
};

export default RoleRoute;