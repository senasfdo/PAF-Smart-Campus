import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { useAuth } from "../../context/AuthContext";
import { bookingAPI } from "../../services/api";
import BookingDetailsModal from "../../components/BookingDetailsModal";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8084";

const normalizeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const formatStatusLabel = (status = "") =>
  String(status || "UNKNOWN").replaceAll("_", " ");

const getStatusClasses = (status = "") => {
  switch (status.toUpperCase()) {
    case "PENDING":
      return "bg-yellow-100 text-yellow-700";
    case "APPROVED":
    case "CONFIRMED":
      return "bg-green-100 text-green-700";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    case "CANCELLED":
      return "bg-slate-200 text-slate-600";
    default:
      return "bg-blue-100 text-blue-700";
  }
};

const getStatusCount = (bookings, targetStatuses) =>
  bookings.filter((booking) =>
    targetStatuses.includes((booking?.status || "").toUpperCase())
  ).length;

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

const getFacilityImage = (booking) => {
  const raw =
    booking?.facility?.imageUrl ||
    booking?.facility?.imageURL ||
    booking?.facility?.image_url ||
    booking?.facility?.photoUrl ||
    booking?.facility?.image;

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
  "N/A";

const getPurpose = (booking) =>
  booking?.purpose || booking?.description || "No purpose provided";

const toDateInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const toTimeInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
};

const combineDateAndTimeToApiDateTime = (date, time) => {
  if (!date || !time) return "";
  return `${date}T${time}:00`;
};

const StatCard = ({
  title,
  value,
  subtitle,
  valueClass = "text-slate-900",
}) => (
  <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
    <p className="text-sm font-medium text-slate-500">{title}</p>
    <h3 className={`mt-2 text-3xl font-extrabold ${valueClass}`}>{value}</h3>
    <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
  </div>
);

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

