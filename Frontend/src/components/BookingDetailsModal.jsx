import React, { useEffect, useMemo, useState } from "react";
import { bookingAPI } from "../services/api";

const BookingDetailsModal = ({
  booking,
  onClose,
  onCancel,
  onOpenEdit,
  canManageOwnBooking = false,
}) => {
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");
  const [qrData, setQrData] = useState(null);
  const [isQrOpen, setIsQrOpen] = useState(false);

  useEffect(() => {
    if (!booking) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [booking]);

  useEffect(() => {
    setQrLoading(false);
    setQrError("");
    setQrData(null);
    setIsQrOpen(false);
  }, [booking]);

  if (!booking) return null;

  const normalizedStatus = String(booking?.status || "").toUpperCase();
  const canEdit = canManageOwnBooking && normalizedStatus === "PENDING";
  const canDeletePending =
    canManageOwnBooking && normalizedStatus === "PENDING";
  const canCancelApproved =
    canManageOwnBooking && normalizedStatus === "APPROVED";
  const canShowQr = normalizedStatus === "APPROVED";

  const getImageSrc = () => {
    const raw =
      booking?.facility?.imageUrl ||
      booking?.facility?.imageURL ||
      booking?.facility?.image_url ||
      "";

    if (!raw) {
      return "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80";
    }

    return raw;
  };

  const getStatusColor = (status) => {
    switch (String(status || "").toUpperCase()) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "APPROVED":
        return "bg-green-100 text-green-800 border-green-200";
      case "REJECTED":
        return "bg-red-100 text-red-800 border-red-200";
      case "CANCELLED":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
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
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateTime = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleOpenQr = async () => {
    if (!booking?.id) return;

    try {
      setQrLoading(true);
      setQrError("");
      const data = await bookingAPI.getQrDetails(booking.id);
      setQrData(data);
      setIsQrOpen(true);
    } catch (error) {
      setQrError(error.message || "Failed to load QR code.");
    } finally {
      setQrLoading(false);
    }
  };

  const closeQrModal = () => {
    setIsQrOpen(false);
  };

  const qrPayload = useMemo(() => {
    if (!qrData?.qrToken) return "";
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/qr-check-in/${qrData.qrToken}`;
  }, [qrData]);

  const qrImageUrl = useMemo(() => {
    if (!qrPayload) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
      qrPayload
    )}`;
  }, [qrPayload]);

  const IconButton = ({ title, onClick, className = "", children }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white backdrop-blur-md transition hover:scale-105 hover:bg-white/35 ${className}`}
    >
      {children}
    </button>
  );

  return (
    <>
      <div className="fixed inset-0 z-[100] overflow-hidden bg-black/60 p-3 backdrop-blur-sm sm:p-4">
        <div className="flex h-full items-center justify-center">
          <div className="flex h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="relative h-44 shrink-0 sm:h-52">
              <img
                src={getImageSrc()}
                alt={booking?.facility?.name || "Facility"}
                className="h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

              <div className="absolute right-4 top-4 flex flex-wrap items-center justify-end gap-2">
                {canEdit && (
                  <IconButton
                    title="Update Booking"
                    onClick={() => onOpenEdit(booking)}
                    className="bg-blue-500/80 hover:bg-blue-600"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.4"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.586-9.414a2 2 0 112.828 2.828L11.828 14.172 8 15l.828-3.828 8.586-8.586z"
                      />
                    </svg>
                  </IconButton>
                )}

                {canDeletePending && (
                  <IconButton
                    title="Delete Booking"
                    onClick={() => onCancel(booking)}
                    className="bg-red-500/80 hover:bg-red-600"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.4"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </IconButton>
                )}

                <IconButton title="Close" onClick={onClose}>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.4"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </IconButton>
              </div>

              <div className="absolute bottom-4 left-5 right-5 sm:left-6 sm:right-6">
                <span
                  className={`inline-flex rounded-xl border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getStatusColor(
                    normalizedStatus
                  )}`}
                >
                  {normalizedStatus}
                </span>

                <h2 className="mt-2 line-clamp-2 text-2xl font-black leading-tight text-white sm:text-3xl">
                  {booking?.facility?.name || "Facility"}
                </h2>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <div className="space-y-4 pr-1">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <h4 className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Date
                    </h4>
                    <p className="text-sm font-bold text-gray-900">
                      {formatDate(booking?.startTime)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <h4 className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Attendees
                    </h4>
                    <p className="text-sm font-bold text-gray-900">
                      {booking?.expectedAttendees || 0} Pax
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <h4 className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Start Time
                    </h4>
                    <p className="text-sm font-bold text-gray-900">
                      {formatTime(booking?.startTime)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <h4 className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      End Time
                    </h4>
                    <p className="text-sm font-bold text-gray-900">
                      {formatTime(booking?.endTime)}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 px-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Booking Info
                  </h4>

                  <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4 font-medium">
                    <div className="flex items-start justify-between gap-4 text-sm">
                      <span className="text-gray-500">Facility Type:</span>
                      <span className="text-right font-bold text-gray-900">
                        {booking?.facility?.type || "N/A"}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-4 text-sm">
                      <span className="text-gray-500">Location:</span>
                      <span className="text-right font-bold text-gray-900">
                        {booking?.facility?.location || "N/A"}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-4 text-sm">
                      <span className="text-gray-500">Booking ID:</span>
                      <span className="text-right font-bold text-gray-900">
                        {booking?.id || "N/A"}
                      </span>
                    </div>

                    {booking?.purpose && (
                      <div className="mt-2 border-t border-gray-200 pt-3">
                        <h4 className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Purpose
                        </h4>
                        <p className="break-words text-sm italic leading-relaxed text-gray-700">
                          "{booking.purpose}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {booking?.rejectionReason && (
                  <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                    <h4 className="mb-1 text-[10px] font-black uppercase tracking-widest text-red-600">
                      Rejection
                    </h4>
                    <p className="break-words text-sm font-medium text-red-700">
                      {booking.rejectionReason}
                    </p>
                  </div>
                )}

                {normalizedStatus === "PENDING" && canManageOwnBooking && (
                  <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4">
                    <p className="text-sm font-semibold text-yellow-800">
                      Pending bookings can be updated or deleted until they are
                      reviewed.
                    </p>
                  </div>
                )}

                {normalizedStatus === "APPROVED" && canManageOwnBooking && (
                  <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                    <p className="text-sm font-semibold text-green-800">
                      Approved bookings can be cancelled if you no longer need
                      them.
                    </p>
                  </div>
                )}

                {Boolean(booking?.checkedIn) && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <h4 className="mb-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                      Checked In
                    </h4>
                    <p className="text-sm font-semibold text-emerald-800">
                      This booking has already been checked in.
                    </p>
                    {booking?.checkedInAt && (
                      <p className="mt-1 text-xs font-medium text-emerald-700">
                        Checked in at: {formatDateTime(booking.checkedInAt)}
                      </p>
                    )}
                  </div>
                )}

                {qrError && (
                  <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                    <h4 className="mb-1 text-[10px] font-black uppercase tracking-widest text-red-600">
                      QR Error
                    </h4>
                    <p className="text-sm font-medium text-red-700">
                      {qrError}
                    </p>
                  </div>
                )}

                {canShowQr && (
                  <button
                    type="button"
                    onClick={handleOpenQr}
                    disabled={qrLoading}
                    className="flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-800 shadow-sm transition-all hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {qrLoading ? "Loading QR..." : "View QR Code"}
                  </button>
                )}

                <div className="pt-1">
                  {canCancelApproved ? (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => onCancel(booking)}
                        className="flex items-center justify-center rounded-xl border border-orange-300 bg-orange-50 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-orange-700 shadow-sm transition-all hover:bg-orange-100 active:scale-95"
                      >
                        Cancel Booking
                      </button>

                      <button
                        onClick={onClose}
                        className="flex items-center justify-center rounded-xl bg-yellow-400 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-gray-900 shadow-md transition-all hover:bg-yellow-500 hover:shadow-lg active:scale-95"
                      >
                        Back to List
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={onClose}
                      className="flex w-full items-center justify-center rounded-xl bg-yellow-400 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-gray-900 shadow-md transition-all hover:bg-yellow-500 hover:shadow-lg active:scale-95"
                    >
                      Back to List
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isQrOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-4">
          <div className="flex max-h-[82vh] w-full max-w-[380px] flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div className="min-w-0 pr-3">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-green-600">
                  Booking QR Pass
                </p>
                <h3 className="mt-1 line-clamp-2 text-xl font-extrabold leading-tight text-slate-900">
                  {qrData?.facilityName || booking?.facility?.name || "Booking"}
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Show this at the facility for verification.
                </p>
              </div>

              <button
                type="button"
                onClick={closeQrModal}
                className="shrink-0 rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="space-y-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Date
                      </p>
                      <p className="mt-1 font-bold text-slate-900">
                        {formatDate(qrData?.startTime || booking?.startTime)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Time
                      </p>
                      <p className="mt-1 font-bold text-slate-900">
                        {formatTime(qrData?.startTime || booking?.startTime)} -{" "}
                        {formatTime(qrData?.endTime || booking?.endTime)}
                      </p>
                    </div>
                  </div>
                </div>

                {qrData?.checkedIn ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                    <p className="text-sm font-bold text-emerald-800">
                      This booking is already checked in.
                    </p>
                    <p className="mt-1 text-xs font-medium text-emerald-700">
                      Checked in at: {formatDateTime(qrData?.checkedInAt)}
                    </p>
                  </div>
                ) : (
                  <div className="flex justify-center">
                    <div className="rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm">
                      {qrImageUrl ? (
                        <img
                          src={qrImageUrl}
                          alt="Booking QR Code"
                          className="h-[220px] w-[220px] rounded-2xl object-contain"
                        />
                      ) : (
                        <div className="flex h-[220px] w-[220px] items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-500">
                          QR not available
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    QR Token
                  </p>
                  <p className="mt-2 break-all text-sm font-semibold text-slate-800">
                    {qrData?.qrToken || "N/A"}
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
                  <p className="text-sm font-medium leading-6 text-blue-800">
                    Staff can scan this QR to verify your approved booking and
                    complete check-in.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={closeQrModal}
                className="flex w-full items-center justify-center rounded-xl bg-yellow-400 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-gray-900 shadow-md transition-all hover:bg-yellow-500 hover:shadow-lg active:scale-95"
              >
                Close QR
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BookingDetailsModal;