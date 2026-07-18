import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const DashboardLayout = ({ children }) => {
  const location = useLocation();
  const { role, user, logout } = useAuth();

  const navByRole = {
    STUDENT: [
      { label: "Dashboard", to: "/student" },
      { label: "Facilities", to: "/facilities" },
      { label: "My Bookings", to: "/my-bookings" },
      { label: "My Tickets", to: "/my-tickets" },
      { label: "Notifications", to: "/notifications" },
    ],
    LECTURER: [
      { label: "Dashboard", to: "/lecturer" },
      { label: "Facilities", to: "/facilities" },
      { label: "My Bookings", to: "/my-bookings" },
      { label: "My Tickets", to: "/my-tickets" },
      { label: "Notifications", to: "/notifications" },
    ],
    TECHNICIAN: [
      { label: "Dashboard", to: "/technician" },
      { label: "Tickets", to: "/technician/tickets" },
      { label: "Notifications", to: "/notifications" },
    ],
    MANAGER: [
      { label: "Dashboard", to: "/manager" },
      { label: "Bookings", to: "/manage-bookings" },
      { label: "Tickets", to: "/manage-tickets" },
      { label: "Facilities", to: "/facilities" },
      { label: "Notifications", to: "/notifications" },
    ],
    ADMIN: [
      { label: "Dashboard", to: "/admin" },
      { label: "Facilities", to: "/admin/facilities" },
      { label: "Bookings", to: "/manage-bookings" },
      { label: "Tickets", to: "/manage-tickets" },
      { label: "Notifications", to: "/notifications" },
    ],
  };

  const items = navByRole[(role || "").toUpperCase()] || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-gray-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-gray-200 px-6 py-5">
            <h1 className="text-xl font-bold text-gray-900">Smart Campus</h1>
            <p className="mt-1 text-sm text-gray-500">{role || "User"} Panel</p>
          </div>

          <div className="flex-1 px-4 py-6">
            <nav className="space-y-2">
              {items.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-yellow-500 text-white shadow"
                        : "text-gray-700 hover:bg-yellow-50 hover:text-yellow-700"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-gray-200 px-6 py-4">
            <div className="mb-3">
              <p className="text-sm font-semibold text-gray-900">{user?.name || "User"}</p>
              <p className="text-xs text-gray-500">{user?.email || "No email"}</p>
            </div>
            <button
              onClick={logout}
              className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black"
            >
              Logout
            </button>
          </div>
        </aside>

        <main className="flex-1">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;