const ConfirmActionModal = ({
  open,
  mode,
  loading,
  onClose,
  onConfirm,
}) => {
  if (!open) return null;

  const isDelete = mode === "delete";

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <p
            className={`text-xs font-semibold uppercase tracking-[0.22em] ${
              isDelete ? "text-red-600" : "text-orange-600"
            }`}
          >
            {isDelete ? "Delete Booking" : "Cancel Booking"}
          </p>

          <h3 className="mt-2 text-2xl font-extrabold text-slate-900">
            Are you sure?
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {isDelete
              ? "This pending booking will be deleted from your list."
              : "This approved booking will be cancelled."}
          </p>
        </div>

        <div className="px-6 py-5">
          <div
            className={`rounded-2xl border p-4 text-sm leading-7 ${
              isDelete
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-orange-200 bg-orange-50 text-orange-700"
            }`}
          >
            {isDelete
              ? "Do you really want to delete this pending booking?"
              : "Do you really want to cancel this approved booking?"}
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-200 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
          >
            Keep Booking
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-70 ${
              isDelete
                ? "bg-red-600 hover:bg-red-700"
                : "bg-orange-500 hover:bg-orange-600"
            }`}
          >
            {loading
              ? isDelete
                ? "Deleting..."
                : "Cancelling..."
              : isDelete
              ? "Delete Now"
              : "Cancel Now"}
          </button>
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ isAdmin, isManager }) => {
  const title =
    isAdmin || isManager ? "No booking records found" : "No bookings yet";
  const description =
    isAdmin || isManager
      ? "There are currently no booking requests available in this section. Once users submit new reservations, they will appear here."
      : "You have not made any facility reservations yet. Start by exploring available campus facilities and submit your first booking request.";

  return (
    <div className="overflow-hidden rounded-[32px] bg-white shadow-sm ring-1 ring-slate-200">
      <div className="grid lg:grid-cols-[320px,1fr]">
        <div className="flex items-center justify-center bg-gradient-to-br from-yellow-50 via-white to-slate-50 p-10 lg:p-12">
          <div className="text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-yellow-100 text-5xl shadow-sm">
              📅
            </div>
            <div className="mt-5 space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-600">
                Booking Status
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900">
                0 Active Records
              </h3>
            </div>
          </div>
        </div>

        <div className="p-8 lg:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
            Reservation Center
          </p>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900">
            {title}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
            {description}
          </p>

          {!isAdmin && !isManager && (
            <>
              <div className="mt-6 flex flex-wrap gap-3">
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                  Explore facilities
                </span>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                  Select a venue
                </span>
                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                  Submit booking request
                </span>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/facilities"
                  className="rounded-2xl bg-yellow-500 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-yellow-600"
                >
                  Explore Facilities
                </Link>

                <Link
                  to="/student"
                  className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Back to Dashboard
                </Link>
              </div>
            </>
          )}

          {(isAdmin || isManager) && (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-800">
                Nothing to review right now.
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                This section will automatically populate when new booking
                requests are submitted.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const EditBookingModal = ({
  booking,
  form,
  onChange,
  onClose,
  onSave,
  saving,
}) => {
  if (!booking) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-yellow-600">
            Update Booking
          </p>
          <h3 className="mt-2 text-2xl font-extrabold text-slate-900">
            {getFacilityName(booking)}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            You can update this booking only while it is still pending.
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Booking Date
            </label>
            <input
              type="date"
              name="bookingDate"
              value={form.bookingDate}
              onChange={onChange}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Start Time
              </label>
              <input
                type="time"
                name="startTime"
                value={form.startTime}
                onChange={onChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                End Time
              </label>
              <input
                type="time"
                name="endTime"
                value={form.endTime}
                onChange={onChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Attendees
            </label>
            <input
              type="number"
              min="1"
              name="expectedAttendees"
              value={form.expectedAttendees}
              onChange={onChange}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Purpose
            </label>
            <textarea
              name="purpose"
              rows="4"
              value={form.purpose}
              onChange={onChange}
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
            />
          </div>
        </div>

        <div className="flex gap-3 border-t border-slate-200 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
          >
            {saving ? "Updating..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

const MyBookings = () => {
  const { isAuthenticated, isAdmin, isManager } = useAuth();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const [popupError, setPopupError] = useState("");

  const [editingBooking, setEditingBooking] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [editForm, setEditForm] = useState({
    bookingDate: "",
    startTime: "",
    endTime: "",
    expectedAttendees: "",
    purpose: "",
  });

  const pageTitle = isAdmin
    ? "Booking Overview"
    : isManager
    ? "Pending Booking Requests"
    : "My Bookings";

  const pageDescription = isAdmin
    ? "Monitor all campus reservations and review booking activity across the system."
    : isManager
    ? "Review pending facility booking requests and manage reservation flow efficiently."
    : "Track your facility reservations, check booking status, and open full details whenever needed.";

  useEffect(() => {
    if (!popupMessage && !popupError) return;

    const timer = setTimeout(() => {
      setPopupMessage("");
      setPopupError("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [popupMessage, popupError]);

  const closeAlerts = () => {
    setPopupMessage("");
    setPopupError("");
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError("");

      let response;

      if (isAdmin) {
        response = await bookingAPI.getAll();
      } else if (isManager) {
        response = await bookingAPI.getPending();
      } else {
        response = await bookingAPI.getMyBookings();
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
    } catch (err) {
      setError(err.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings();
    }
  }, [isAuthenticated, isAdmin, isManager]);

  const handleCancelBooking = (booking) => {
    if (!booking) return;

    const normalizedStatus = String(booking?.status || "").toUpperCase();
    const isPendingDelete = normalizedStatus === "PENDING";

    setConfirmAction({
      booking,
      mode: isPendingDelete ? "delete" : "cancel",
    });
  };

  const handleConfirmCancelBooking = async () => {
    if (!confirmAction?.booking) return;

    const booking = confirmAction.booking;
    const isPendingDelete = confirmAction.mode === "delete";

    try {
      setActionLoading(true);

      if (isPendingDelete) {
        await bookingAPI.delete(booking.id);
      } else {
        await bookingAPI.cancel(booking.id);
      }

      setConfirmAction(null);
      setIsModalOpen(false);
      setSelectedBooking(null);
      await fetchBookings();

      setPopupError("");
      setPopupMessage(
        isPendingDelete
          ? "Pending booking deleted successfully."
          : "Booking cancelled successfully."
      );
    } catch (err) {
      setPopupMessage("");
      setPopupError(
        err.message ||
          (isPendingDelete
            ? "Failed to delete booking."
            : "Failed to cancel booking.")
      );
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (booking) => {
    if (!booking) return;

    setEditForm({
      bookingDate: toDateInputValue(booking?.startTime || booking?.bookingDate),
      startTime: toTimeInputValue(booking?.startTime),
      endTime: toTimeInputValue(booking?.endTime),
      expectedAttendees: booking?.expectedAttendees || "",
      purpose: booking?.purpose || "",
    });

    setEditingBooking(booking);
    setIsModalOpen(false);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    setEditForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateBooking = async () => {
    if (!editingBooking) return;

    if (!editForm.bookingDate) {
      setPopupMessage("");
      setPopupError("Please select the booking date.");
      return;
    }

    if (!editForm.startTime || !editForm.endTime) {
      setPopupMessage("");
      setPopupError("Please select both start time and end time.");
      return;
    }

    const startDateTime = new Date(
      `${editForm.bookingDate}T${editForm.startTime}:00`
    ).getTime();

    const endDateTime = new Date(
      `${editForm.bookingDate}T${editForm.endTime}:00`
    ).getTime();

    if (endDateTime <= startDateTime) {
      setPopupMessage("");
      setPopupError("End time must be later than start time.");
      return;
    }

    if (!String(editForm.expectedAttendees || "").trim()) {
      setPopupMessage("");
      setPopupError("Please enter the attendees count.");
      return;
    }

    try {
      setEditSaving(true);

      const payload = {
        facilityId: editingBooking?.facility?.id || editingBooking?.facilityId,
        startTime: combineDateAndTimeToApiDateTime(
          editForm.bookingDate,
          editForm.startTime
        ),
        endTime: combineDateAndTimeToApiDateTime(
          editForm.bookingDate,
          editForm.endTime
        ),
        expectedAttendees: Number(editForm.expectedAttendees),
        purpose: editForm.purpose?.trim() || "",
      };

      await bookingAPI.update(editingBooking.id, payload);
      setEditingBooking(null);
      await fetchBookings();

      setPopupError("");
      setPopupMessage("Booking updated successfully.");
    } catch (err) {
      setPopupMessage("");
      setPopupError(err.message || "Failed to update booking.");
    } finally {
      setEditSaving(false);
    }
  };

  const visibleBookings = useMemo(() => {
    if (isAdmin || isManager) return bookings;

    return bookings.filter(
      (booking) => (booking?.status || "").toUpperCase() !== "CANCELLED"
    );
  }, [bookings, isAdmin, isManager]);

  const stats = useMemo(() => {
    const upcomingCount = visibleBookings.filter((booking) => {
      const start = new Date(booking?.startTime || booking?.bookingDate || 0);
      return !Number.isNaN(start.getTime()) && start.getTime() > Date.now();
    }).length;

    return {
      total: visibleBookings.length,
      pending: getStatusCount(visibleBookings, ["PENDING"]),
      approved: getStatusCount(visibleBookings, ["APPROVED", "CONFIRMED"]),
      cancelled: getStatusCount(bookings, ["CANCELLED", "REJECTED"]),
      upcoming: upcomingCount,
    };
  }, [visibleBookings, bookings]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="pointer-events-none fixed right-4 top-20 z-[120] flex w-full max-w-sm flex-col gap-3">
        {popupMessage && (
          <AlertPopup
            type="success"
            text={popupMessage}
            onClose={closeAlerts}
          />
        )}

        {popupError && (
          <AlertPopup
            type="error"
            text={popupError}
            onClose={closeAlerts}
          />
        )}
      </div>

      <section className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
            Booking Center
          </p>
          <h1 className="text-4xl font-extrabold md:text-5xl">{pageTitle}</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
            {pageDescription}
          </p>
        </div>
      </section>

      <section className="mx-auto -mt-8 grid max-w-7xl gap-5 px-6 sm:grid-cols-2 xl:grid-cols-4 lg:px-10">
        <StatCard
          title="Total Bookings"
          value={stats.total}
          subtitle="All bookings in this view"
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
          subtitle="Confirmed reservations"
          valueClass="text-green-600"
        />
        <StatCard
          title="Upcoming"
          value={stats.upcoming}
          subtitle="Future scheduled bookings"
          valueClass="text-blue-600"
        />
      </section>

      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        {loading ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
            <p className="mt-4 text-slate-600">Loading bookings...</p>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
            <p className="text-lg font-bold text-red-700">
              Failed to load bookings
            </p>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <button
              onClick={fetchBookings}
              className="mt-4 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Try Again
            </button>
          </div>
        ) : visibleBookings.length === 0 ? (
          <EmptyState isAdmin={isAdmin} isManager={isManager} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleBookings.map((booking, index) => {
              const bookingId =
                booking?.id || booking?.bookingId || `booking-${index}`;
              const facilityName = getFacilityName(booking);
              const facilityType = getFacilityType(booking);
              const location = getFacilityLocation(booking);
              const attendees = getAttendees(booking);
              const purpose = getPurpose(booking);
              const imageUrl = getFacilityImage(booking);
              const status = booking?.status || "UNKNOWN";
              const startTime = booking?.startTime || booking?.bookingDate;
              const endTime = booking?.endTime;

              return (
                <div
                  key={bookingId}
                  className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lg"
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
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-100 text-5xl">
                        🏫
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent"></div>

                    <div className="absolute left-3 top-3">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase shadow ${getStatusClasses(
                          status
                        )}`}
                      >
                        {formatStatusLabel(status)}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-yellow-300">
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
                          Date
                        </span>
                        <span className="text-right text-sm font-bold text-slate-900">
                          {formatDate(startTime)}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between gap-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Time
                        </span>
                        <span className="text-right text-sm font-bold text-slate-900">
                          {endTime
                            ? `${formatTime(startTime)} - ${formatTime(endTime)}`
                            : formatTime(startTime)}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between gap-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Attendees
                        </span>
                        <span className="text-right text-sm font-bold text-slate-900">
                          {attendees}
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

                    <div className="mt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Purpose
                      </p>
                      <p
                        className="mt-2 text-sm leading-6 text-slate-600"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {purpose}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-[11px] font-medium text-slate-400">
                        ID: {bookingId}
                      </p>

                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setIsModalOpen(true);
                        }}
                        className="rounded-xl bg-yellow-500 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-yellow-600"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {isModalOpen && (
        <BookingDetailsModal
          booking={selectedBooking}
          onClose={() => setIsModalOpen(false)}
          onCancel={handleCancelBooking}
          onOpenEdit={openEditModal}
          canManageOwnBooking={!isAdmin && !isManager}
        />
      )}

      <ConfirmActionModal
        open={!!confirmAction}
        mode={confirmAction?.mode}
        loading={actionLoading}
        onClose={() => {
          if (actionLoading) return;
          setConfirmAction(null);
        }}
        onConfirm={handleConfirmCancelBooking}
      />

      {editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          form={editForm}
          onChange={handleEditChange}
          onClose={() => setEditingBooking(null)}
          onSave={handleUpdateBooking}
          saving={editSaving}
        />
      )}

      <Footer />
    </div>
  );
};

export default MyBookings;