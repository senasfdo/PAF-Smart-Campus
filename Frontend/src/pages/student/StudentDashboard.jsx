import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { useAuth } from "../../context/AuthContext";
import { bookingAPI, ticketAPI } from "../../services/api";

const normalizeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
};

const getBookingStatusClasses = (status) => {
  const value = (status || "").toUpperCase();

  switch (value) {
    case "APPROVED":
    case "CONFIRMED":
      return "bg-green-100 text-green-700";
    case "PENDING":
      return "bg-yellow-100 text-yellow-700";
    case "REJECTED":
    case "CANCELLED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const getTicketStatusClasses = (status) => {
  const value = (status || "").toUpperCase();

  switch (value) {
    case "OPEN":
      return "bg-blue-100 text-blue-700";
    case "IN_PROGRESS":
      return "bg-yellow-100 text-yellow-700";
    case "RESOLVED":
    case "CLOSED":
      return "bg-green-100 text-green-700";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const StatCard = ({ title, value, subtitle }) => (
  <div className="rounded-3xl bg-white p-6 shadow-sm">
    <p className="text-sm font-medium text-slate-500">{title}</p>
    <h3 className="mt-2 text-3xl font-extrabold text-slate-900">{value}</h3>
    <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
  </div>
);

const StudentDashboard = () => {
  const { user, role } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const displayName =
    user?.name ||
    user?.fullName ||
    user?.username ||
    (user?.email ? user.email.split("@")[0] : "User");

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const [bookingsRes, ticketsRes] = await Promise.all([
        bookingAPI.getMyBookings(),
        ticketAPI.getMyTickets(),
      ]);

      const normalizedBookings = normalizeArray(bookingsRes);
      const normalizedTickets = normalizeArray(ticketsRes);

      const sortedBookings = [...normalizedBookings].sort((a, b) => {
        const dateA = new Date(
          a?.startTime || a?.bookingDate || a?.createdAt || 0
        ).getTime();
        const dateB = new Date(
          b?.startTime || b?.bookingDate || b?.createdAt || 0
        ).getTime();
        return dateB - dateA;
      });

      const sortedTickets = [...normalizedTickets].sort((a, b) => {
        const dateA = new Date(a?.createdAt || a?.createdDate || 0).getTime();
        const dateB = new Date(b?.createdAt || b?.createdDate || 0).getTime();
        return dateB - dateA;
      });

      setBookings(sortedBookings);
      setTickets(sortedTickets);
    } catch (err) {
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();

    const upcomingBookings = bookings.filter((booking) => {
      const start = new Date(
        booking?.startTime || booking?.bookingDate || 0
      ).getTime();
      return start > now.getTime();
    }).length;

    const pendingBookings = bookings.filter(
      (booking) => (booking?.status || "").toUpperCase() === "PENDING"
    ).length;

    const openTickets = tickets.filter((ticket) =>
      ["OPEN", "IN_PROGRESS"].includes((ticket?.status || "").toUpperCase())
    ).length;

    return {
      totalBookings: bookings.length,
      upcomingBookings,
      pendingBookings,
      totalTickets: tickets.length,
      openTickets,
    };
  }, [bookings, tickets]);

  const recentBookings = bookings.slice(0, 4);
  const recentTickets = tickets.slice(0, 4);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
            {role || "User"} Dashboard
          </p>
          <h1 className="text-4xl font-extrabold md:text-5xl">
            Welcome back, {displayName}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-300 md:text-lg">
            Manage your campus services, monitor bookings, and track support
            requests from one professional dashboard.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/facilities"
              className="rounded-2xl bg-yellow-500 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-yellow-600"
            >
              Explore Facilities
            </Link>

            <Link
              to="/my-bookings"
              className="rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              View My Bookings
            </Link>

            <Link
              to="/my-tickets"
              className="rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              View My Tickets
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-8 grid max-w-7xl gap-6 px-6 lg:grid-cols-5 lg:px-10">
        <StatCard
          title="Total Bookings"
          value={stats.totalBookings}
          subtitle="All your submitted bookings"
        />
        <StatCard
          title="Upcoming Bookings"
          value={stats.upcomingBookings}
          subtitle="Future reservations"
        />
        <StatCard
          title="Pending Bookings"
          value={stats.pendingBookings}
          subtitle="Waiting for approval"
        />
        <StatCard
          title="Total Tickets"
          value={stats.totalTickets}
          subtitle="Support requests created"
        />
        <StatCard
          title="Open Tickets"
          value={stats.openTickets}
          subtitle="Still being handled"
        />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        {loading ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
            <p className="mt-4 text-slate-600">Loading dashboard...</p>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
            <p className="text-lg font-bold text-red-700">
              Failed to load dashboard
            </p>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="mt-4 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">
                  Recent Bookings
                </h2>
                <Link
                  to="/my-bookings"
                  className="text-sm font-semibold text-yellow-600 hover:text-yellow-700"
                >
                  View All
                </Link>
              </div>

              {recentBookings.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-8 text-center">
                  <p className="text-slate-600">No bookings yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentBookings.map((booking, index) => {
                    const id = booking?.id || booking?.bookingId || `booking-${index}`;
                    const facilityName =
                      booking?.facilityName ||
                      booking?.facility?.name ||
                      booking?.facility?.facilityName ||
                      "Facility";
                    const startTime =
                      booking?.startTime || booking?.bookingDate || booking?.createdAt;
                    const status = booking?.status || "N/A";

                    return (
                      <div
                        key={id}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-bold text-slate-900">
                              {facilityName}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {formatDateTime(startTime)}
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${getBookingStatusClasses(
                              status
                            )}`}
                          >
                            {status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900">
                  Recent Tickets
                </h2>
                <Link
                  to="/my-tickets"
                  className="text-sm font-semibold text-yellow-600 hover:text-yellow-700"
                >
                  View All
                </Link>
              </div>

              {recentTickets.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-8 text-center">
                  <p className="text-slate-600">No tickets yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentTickets.map((ticket, index) => {
                    const id = ticket?.id || ticket?.ticketId || `ticket-${index}`;
                    const title = ticket?.title || ticket?.subject || "Untitled Ticket";
                    const createdAt = ticket?.createdAt || ticket?.createdDate;
                    const status = ticket?.status || "N/A";

                    return (
                      <div
                        key={id}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-bold text-slate-900">
                              {title}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {formatDateTime(createdAt)}
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${getTicketStatusClasses(
                              status
                            )}`}
                          >
                            {status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14 lg:px-10">
        <div className="grid gap-6 md:grid-cols-3">
          <Link
            to="/facilities"
            className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-100 text-2xl">
              🏫
            </div>
            <h3 className="text-xl font-bold text-slate-900">Browse Facilities</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Explore available campus facilities and view details before booking.
            </p>
          </Link>

          <Link
            to="/my-bookings"
            className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
              📅
            </div>
            <h3 className="text-xl font-bold text-slate-900">Manage Bookings</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Track pending, approved, or cancelled bookings in one place.
            </p>
          </Link>

          <Link
            to="/my-tickets"
            className="rounded-3xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-2xl">
              🎫
            </div>
            <h3 className="text-xl font-bold text-slate-900">Support Tickets</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              View support issues and monitor progress from open to resolved.
            </p>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default StudentDashboard;