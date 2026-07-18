import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { useAuth } from "../../context/AuthContext";
import { bookingAPI, facilityAPI, ticketAPI } from "../../services/api";

const getSafeCount = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const pickFirstNumber = (obj, keys) => {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) {
      return getSafeCount(obj[key]);
    }
  }
  return 0;
};

const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  valueClass = "text-slate-900",
}) => (
  <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className={`mt-2 text-3xl font-extrabold ${valueClass}`}>{value}</h3>
        <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-100 text-2xl">
        {icon}
      </div>
    </div>
  </div>
);

const ActionCard = ({ title, description, icon, buttonLabel, onClick }) => (
  <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-lg">
    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-100 text-2xl">
      {icon}
    </div>

    <h3 className="text-xl font-extrabold text-slate-900">{title}</h3>
    <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>

    <button
      onClick={onClick}
      className="mt-6 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
    >
      {buttonLabel}
    </button>
  </div>
);

const PermissionItem = ({ text }) => (
  <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-sm">
      ✓
    </div>
    <p className="text-sm font-medium leading-7 text-slate-700">{text}</p>
  </div>
);

const OverviewCard = ({ title, text, badge }) => (
  <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
    <div className="flex items-start justify-between gap-3">
      <h3 className="text-xl font-extrabold text-slate-900">{title}</h3>
      {badge && (
        <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-yellow-700">
          {badge}
        </span>
      )}
    </div>
    <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
  </div>
);

