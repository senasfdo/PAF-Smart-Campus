import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { useAuth } from "../../context/AuthContext";
import { ticketAPI } from "../../services/api";

const normalizeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const SummaryCard = ({ title, value, icon, valueClass = "text-slate-900" }) => (
  <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-200">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className={`mt-2 text-3xl font-extrabold ${valueClass}`}>{value}</h3>
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-100 text-xl">
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

const TechnicianDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const displayName =
    user?.name ||
    user?.fullName ||
    user?.username ||
    user?.displayName ||
    "Technician";

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const response = await ticketAPI.getAssignedToMe().catch(() => []);
        setTickets(normalizeArray(response));
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  const stats = useMemo(() => {
    const total = tickets.length;
    const inProgress = tickets.filter(
      (ticket) => (ticket?.status || "").toUpperCase() === "IN_PROGRESS"
    ).length;
    const resolved = tickets.filter(
      (ticket) => (ticket?.status || "").toUpperCase() === "RESOLVED"
    ).length;
    const openAssigned = tickets.filter(
      (ticket) => (ticket?.status || "").toUpperCase() === "OPEN"
    ).length;

    return { total, inProgress, resolved, openAssigned };
  }, [tickets]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <section className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-yellow-400">
            Technician Portal
          </p>
          <h1 className="text-4xl font-extrabold md:text-5xl">
            Welcome, {displayName}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
            Review your assigned support issues, update ticket progress, resolve
            campus service problems efficiently, and verify approved booking
            check-ins.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <button
              onClick={() => navigate("/technician/tickets")}
              className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-yellow-600"
            >
              Open My Tickets
            </button>

            <button
              onClick={() => navigate("/technician/profile")}
              className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              View My Profile
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

      <section className="mx-auto -mt-8 grid max-w-7xl gap-5 px-6 sm:grid-cols-2 xl:grid-cols-4 lg:px-10">
        <SummaryCard
          title="Assigned Tickets"
          value={loading ? "..." : stats.total}
          icon="🎫"
        />
        <SummaryCard
          title="In Progress"
          value={loading ? "..." : stats.inProgress}
          icon="🛠️"
          valueClass="text-yellow-600"
        />
        <SummaryCard
          title="Resolved"
          value={loading ? "..." : stats.resolved}
          icon="✅"
          valueClass="text-green-600"
        />
        <SummaryCard
          title="Open Assigned"
          value={loading ? "..." : stats.openAssigned}
          icon="📌"
          valueClass="text-blue-600"
        />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <ActionCard
            title="My Assigned Tickets"
            description="Open your assigned tickets, view full issue details, update status, and resolve tickets with notes."
            icon="🎫"
            buttonLabel="Open Tickets"
            onClick={() => navigate("/technician/tickets")}
          />

          <ActionCard
            title="My Profile"
            description="Review your technician account details and role-based access information."
            icon="👤"
            buttonLabel="Open Profile"
            onClick={() => navigate("/technician/profile")}
          />

          <ActionCard
            title="QR Check-In Center"
            description="Verify approved facility bookings through QR scanning or manual token entry and complete check-in."
            icon="📷"
            buttonLabel="Open Check-In"
            onClick={() => navigate("/qr-check-in-center")}
          />
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default TechnicianDashboard;