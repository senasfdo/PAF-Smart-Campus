import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { useAuth } from "../../context/AuthContext";
import { bookingAPI } from "../../services/api";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8084";

const normalizeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const getStatusClasses = (status = "") => {
  switch ((status || "").toUpperCase()) {
    case "PENDING":
      return "bg-yellow-100 text-yellow-700";
    case "APPROVED":
    case "CONFIRMED":
      return "bg-green-100 text-green-700";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    case "CANCELLED":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-blue-100 text-blue-700";
  }
};

const formatStatusLabel = (status = "") => {
  const value = (status || "").toUpperCase();
  if (value === "OUT_OF_SERVICE") return "Out of Service";
  return value.replaceAll("_", " ");
};

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
};

const getStatusCount = (bookings, targetStatuses) =>
  bookings.filter((booking) =>
    targetStatuses.includes((booking?.status || "").toUpperCase())
  ).length;

const getFacilityImage = (booking) => {
  const raw =
    booking?.facility?.imageUrl ||
    booking?.facility?.imageURL ||
    booking?.facility?.image_url ||
    booking?.facility?.photoUrl ||
    booking?.facility?.image ||
    booking?.imageUrl;

  if (!raw) return "";

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  if (raw.startsWith("/")) {
    return `${BACKEND_URL}${raw}`;
  }

  return `${BACKEND_URL}/${raw}`;
};

const getFacilityName = (booking) =>
  booking?.facility?.name ||
  booking?.facilityName ||
  booking?.facility?.facilityName ||
  "Facility";

const getFacilityType = (booking) =>
  booking?.facility?.type || booking?.facilityType || "Campus Facility";

const getFacilityLocation = (booking) =>
  booking?.facility?.location || booking?.location || "Campus";

const getAttendees = (booking) =>
  booking?.expectedAttendees ||
  booking?.attendees ||
  booking?.participantCount ||
  booking?.capacityRequested ||
  "N/A";

const getPurpose = (booking) =>
  booking?.purpose || booking?.description || "No purpose provided";

const getRequesterName = (booking) =>
  booking?.user?.name ||
  booking?.user?.fullName ||
  booking?.requestedBy?.name ||
  booking?.requestedBy?.fullName ||
  booking?.bookedBy?.name ||
  booking?.bookedBy?.fullName ||
  booking?.student?.name ||
  booking?.lecturer?.name ||
  booking?.requesterName ||
  "Not available";

const getRequesterEmail = (booking) =>
  booking?.user?.email ||
  booking?.requestedBy?.email ||
  booking?.bookedBy?.email ||
  booking?.student?.email ||
  booking?.lecturer?.email ||
  booking?.requesterEmail ||
  "Not available";

const getRequesterRole = (booking) =>
  booking?.user?.role ||
  booking?.requestedBy?.role ||
  booking?.bookedBy?.role ||
  booking?.requesterRole ||
  "USER";

const getReviewReason = (booking) =>
  booking?.rejectionReason ||
  booking?.reason ||
  booking?.reviewReason ||
  booking?.adminNote ||
  booking?.managerNote ||
  booking?.notes ||
  "";

const StatCard = ({ title, value, subtitle, valueClass = "text-slate-900" }) => (
  <div className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-slate-200">
    <p className="text-sm font-medium text-slate-500">{title}</p>
    <h3 className={`mt-2 text-3xl font-extrabold ${valueClass}`}>{value}</h3>
    <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
  </div>
);

