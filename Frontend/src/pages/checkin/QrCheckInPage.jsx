import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { bookingAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const statusStyles = {
  APPROVED: "bg-green-100 text-green-700 border-green-200",
  PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  CANCELLED: "bg-slate-100 text-slate-700 border-slate-200",
};

const formatStatusLabel = (status = "") =>
  String(status || "UNKNOWN").replaceAll("_", " ");

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

const InfoCard = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
      {label}
    </p>
    <p className="mt-2 break-words text-sm font-bold text-slate-900">{value}</p>
  </div>
);

const QrCheckInPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { dashboardPath } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [qrData, setQrData] = useState(null);

  const loadQrData = async () => {
    if (!token) {
      setError("QR token is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = await bookingAPI.verifyQr(token);
      setQrData(data);
    } catch (err) {
      setQrData(null);
      setError(err.message || "Failed to verify QR code.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQrData();
  }, [token]);

  const validationMessage = useMemo(() => {
    if (!qrData) return "";

    if (qrData?.checkedIn) {
      return "This booking is already checked in.";
    }

    if (String(qrData?.status || "").toUpperCase() !== "APPROVED") {
      return "Only approved bookings can be checked in.";
    }

    if (!qrData?.validNow) {
      return "This QR code is outside the allowed check-in time window.";
    }

    return "This booking is valid for check-in right now.";
  }, [qrData]);

  const canCheckIn =
    !!qrData &&
    String(qrData?.status || "").toUpperCase() === "APPROVED" &&
    !qrData?.checkedIn &&
    !!qrData?.validNow;

  const handleCheckIn = async () => {
    if (!canCheckIn) return;

    try {
      setSubmitting(true);
      setError("");
      setSuccessMessage("");

      await bookingAPI.checkInByQr(token);
      setSuccessMessage("Booking checked in successfully.");
      await loadQrData();
    } catch (err) {
      setSuccessMessage("");
      setError(err.message || "Failed to complete check-in.");
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    navigate(dashboardPath || "/");
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-yellow-600">
            QR Check-In
          </p>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Booking Verification
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-500 sm:text-base">
            Verify the booking and complete check-in for the user at the
            facility.
          </p>
        </div>

        <div className="overflow-hidden rounded-[32px] bg-white shadow-xl ring-1 ring-slate-200">
          {loading ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
              <p className="mt-5 text-sm font-semibold text-slate-600">
                Verifying QR code...
              </p>
            </div>
          ) : error ? (
            <div className="p-8 sm:p-10">
              <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-red-600">
                  Verification Failed
                </p>
                <h2 className="mt-2 text-2xl font-extrabold text-red-700">
                  Invalid or unusable QR
                </h2>
                <p className="mt-3 text-sm leading-7 text-red-700">{error}</p>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={loadQrData}
                  className="flex-1 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Try Again
                </button>

                <button
                  type="button"
                  onClick={goBack}
                  className="flex-1 rounded-2xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-yellow-600"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 sm:p-8">
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Booking Details
                  </p>
                  <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                    {qrData?.facilityName || "Facility Booking"}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    {qrData?.facilityLocation || "No location available"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${
                      statusStyles[String(qrData?.status || "").toUpperCase()] ||
                      "bg-blue-100 text-blue-700 border-blue-200"
                    }`}
                  >
                    {formatStatusLabel(qrData?.status)}
                  </span>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${
                      qrData?.checkedIn
                        ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                        : qrData?.validNow
                        ? "border-blue-200 bg-blue-100 text-blue-700"
                        : "border-orange-200 bg-orange-100 text-orange-700"
                    }`}
                  >
                    {qrData?.checkedIn
                      ? "Checked In"
                      : qrData?.validNow
                      ? "Valid Now"
                      : "Not Valid Now"}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <InfoCard label="Booking ID" value={qrData?.bookingId || "N/A"} />
                <InfoCard label="User" value={qrData?.userName || "N/A"} />
                <InfoCard
                  label="Date"
                  value={formatDate(qrData?.startTime)}
                />
                <InfoCard
                  label="Time"
                  value={`${formatTime(qrData?.startTime)} - ${formatTime(
                    qrData?.endTime
                  )}`}
                />
              </div>

              <div
                className={`mt-6 rounded-3xl border p-5 ${
                  qrData?.checkedIn
                    ? "border-emerald-200 bg-emerald-50"
                    : canCheckIn
                    ? "border-blue-200 bg-blue-50"
                    : "border-orange-200 bg-orange-50"
                }`}
              >
                <p
                  className={`text-sm font-black uppercase tracking-[0.18em] ${
                    qrData?.checkedIn
                      ? "text-emerald-700"
                      : canCheckIn
                      ? "text-blue-700"
                      : "text-orange-700"
                  }`}
                >
                  Check-In Status
                </p>

                <p
                  className={`mt-3 text-base font-semibold leading-7 ${
                    qrData?.checkedIn
                      ? "text-emerald-800"
                      : canCheckIn
                      ? "text-blue-800"
                      : "text-orange-800"
                  }`}
                >
                  {validationMessage}
                </p>

                {qrData?.checkedInAt && (
                  <p className="mt-3 text-sm font-medium text-slate-600">
                    Checked in at: {formatDateTime(qrData.checkedInAt)}
                  </p>
                )}
              </div>

              {successMessage && (
                <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                    Success
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-7 text-emerald-800">
                    {successMessage}
                  </p>
                </div>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={goBack}
                  className="flex-1 rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Back to Dashboard
                </button>

                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={!canCheckIn || submitting}
                  className="flex-1 rounded-2xl bg-yellow-500 px-5 py-3.5 text-sm font-semibold text-white shadow transition hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Processing..." : "Confirm Check-In"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QrCheckInPage;