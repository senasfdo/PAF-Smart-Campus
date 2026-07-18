import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { notificationAPI } from "../../services/api";

const formatRole = (role = "") => {
  const value = role.toUpperCase();

  switch (value) {
    case "STUDENT":
      return "Student";
    case "LECTURER":
      return "Lecturer";
    case "TECHNICIAN":
      return "Technician";
    case "MANAGER":
      return "Manager";
    case "ADMIN":
      return "Admin";
    default:
      return "User";
  }
};

const getDisplayName = (user) => {
  return (
    user?.name ||
    user?.fullName ||
    user?.username ||
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "User")
  );
};

const getDisplayEmail = (user) => {
  return user?.email || "No email available";
};

const getInitials = (name = "User") => {
  const parts = name.trim().split(" ").filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
};

const BellIcon = () => (
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M15 17h5l-1.405-1.405C18.214 15.214 18 14.702 18 14.172V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.172c0 .53-.214 1.042-.595 1.423L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
    />
  </svg>
);

const extractUnreadCount = (data) => {
  if (typeof data === "number") return data;
  if (typeof data?.unreadCount === "number") return data.unreadCount;
  if (typeof data?.count === "number") return data.count;
  if (typeof data?.data === "number") return data.data;
  if (typeof data?.data?.unreadCount === "number") return data.data.unreadCount;
  if (typeof data?.data?.count === "number") return data.data.count;
  return 0;
};