const FilterButton = ({ active, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
      active
        ? "bg-slate-900 text-white shadow"
        : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
    }`}
  >
    {label}
  </button>
);

const EmptyState = ({ isAdmin, isManager }) => {
  const title = isAdmin || isManager ? "No booking records found" : "No bookings yet";
  const description =
    isAdmin || isManager
      ? "There are currently no booking requests available in this section. Once users submit new reservations, they will appear here."
      : "You have not made any facility reservations yet. Start by exploring available campus facilities and submit your first booking request.";

  return (
    <div className="overflow-hidden rounded-[32px] bg-white shadow-md ring-1 ring-slate-200">
      <div className="grid lg:grid-cols-[320px,1fr]">
        <div className="flex items-center justify-center bg-gradient-to-br from-yellow-50 via-white to-slate-50 p-10 lg:p-12">
          <div className="text-center">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-yellow-100 text-5xl shadow-sm">
              📅
            </div>
            <div className="mt-6 space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-600">
                Booking Status
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900">
                0 Records
              </h3>
            </div>
          </div>
        </div>

        <div className="p-8 lg:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
            Reservation Center
          </p>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900">{title}</h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            {description}
          </p>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-800">
              Nothing to review right now.
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              This section will automatically populate when new booking requests are submitted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AlertPopup = ({ type = "success", text, onClose }) => {
  if (!text) return null;

  const styles =
    type === "success"
      ? "border-green-200 bg-green-50 text-green-700"
      : "border-red-200 bg-red-50 text-red-700";

  const icon = type === "success" ? "✅" : "⚠️";

  return (
    <div
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl ${styles}`}
    >
      <div className="pt-0.5 text-lg">{icon}</div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {type === "success" ? "Success" : "Error"}
        </p>
        <p className="mt-1 text-sm leading-6">{text}</p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="rounded-lg px-2 py-1 text-sm font-bold transition hover:bg-black/5"
      >
        ✕
      </button>
    </div>
  );
};

