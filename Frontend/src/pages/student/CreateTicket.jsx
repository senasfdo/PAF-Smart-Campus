import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { ticketAPI } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const initialForm = {
  title: "",
  description: "",
  category: "GENERAL",
  priority: "MEDIUM",
  location: "",
  resourceName: "",
  contactPhone: "",
};

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_ATTACHMENTS = 3;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/gif",
];

const categories = [
  { value: "GENERAL", label: "General" },
  { value: "FACILITY", label: "Facility" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "NETWORK", label: "Network" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OTHER", label: "Other" },
];

const priorities = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

const fieldClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium !text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100";
const labelClass = "mb-2 block text-sm font-semibold text-slate-700";

const getDisplayName = (user) => {
  return (
    user?.name ||
    user?.fullName ||
    user?.username ||
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "")
  );
};

const TipCard = ({ title, text }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-sm font-bold text-slate-900">{title}</p>
    <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
  </div>
);

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes)) return "";
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDateTime = (value) => {
  if (!value) return "N/A";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const getStatusClasses = (status = "") => {
  const value = String(status).toUpperCase();

  switch (value) {
    case "OPEN":
      return "bg-yellow-100 text-yellow-700";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-700";
    case "RESOLVED":
      return "bg-green-100 text-green-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const normalizeDuplicateResponse = (response) => {
  return {
    duplicateFound: Boolean(response?.duplicateFound),
    matches: Array.isArray(response?.matches) ? response.matches : [],
  };
};

const DuplicateCheckCard = ({
  checkingDuplicates,
  duplicateResult,
  onCheckDuplicates,
}) => {
  const hasChecked = duplicateResult !== null;
  const hasMatches = duplicateResult?.duplicateFound && duplicateResult?.matches?.length > 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">
            Duplicate Ticket Detection
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Check whether a similar issue already exists before creating a new ticket.
          </p>
        </div>

        <button
          type="button"
          onClick={onCheckDuplicates}
          disabled={checkingDuplicates}
          className="rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-2.5 text-sm font-semibold text-yellow-700 transition hover:bg-yellow-100 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {checkingDuplicates ? "Checking..." : "Check Similar Issues"}
        </button>
      </div>

      {hasChecked && !hasMatches && (
        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <div className="pt-0.5 text-lg">✅</div>
            <div>
              <p className="text-sm font-bold text-green-700">
                No Similar Active Tickets Found
              </p>
              <p className="mt-1 text-sm leading-6 text-green-700">
                You can continue and create your ticket normally.
              </p>
            </div>
          </div>
        </div>
      )}

      {hasMatches && (
        <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <div className="pt-0.5 text-lg">⚠️</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-orange-800">
                Similar Tickets Found
              </p>
              <p className="mt-1 text-sm leading-6 text-orange-700">
                A similar issue may already exist. You can review these tickets and still submit your new ticket if needed.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {duplicateResult.matches.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-orange-200 bg-white p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">
                      #{item.id} - {item.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {item.description}
                    </p>
                  </div>

                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase ${getStatusClasses(
                      item.status
                    )}`}
                  >
                    {item.status || "UNKNOWN"}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {item.category && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      Category: {item.category}
                    </span>
                  )}

                  {item.location && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      Location: {item.location}
                    </span>
                  )}

                  {item.resourceName && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      Resource: {item.resourceName}
                    </span>
                  )}

                  {typeof item.similarityScore === "number" && (
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                      Similarity: {(item.similarityScore * 100).toFixed(0)}%
                    </span>
                  )}
                </div>

                {Array.isArray(item.matchedKeywords) && item.matchedKeywords.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Matched Keywords
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {item.matchedKeywords.slice(0, 6).map((keyword) => (
                        <span
                          key={`${item.id}-${keyword}`}
                          className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 text-xs text-slate-500">
                  Created: {formatDateTime(item.createdAt)}
                </div>

                <div className="mt-3">
                  <Link
                    to={`/my-tickets`}
                    className="text-sm font-semibold text-yellow-700 transition hover:text-yellow-800"
                  >
                    View My Tickets
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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

const CreateTicket = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState(initialForm);
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateResult, setDuplicateResult] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [successPendingRedirect, setSuccessPendingRedirect] = useState(false);

  const contactName = useMemo(() => getDisplayName(user), [user]);
  const contactEmail = useMemo(() => user?.email || "", [user]);

  const attachmentSummary = useMemo(() => {
    if (attachments.length === 0) return "Choose up to 3 images";
    if (attachments.length === 1) return attachments[0].name;
    return `${attachments.length} images selected`;
  }, [attachments]);

  useEffect(() => {
    if (!message && !error) return;

    const timer = setTimeout(() => {
      const shouldRedirect = successPendingRedirect;
      setMessage("");
      setError("");

      if (shouldRedirect) {
        setSuccessPendingRedirect(false);
        navigate("/my-tickets");
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [message, error, successPendingRedirect, navigate]);

  const closeAlerts = () => {
    const shouldRedirect = successPendingRedirect;
    setMessage("");
    setError("");

    if (shouldRedirect) {
      setSuccessPendingRedirect(false);
      navigate("/my-tickets");
    }
  };

  const resetDuplicateResult = () => {
    setDuplicateResult(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (["title", "description", "category", "location", "resourceName"].includes(name)) {
      resetDuplicateResult();
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (selectedFiles.length === 0) {
      setAttachments([]);
      return;
    }

    if (selectedFiles.length > MAX_ATTACHMENTS) {
      setError(`You can upload a maximum of ${MAX_ATTACHMENTS} images.`);
      setMessage("");
      e.target.value = "";
      setAttachments([]);
      return;
    }

    for (const file of selectedFiles) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setError("Only image files are allowed (JPEG, PNG, JPG, GIF).");
        setMessage("");
        e.target.value = "";
        setAttachments([]);
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`Each file must be smaller than ${MAX_FILE_SIZE_MB}MB.`);
        setMessage("");
        e.target.value = "";
        setAttachments([]);
        return;
      }
    }

    setError("");
    setMessage("");
    setAttachments(selectedFiles);
  };

  const removeAttachment = (indexToRemove) => {
    setAttachments((prev) => prev.filter((_, index) => index !== indexToRemove));
    setError("");
    setMessage("");
  };

  const clearAttachments = () => {
    setAttachments([]);
    setError("");
    setMessage("");
  };

  const handleCheckDuplicates = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      setError("Please enter the ticket title and description before checking similar issues.");
      setMessage("");
      return;
    }

    try {
      setCheckingDuplicates(true);
      setError("");
      setMessage("");

      const response = await ticketAPI.checkDuplicate({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        location: form.location.trim(),
        resourceName: form.resourceName.trim(),
      });

      setDuplicateResult(normalizeDuplicateResponse(response));
    } catch (err) {
      setDuplicateResult(null);
      setError(err.message || "Failed to check similar tickets.");
    } finally {
      setCheckingDuplicates(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.description.trim()) {
      setError("Please fill in the title and description.");
      setMessage("");
      return;
    }

    if (!contactEmail.trim()) {
      setError("Your account email is missing. Please log in again and try.");
      setMessage("");
      return;
    }

    if (attachments.length > MAX_ATTACHMENTS) {
      setError(`You can upload a maximum of ${MAX_ATTACHMENTS} images.`);
      setMessage("");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      const formData = new FormData();
      formData.append("title", form.title.trim());
      formData.append("description", form.description.trim());
      formData.append("category", form.category);
      formData.append("priority", form.priority);
      formData.append("location", form.location.trim());
      formData.append("resourceName", form.resourceName.trim());
      formData.append("contactEmail", contactEmail);
      formData.append("contactPhone", form.contactPhone.trim());

      attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      await ticketAPI.create(formData);
      setMessage("Ticket created successfully.");
      setSuccessPendingRedirect(true);
      setSubmitting(false);
    } catch (err) {
      setSuccessPendingRedirect(false);
      setError(err.message || "Failed to create ticket.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="pointer-events-none fixed right-4 top-20 z-[120] flex w-full max-w-sm flex-col gap-3">
        {message && (
          <AlertPopup type="success" text={message} onClose={closeAlerts} />
        )}

        {error && (
          <AlertPopup type="error" text={error} onClose={closeAlerts} />
        )}
      </div>

      <section className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-yellow-400">
            Support Center
          </p>
          <h1 className="text-3xl font-extrabold md:text-4xl">
            Create Support Ticket
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
            Submit your issue clearly so the support team can understand it and
            respond faster.
          </p>
        </div>
      </section>

      <section className="mx-auto -mt-6 max-w-5xl px-6 pb-14">
        <div className="grid gap-6 lg:grid-cols-[1fr,280px]">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-yellow-600">
                  Ticket Form
                </p>
                <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                  Issue Information
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Fill only the needed details in a clear way.
                </p>
              </div>

              <div className="hidden rounded-full bg-yellow-100 px-3 py-2 text-xs font-bold text-yellow-700 sm:block">
                New Ticket
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Contact Name</label>
                  <input
                    type="text"
                    value={contactName || "User"}
                    readOnly
                    className={`${fieldClass} bg-slate-50 text-slate-700`}
                    style={{ color: "#334155" }}
                  />
                </div>

                <div>
                  <label className={labelClass}>Contact Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    readOnly
                    className={`${fieldClass} bg-slate-50 text-slate-700`}
                    style={{ color: "#334155" }}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Ticket Title</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Example: Projector in Lab 3 is not working"
                  className={fieldClass}
                  style={{ color: "#0f172a" }}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Category</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ color: "#0f172a" }}
                  >
                    {categories.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Priority</label>
                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleChange}
                    className={fieldClass}
                    style={{ color: "#0f172a" }}
                  >
                    {priorities.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Location</label>
                  <input
                    type="text"
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="Example: Lab 3 / Library"
                    className={fieldClass}
                    style={{ color: "#0f172a" }}
                  />
                </div>

                <div>
                  <label className={labelClass}>Resource Name</label>
                  <input
                    type="text"
                    name="resourceName"
                    value={form.resourceName}
                    onChange={handleChange}
                    placeholder="Example: Projector / WiFi"
                    className={fieldClass}
                    style={{ color: "#0f172a" }}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Contact Phone</label>
                <input
                  type="text"
                  name="contactPhone"
                  value={form.contactPhone}
                  onChange={handleChange}
                  placeholder="Optional phone number"
                  className={fieldClass}
                  style={{ color: "#0f172a" }}
                />
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Explain what happened and include the important details..."
                  className={`${fieldClass} min-h-[110px] resize-none`}
                  style={{ color: "#0f172a" }}
                />
              </div>

              <DuplicateCheckCard
                checkingDuplicates={checkingDuplicates}
                duplicateResult={duplicateResult}
                onCheckDuplicates={handleCheckDuplicates}
              />

              <div>
                <label className={labelClass}>Attachments</label>

                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 transition hover:border-yellow-400 hover:bg-yellow-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {attachmentSummary}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Upload up to {MAX_ATTACHMENTS} images, max {MAX_FILE_SIZE_MB}MB each
                    </p>
                  </div>

                  <span className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-white">
                    Browse
                  </span>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/gif"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                {attachments.length > 0 && (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Selected Images
                      </p>

                      <button
                        type="button"
                        onClick={clearAttachments}
                        className="text-xs font-semibold text-red-600 transition hover:text-red-700"
                      >
                        Clear all
                      </button>
                    </div>

                    <div className="space-y-2">
                      {attachments.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {file.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatFileSize(file.size)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </button>

                <Link
                  to="/my-tickets"
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-lg font-extrabold text-slate-900">
                Before You Submit
              </h3>

              <div className="mt-4 space-y-3">
                <TipCard
                  title="Use a clear title"
                  text="Keep it short and specific."
                />
                <TipCard
                  title="Explain the issue"
                  text="Mention where it happened and what went wrong."
                />
                <TipCard
                  title="Check similar issues"
                  text="Use the duplicate check to avoid creating repeated support requests."
                />
                <TipCard
                  title="Add proof"
                  text="You can upload up to 3 screenshots to help the support team understand faster."
                />
              </div>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-yellow-400">
                Quick Tip
              </p>
              <h3 className="mt-2 text-xl font-extrabold">
                Avoid duplicate tickets
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Check similar issues first. If the same issue already exists, the support team can resolve it faster without duplicate requests.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default CreateTicket;