const Navbar = () => {
  const location = useLocation();
  const profileRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const { isAuthenticated, role, user, logout, dashboardPath } = useAuth();

  const normalizedRole = (role || "").toUpperCase();
  const displayName = useMemo(() => getDisplayName(user), [user]);
  const displayEmail = useMemo(() => getDisplayEmail(user), [user]);
  const displayRole = useMemo(() => formatRole(role), [role]);
  const initials = useMemo(() => getInitials(displayName), [displayName]);

  const publicLinks = [
    { label: "Home", to: "/", exact: true },
    { label: "About Us", href: "/#about" },
    { label: "Facilities", to: "/facilities", exact: true },
    { label: "Contact Us", href: "/#contact" },
  ];

  const privateLinks = useMemo(() => {
    switch (normalizedRole) {
      case "STUDENT":
      case "LECTURER":
        return [
          { label: "Dashboard", to: dashboardPath || "/", exact: true },
          { label: "Facilities", to: "/facilities", exact: true },
          { label: "My Bookings", to: "/my-bookings" },
          { label: "My Tickets", to: "/my-tickets" },
        ];

      case "TECHNICIAN":
        return [
          { label: "Dashboard", to: dashboardPath || "/", exact: true },
          { label: "Tickets", to: "/technician/tickets" },
        ];

      case "MANAGER":
        return [
          { label: "Dashboard", to: dashboardPath || "/manager", exact: true },
          { label: "Tickets", to: "/manager/tickets" },
          { label: "Bookings", to: "/manager/bookings" },
          { label: "Announcements", to: "/manager/announcements" },
        ];

      case "ADMIN":
        return [
          { label: "Dashboard", to: dashboardPath || "/admin", exact: true },
          { label: "Tickets", to: "/admin/tickets" },
          { label: "Bookings", to: "/admin/bookings" },
          { label: "Facilities", to: "/admin/facilities" },
          { label: "Announcements", to: "/admin/announcements" },
          { label: "Users", to: "/admin/users" },
        ];

      default:
        return [];
    }
  }, [normalizedRole, dashboardPath]);

  const navLinks = isAuthenticated ? privateLinks : publicLinks;

  const profilePath = useMemo(() => {
    switch (normalizedRole) {
      case "STUDENT":
        return "/student/profile";
      case "LECTURER":
        return "/lecturer/profile";
      case "TECHNICIAN":
        return "/technician/profile";
      case "MANAGER":
        return "/manager/profile";
      case "ADMIN":
        return "/admin/profile";
      default:
        return "/profile";
    }
  }, [normalizedRole]);

  const dropdownLinks = useMemo(() => {
    switch (normalizedRole) {
      case "MANAGER":
        return [
          { label: "Dashboard", to: dashboardPath || "/manager" },
          { label: "Manage Tickets", to: "/manager/tickets" },
          { label: "Manage Bookings", to: "/manager/bookings" },
          { label: "Manage Announcements", to: "/manager/announcements" },
          { label: "Notifications", to: "/notifications" },
          { label: "My Profile", to: "/manager/profile" },
        ];

      case "ADMIN":
        return [
          { label: "Dashboard", to: dashboardPath || "/admin" },
          { label: "Manage Tickets", to: "/admin/tickets" },
          { label: "Manage Bookings", to: "/admin/bookings" },
          { label: "Manage Facilities", to: "/admin/facilities" },
          { label: "Manage Announcements", to: "/admin/announcements" },
          { label: "System Users", to: "/admin/users" },
          { label: "Notifications", to: "/notifications" },
          { label: "My Profile", to: "/admin/profile" },
        ];

      case "TECHNICIAN":
        return [
          { label: "Dashboard", to: dashboardPath || "/technician" },
          { label: "Tickets", to: "/technician/tickets" },
          { label: "Notifications", to: "/notifications" },
          { label: "My Profile", to: "/technician/profile" },
        ];

      default:
        return [
          { label: "Dashboard", to: dashboardPath || "/" },
          { label: "Notifications", to: "/notifications" },
          { label: "My Profile", to: profilePath },
        ];
    }
  }, [normalizedRole, dashboardPath, profilePath]);

  const fetchUnreadCount = async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await notificationAPI.getUnreadCount();
      setUnreadCount(extractUnreadCount(response));
    } catch {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 8000);

    const handleFocus = () => fetchUnreadCount();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchUnreadCount();
      }
    };

    const handleNotificationsChanged = () => fetchUnreadCount();

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("notifications:changed", handleNotificationsChanged);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(
        "notifications:changed",
        handleNotificationsChanged
      );
    };
  }, [isAuthenticated, location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (item) => {
    if (!item?.to) return false;
    if (item.exact) return location.pathname === item.to;
    return (
      location.pathname === item.to ||
      location.pathname.startsWith(`${item.to}/`)
    );
  };

  const desktopLinkClasses = (active) =>
    `relative text-[15px] font-semibold transition ${
      active ? "text-yellow-600" : "text-slate-700 hover:text-yellow-600"
    }`;

  const renderLink = (item, mobile = false) => {
    const active = item.to ? isActive(item) : false;

    const classes = mobile
      ? `block rounded-xl px-4 py-3 text-sm font-semibold transition ${
          active
            ? "bg-yellow-100 text-yellow-700"
            : "text-slate-700 hover:bg-slate-100"
        }`
      : desktopLinkClasses(active);

    if (item.href) {
      return (
        <a
          key={item.label}
          href={item.href}
          onClick={() => setMenuOpen(false)}
          className={classes}
        >
          {item.label}
        </a>
      );
    }

    return (
      <Link
        key={item.label}
        to={item.to}
        onClick={() => {
          setMenuOpen(false);
          setProfileOpen(false);
        }}
        className={classes}
      >
        {item.label}
        {!mobile && active && (
          <span className="absolute -bottom-3 left-0 h-[2px] w-full rounded bg-yellow-500"></span>
        )}
      </Link>
    );
  };

  const isNotificationsPage = location.pathname.startsWith("/notifications");

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <Link to="/" className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500 text-xl font-extrabold text-white shadow">
            SC
          </div>

          <div className="hidden sm:block">
            <p className="text-2xl font-extrabold leading-none text-slate-900">
              Smart Campus
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Campus Services Platform
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-10 md:flex">
          {navLinks.map((item) => renderLink(item))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <>
              <Link
                to="/notifications"
                className={`relative flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm transition ${
                  isNotificationsPage
                    ? "border-yellow-300 bg-yellow-50 text-yellow-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-yellow-300 hover:text-yellow-700"
                }`}
                title="Notifications"
              >
                <BellIcon />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-h-[22px] min-w-[22px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white shadow">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>

              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-yellow-300 hover:shadow"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-yellow-500 text-sm font-bold text-white">
                    {initials}
                  </div>

                  <div className="text-left">
                    <p className="max-w-[150px] truncate text-sm font-bold text-slate-900">
                      {displayName}
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      {displayRole}
                    </p>
                  </div>

                  <svg
                    className={`h-4 w-4 text-slate-500 transition ${
                      profileOpen ? "rotate-180" : ""
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500 text-sm font-bold text-white">
                          {initials}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {displayName}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {displayEmail}
                          </p>
                          <p className="mt-1 inline-block rounded-full bg-yellow-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-yellow-700">
                            {displayRole}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      {dropdownLinks.map((item) => (
                        <Link
                          key={item.label}
                          to={item.to}
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <span>
                            {item.label.includes("Dashboard")
                              ? "📊"
                              : item.label.includes("Tickets")
                              ? "🎫"
                              : item.label.includes("Bookings")
                              ? "📅"
                              : item.label.includes("Facilities")
                              ? "🏢"
                              : item.label.includes("Announcements")
                              ? "📢"
                              : item.label.includes("Users")
                              ? "👥"
                              : item.label.includes("Notifications")
                              ? "🔔"
                              : "👤"}
                          </span>
                          <span>{item.label}</span>
                        </Link>
                      ))}

                      <button
                        onClick={logout}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        <span>🚪</span>
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-full bg-yellow-500 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-yellow-600"
            >
              Login
            </Link>
          )}
        </div>

        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-slate-700 md:hidden"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-slate-200 bg-white px-6 py-4 md:hidden">
          <div className="space-y-2">
            {navLinks.map((item) => renderLink(item, true))}
          </div>

          <div className="mt-4 border-t border-slate-200 pt-4">
            {isAuthenticated ? (
              <div className="space-y-3">
                <Link
                  to="/notifications"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  <span className="flex items-center gap-3">
                    <span>🔔</span>
                    <span>Notifications</span>
                  </span>

                  {unreadCount > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-1 text-[11px] font-bold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500 text-sm font-bold text-white">
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {displayName}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {displayEmail}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-yellow-700">
                        {displayRole}
                      </p>
                    </div>
                  </div>
                </div>

                {dropdownLinks.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    {item.label}
                  </Link>
                ))}

                <button
                  onClick={logout}
                  className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="block w-full rounded-xl bg-yellow-500 px-4 py-3 text-center text-sm font-semibold text-white"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;