const RejectModal = ({
  booking,
  rejectReason,
  setRejectReason,
  onCancel,
  onConfirm,
  working,
}) => {
  if (!booking) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-[26px] bg-white p-5 shadow-2xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-xl">
          ✖️
        </div>

        <h3 className="mt-4 text-xl font-extrabold text-slate-900">
          Reject Booking Request
        </h3>

        <p className="mt-2 text-sm leading-7 text-slate-600">
          Enter a reason for rejecting{" "}
          <span className="font-bold text-slate-900">
            {getFacilityName(booking)}
          </span>
          .
        </p>

        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={4}
          placeholder="Enter rejection reason..."
          className="mt-4 w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
        />

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={working}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={working}
            className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-70"
          >
            {working ? "Rejecting..." : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
};

const InfoCard = ({ title, children }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-sm font-bold text-slate-900">{title}</p>
    <div className="mt-3 space-y-3">{children}</div>
  </div>
);

const BookingDetailsModal = ({
  booking,
  isAdmin,
  isManager,
  onClose,
  onApprove,
  onOpenReject,
  working,
}) => {
  if (!booking) return null;

  const bookingId = booking?.id || booking?.bookingId || "N/A";
  const facilityName = getFacilityName(booking);
  const facilityType = getFacilityType(booking);
  const location = getFacilityLocation(booking);
  const attendees = getAttendees(booking);
  const purpose = getPurpose(booking);
  const imageUrl = getFacilityImage(booking);
  const status = booking?.status || "UNKNOWN";
  const startTime = booking?.startTime || booking?.bookingDate;
  const endTime = booking?.endTime;
  const createdAt = booking?.createdAt || booking?.createdDate;
  const requesterName = getRequesterName(booking);
  const requesterEmail = getRequesterEmail(booking);
  const requesterRole = getRequesterRole(booking);
  const reviewReason = getReviewReason(booking);

  const canReview = ["PENDING"].includes((status || "").toUpperCase());

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-5 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-yellow-400">
                Booking Details
              </p>
              <h2 className="mt-2 text-2xl font-extrabold">{facilityName}</h2>

              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${getStatusClasses(
                    status
                  )}`}
                >
                  {formatStatusLabel(status)}
                </span>
                <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase text-white">
                  {String(facilityType).replaceAll("_", " ")}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-5">
          <div className="grid gap-5 lg:grid-cols-[260px,1fr]">
            <div>
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
                <div className="flex h-75 items-center justify-center bg-slate-100 p-3">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={facilityName}
                      className="max-h-full w-full rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-6xl">
                      🏫
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Purpose
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  {purpose}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <InfoCard title="Requester Details">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Name
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {requesterName}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Email
                    </p>
                    <p className="mt-1 break-all text-sm font-bold text-slate-900">
                      {requesterEmail}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Role
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {String(requesterRole).replaceAll("_", " ")}
                    </p>
                  </div>
                </InfoCard>

                <InfoCard title="Booking Info">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Booking ID
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {bookingId}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Attendees
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {attendees}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Date
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {formatDate(startTime)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Time
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {endTime
                        ? `${formatTime(startTime)} - ${formatTime(endTime)}`
                        : formatTime(startTime)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Location
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {location}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Requested On
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      {formatDateTime(createdAt)}
                    </p>
                  </div>
                </InfoCard>
              </div>

              {(status || "").toUpperCase() === "REJECTED" && reviewReason && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                    Rejection Reason
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    {reviewReason}
                  </p>
                </div>
              )}

              {canReview && (isAdmin || isManager) && (
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => onApprove(bookingId)}
                    disabled={working}
                    className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-70"
                  >
                    {working ? "Processing..." : "Approve Booking"}
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenReject(booking)}
                    disabled={working}
                    className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-70"
                  >
                    Reject Booking
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ManageBookings = () => {
  const { isAuthenticated, isAdmin, isManager } = useAuth();

  const [scope, setScope] = useState("ALL");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const pageTitle = isAdmin
    ? "Booking Management"
    : "Booking Review Center";

  const pageDescription = isAdmin
    ? "Review all facility reservations, approve or reject requests, and monitor booking activity across the system."
    : "Review booking requests, approve valid reservations, and manage facility usage efficiently.";

  useEffect(() => {
    if (!message && !error) return;

    const timer = setTimeout(() => {
      setMessage("");
      setError("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [message, error]);

  const closeAlerts = () => {
    setMessage("");
    setError("");
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError("");

      let response;

      if (scope === "PENDING") {
        response = await bookingAPI.getPending();
      } else {
        if (isAdmin) {
          response = await bookingAPI.getAll();
        } else if (isManager) {
          try {
            response = await bookingAPI.getAll();
          } catch {
            response = await bookingAPI.getPending();
          }
        } else {
          response = [];
        }
      }

      const normalized = normalizeArray(response);

      const sorted = [...normalized].sort((a, b) => {
        const dateA = new Date(
          a?.startTime || a?.bookingDate || a?.createdAt || 0
        ).getTime();
        const dateB = new Date(
          b?.startTime || b?.bookingDate || b?.createdAt || 0
        ).getTime();
        return dateB - dateA;
      });

      setBookings(sorted);

      if (selectedBooking) {
        const selectedId = selectedBooking?.id || selectedBooking?.bookingId;
        const refreshed = sorted.find((item) => {
          const currentId = item?.id || item?.bookingId;
          return String(currentId) === String(selectedId);
        });

        if (refreshed) {
          setSelectedBooking(refreshed);
        } else {
          setSelectedBooking(null);
        }
      }
    } catch (err) {
      setError(err.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && (isAdmin || isManager)) {
      fetchBookings();
    }
  }, [isAuthenticated, isAdmin, isManager, scope]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const bookingId = String(booking?.id || booking?.bookingId || "").toLowerCase();
      const facilityName = getFacilityName(booking).toLowerCase();
      const requesterName = getRequesterName(booking).toLowerCase();
      const purpose = getPurpose(booking).toLowerCase();
      const status = (booking?.status || "").toUpperCase();

      const matchesSearch =
        !searchText.trim() ||
        bookingId.includes(searchText.toLowerCase()) ||
        facilityName.includes(searchText.toLowerCase()) ||
        requesterName.includes(searchText.toLowerCase()) ||
        purpose.includes(searchText.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchText, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: filteredBookings.length,
      pending: getStatusCount(filteredBookings, ["PENDING"]),
      approved: getStatusCount(filteredBookings, ["APPROVED", "CONFIRMED"]),
      rejected: getStatusCount(filteredBookings, ["REJECTED"]),
      cancelled: getStatusCount(filteredBookings, ["CANCELLED"]),
    };
  }, [filteredBookings]);

  const handleApproveBooking = async (id) => {
    try {
      setWorking(true);
      setError("");
      setMessage("");

      await bookingAPI.approve(id);
      setMessage("Booking approved successfully.");
      setSelectedBooking(null);
      await fetchBookings();
    } catch (err) {
      setError(err.message || "Failed to approve booking.");
    } finally {
      setWorking(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;

    if (!rejectReason.trim()) {
      setError("Please enter a reason before rejecting the booking.");
      return;
    }

    try {
      setWorking(true);
      setError("");
      setMessage("");

      const id = rejectTarget?.id || rejectTarget?.bookingId;
      await bookingAPI.reject(id, rejectReason.trim());

      setMessage("Booking rejected successfully.");
      setRejectTarget(null);
      setRejectReason("");
      setSelectedBooking(null);
      await fetchBookings();
    } catch (err) {
      setError(err.message || "Failed to reject booking.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="pointer-events-none fixed right-4 top-20 z-[120] flex w-full max-w-sm flex-col gap-3">
        {message && (
          <AlertPopup
            type="success"
            text={message}
            onClose={closeAlerts}
          />
        )}

        {error && (
          <AlertPopup
            type="error"
            text={error}
            onClose={closeAlerts}
          />
        )}
      </div>

      <section className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
            Booking Operations
          </p>
          <h1 className="text-4xl font-extrabold md:text-5xl">{pageTitle}</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
            {pageDescription}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <FilterButton
              active={scope === "ALL"}
              label="All Bookings"
              onClick={() => setScope("ALL")}
            />
            <FilterButton
              active={scope === "PENDING"}
              label="Pending Only"
              onClick={() => setScope("PENDING")}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-8 grid max-w-7xl gap-6 px-6 sm:grid-cols-2 xl:grid-cols-5 lg:px-10">
        <StatCard
          title="Visible Bookings"
          value={stats.total}
          subtitle="Based on current filters"
        />
        <StatCard
          title="Pending"
          value={stats.pending}
          subtitle="Waiting for review"
          valueClass="text-yellow-600"
        />
        <StatCard
          title="Approved"
          value={stats.approved}
          subtitle="Confirmed requests"
          valueClass="text-green-600"
        />
        <StatCard
          title="Rejected"
          value={stats.rejected}
          subtitle="Declined requests"
          valueClass="text-red-600"
        />
        <StatCard
          title="Cancelled"
          value={stats.cancelled}
          subtitle="Withdrawn bookings"
          valueClass="text-slate-700"
        />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div className="mb-6 rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Search Bookings
              </label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search by booking ID, facility, requester, or purpose"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
              >
                <option value="ALL">All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-md ring-1 ring-slate-200">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
            <p className="mt-4 text-slate-600">Loading bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <EmptyState isAdmin={isAdmin} isManager={isManager} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredBookings.map((booking, index) => {
              const bookingId =
                booking?.id || booking?.bookingId || `booking-${index}`;
              const facilityName = getFacilityName(booking);
              const facilityType = getFacilityType(booking);
              const location = getFacilityLocation(booking);
              const imageUrl = getFacilityImage(booking);
              const status = booking?.status || "UNKNOWN";
              const startTime = booking?.startTime || booking?.bookingDate;
              const requesterName = getRequesterName(booking);

              return (
                <button
                  key={bookingId}
                  type="button"
                  onClick={() => setSelectedBooking(booking)}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-md ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative h-40 bg-slate-100">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={facilityName}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-5xl">
                        🏫
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent"></div>

                    <div className="absolute left-3 top-3">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase shadow ${getStatusClasses(
                          status
                        )}`}
                      >
                        {formatStatusLabel(status)}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-yellow-300">
                        {String(facilityType).replaceAll("_", " ")}
                      </p>
                      <h3 className="mt-1 text-xl font-extrabold leading-tight">
                        {facilityName}
                      </h3>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="rounded-2xl bg-slate-50 p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Requester
                        </span>
                        <span className="text-right text-sm font-bold text-slate-900">
                          {requesterName}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between gap-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Date
                        </span>
                        <span className="text-right text-sm font-bold text-slate-900">
                          {formatDate(startTime)}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between gap-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Location
                        </span>
                        <span className="text-right text-sm font-bold text-slate-900">
                          {location}
                        </span>
                      </div>
                    </div>

                    <p className="mt-3 text-[11px] font-medium text-slate-400">
                      Booking ID: {bookingId}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <BookingDetailsModal
        booking={selectedBooking}
        isAdmin={isAdmin}
        isManager={isManager}
        onClose={() => setSelectedBooking(null)}
        onApprove={handleApproveBooking}
        onOpenReject={(booking) => {
          setRejectTarget(booking);
          setRejectReason("");
          setError("");
        }}
        working={working}
      />

      <RejectModal
        booking={rejectTarget}
        rejectReason={rejectReason}
        setRejectReason={setRejectReason}
        onCancel={() => {
          setRejectTarget(null);
          setRejectReason("");
        }}
        onConfirm={handleRejectConfirm}
        working={working}
      />

      <Footer />
    </div>
  );
};

export default ManageBookings;