const AdminDashboard = () => {
  const { isAdmin, isManager, user } = useAuth();
  const navigate = useNavigate();

  const [loadingStats, setLoadingStats] = useState(true);
  const [ticketStats, setTicketStats] = useState({});
  const [bookingStats, setBookingStats] = useState({});
  const [facilityCount, setFacilityCount] = useState(0);

  const displayName =
    user?.name ||
    user?.fullName ||
    user?.username ||
    user?.displayName ||
    "User";

  const roleLabel = isAdmin ? "Admin" : "Manager";
  const profilePath = isAdmin ? "/admin/profile" : "/manager/profile";

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoadingStats(true);

        const [ticketStatsRes, bookingStatsRes, facilitiesRes] =
          await Promise.all([
            ticketAPI.getStats().catch(() => ({})),
            bookingAPI.getStats().catch(() => ({})),
            facilityAPI.getAll().catch(() => []),
          ]);

        setTicketStats(ticketStatsRes || {});
        setBookingStats(bookingStatsRes || {});

        const facilitiesArray = Array.isArray(facilitiesRes)
          ? facilitiesRes
          : Array.isArray(facilitiesRes?.content)
          ? facilitiesRes.content
          : Array.isArray(facilitiesRes?.data)
          ? facilitiesRes.data
          : [];

        setFacilityCount(facilitiesArray.length);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchDashboardData();
  }, []);

  const derivedStats = useMemo(() => {
    const totalTickets = pickFirstNumber(ticketStats, ["totalTickets", "total"]);
    const openTickets =
      pickFirstNumber(ticketStats, ["open"]) +
      pickFirstNumber(ticketStats, ["inProgress"]);
    const resolvedTickets =
      pickFirstNumber(ticketStats, ["resolved"]) +
      pickFirstNumber(ticketStats, ["closed"]);

    const totalBookings = pickFirstNumber(bookingStats, [
      "totalBookings",
      "total",
      "totalRequests",
    ]);

    const pendingBookings = pickFirstNumber(bookingStats, [
      "pending",
      "pendingBookings",
      "pendingRequests",
    ]);

    return {
      totalTickets,
      openTickets,
      resolvedTickets,
      totalBookings,
      pendingBookings,
    };
  }, [ticketStats, bookingStats]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <section className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-yellow-400">
            Management Portal
          </p>

          <h1 className="text-4xl font-extrabold md:text-5xl">
            Welcome, {displayName}
          </h1>

          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
            Monitor campus operations, review service activity, and manage internal
            workflows through the {roleLabel.toLowerCase()} dashboard.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <button
              onClick={() => navigate(profilePath)}
              className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-yellow-600"
            >
              View My Profile
            </button>

            <button
              onClick={() => navigate("/facilities")}
              className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Open Facility Directory
            </button>

            <button
              onClick={() => navigate("/qr-check-in-center")}
              className="rounded-xl border border-yellow-400/40 bg-yellow-500/10 px-5 py-3 text-sm font-semibold text-yellow-300 transition hover:bg-yellow-500/20"
            >
              QR Check-In Center
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-8 grid max-w-7xl gap-5 px-6 sm:grid-cols-2 xl:grid-cols-5 lg:px-10">
        <StatCard
          title="Total Tickets"
          value={loadingStats ? "..." : derivedStats.totalTickets}
          subtitle="All support tickets"
          icon="🎫"
        />
        <StatCard
          title="Active Tickets"
          value={loadingStats ? "..." : derivedStats.openTickets}
          subtitle="Open + in progress"
          icon="🛠️"
          valueClass="text-yellow-600"
        />
        <StatCard
          title="Resolved Tickets"
          value={loadingStats ? "..." : derivedStats.resolvedTickets}
          subtitle="Resolved + closed"
          icon="✅"
          valueClass="text-green-600"
        />
        <StatCard
          title="Bookings"
          value={loadingStats ? "..." : derivedStats.totalBookings}
          subtitle="Total booking requests"
          icon="📅"
        />
        <StatCard
          title="Facilities"
          value={loadingStats ? "..." : facilityCount}
          subtitle="Registered facilities"
          icon="🏫"
        />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.2fr,0.8fr]">
          <div>
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-yellow-600">
                Quick Access
              </p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
                {roleLabel} Overview
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                Access the main operational areas and monitor system activity from here.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <ActionCard
                title="Facility Directory"
                description="View currently available facilities and check system-wide facility information."
                icon="🏢"
                buttonLabel="Open Facilities"
                onClick={() => navigate("/facilities")}
              />

              <ActionCard
                title="My Profile"
                description="Review your account information and role-based access from your profile page."
                icon="👤"
                buttonLabel="Open Profile"
                onClick={() => navigate(profilePath)}
              />

              <ActionCard
                title="QR Check-In Center"
                description="Verify approved facility bookings through QR scanning or token entry and complete user check-in."
                icon="📷"
                buttonLabel="Open Check-In"
                onClick={() => navigate("/qr-check-in-center")}
              />

              <OverviewCard
                title="Booking Operations"
                text="Booking review, approval, rejection, and QR-based booking check-in are available through the management workflow."
                badge="Core flow"
              />

              <OverviewCard
                title="Ticket Operations"
                text="Ticket monitoring, technician assignment, and issue handling are part of the management workflow."
                badge="Core flow"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-yellow-600">
                Access Scope
              </p>
              <h3 className="mt-2 text-2xl font-extrabold text-slate-900">
                {isAdmin ? "Administrator Permissions" : "Manager Permissions"}
              </h3>

              <div className="mt-5 space-y-3">
                <PermissionItem text="Approve or reject booking requests." />
                <PermissionItem text="Review ticket activity and assign technicians." />
                <PermissionItem text="Verify approved bookings through QR check-in." />
                <PermissionItem text="Monitor operational workflow across campus services." />
                {isAdmin && (
                  <>
                    <PermissionItem text="Create, edit, disable, and remove facilities." />
                    <PermissionItem text="Admin has broader system control than managers." />
                  </>
                )}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-yellow-600">
                Current Status
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Pending Bookings
                  </p>
                  <p className="mt-2 text-2xl font-extrabold text-slate-900">
                    {loadingStats ? "..." : derivedStats.pendingBookings}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Role
                  </p>
                  <p className="mt-2 text-2xl font-extrabold text-slate-900">
                    {roleLabel}
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate("/qr-check-in-center")}
                className="mt-5 w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black"
              >
                Go to QR Check-In Center
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AdminDashboard;