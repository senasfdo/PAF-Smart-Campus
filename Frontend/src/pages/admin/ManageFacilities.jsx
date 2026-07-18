import React, { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { useAuth } from "../../context/AuthContext";
import { facilityAPI } from "../../services/api";

const initialForm = {
  name: "",
  type: "STUDY_ROOM",
  capacity: 10,
  location: "",
  description: "",
  availabilityStart: "08:00",
  availabilityEnd: "22:00",
  imageUrl: "",
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const facilityTypes = [
  { value: "STUDY_ROOM", label: "Study Room" },
  { value: "LABORATORY", label: "Laboratory" },
  { value: "LECTURE_HALL", label: "Lecture Hall" },
  { value: "GYM", label: "Gym / Fitness" },
  { value: "MEETING_ROOM", label: "Meeting Room" },
  { value: "PROJECTOR", label: "Projector" },
  { value: "CAMERA", label: "Camera" },
];

const facilityStatuses = [
  { value: "ACTIVE", label: "Active" },
  { value: "OUT_OF_SERVICE", label: "Out of Service" },
  { value: "MAINTENANCE", label: "Maintenance" },
];

const normalizeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const getFacilityImage = (facility) => {
  return facility?.imageUrl || facility?.imageURL || facility?.image_url || "";
};

const normalizeStatus = (rawStatus) => {
  const value = String(rawStatus || "").toUpperCase();

  if (value === "OUT_OF_SERVICE") return "OUT_OF_SERVICE";
  if (value === "MAINTENANCE") return "MAINTENANCE";
  return "ACTIVE";
};

const getFacilityStatus = (facility) => {
  const raw =
    facility?.status ||
    facility?.availabilityStatus ||
    (facility?.active === false ? "OUT_OF_SERVICE" : "ACTIVE");

  return normalizeStatus(raw);
};

const formatStatusLabel = (status) => {
  switch (normalizeStatus(status)) {
    case "OUT_OF_SERVICE":
      return "Out of Service";
    case "MAINTENANCE":
      return "Maintenance";
    default:
      return "Active";
  }
};

const getStatusClasses = (status) => {
  switch (normalizeStatus(status)) {
    case "ACTIVE":
      return "bg-green-100 text-green-700";
    case "OUT_OF_SERVICE":
      return "bg-red-100 text-red-700";
    case "MAINTENANCE":
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const formatDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString();
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

const PencilIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
    <path
      d="M16.862 3.487a2.25 2.25 0 113.182 3.182L8.25 18.463 4.5 19.5l1.037-3.75L16.862 3.487z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PowerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
    <path
      d="M12 3v9"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M6.364 6.364a8 8 0 1011.272 0"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
    <path
      d="M4 7h16"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
    <path
      d="M12 16V4m0 0l-4 4m4-4l4 4M5 20h14"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
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

const ActionIconButton = ({
  title,
  onClick,
  children,
  className = "",
  disabled = false,
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    disabled={disabled}
    className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/90 text-slate-800 shadow-md backdrop-blur transition hover:scale-105 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
  >
    {children}
  </button>
);

const ConfirmDeleteModal = ({ facility, onCancel, onConfirm, working }) => {
  if (!facility) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl">
          🗑️
        </div>

        <h3 className="mt-5 text-2xl font-extrabold text-slate-900">
          Delete Facility?
        </h3>

        <p className="mt-3 text-sm leading-7 text-slate-600">
          Are you sure you want to delete{" "}
          <span className="font-bold text-slate-900">
            {facility?.name || "this facility"}
          </span>
          ? This action cannot be undone.
        </p>

        <div className="mt-6 flex gap-3">
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
            {working ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

const StatusModal = ({
  facility,
  selectedStatus,
  setSelectedStatus,
  onCancel,
  onConfirm,
  working,
}) => {
  if (!facility) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 text-2xl">
          ⚙️
        </div>

        <h3 className="mt-5 text-2xl font-extrabold text-slate-900">
          Change Facility Status
        </h3>

        <p className="mt-3 text-sm leading-7 text-slate-600">
          Update the current status of{" "}
          <span className="font-bold text-slate-900">
            {facility?.name || "this facility"}
          </span>
          .
        </p>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Current Status
          </p>
          <p className="mt-2 text-sm font-bold text-slate-900">
            {formatStatusLabel(getFacilityStatus(facility))}
          </p>
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Select New Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
          >
            {facilityStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 flex gap-3">
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
            className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-70"
          >
            {working ? "Updating..." : "Save Status"}
          </button>
        </div>
      </div>
    </div>
  );
};

const to12Hour = (time24) => {
  if (!time24 || !time24.includes(":")) return "";
  const [hourStr, minute] = time24.split(":");
  let hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${String(hour).padStart(2, "0")}:${minute} ${ampm}`;
};

const buildAvailabilitySchedule = (start, end) => {
  return `${to12Hour(start)} - ${to12Hour(end)}`;
};

const parseAvailabilitySchedule = (schedule) => {
  if (!schedule || typeof schedule !== "string") {
    return { availabilityStart: "08:00", availabilityEnd: "22:00" };
  }

  const normalized = schedule.trim();

  const match = normalized.match(
    /(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i
  );

  if (!match) {
    return { availabilityStart: "08:00", availabilityEnd: "22:00" };
  }

  const [, h1, m1, ap1, h2, m2, ap2] = match;

  const to24Hour = (hour, minute, ampm) => {
    let h = parseInt(hour, 10);
    const upper = ampm.toUpperCase();

    if (upper === "AM" && h === 12) h = 0;
    if (upper === "PM" && h !== 12) h += 12;

    return `${String(h).padStart(2, "0")}:${minute}`;
  };

  return {
    availabilityStart: to24Hour(h1, m1, ap1),
    availabilityEnd: to24Hour(h2, m2, ap2),
  };
};

const ManageFacilities = () => {
  const { isAdmin } = useAuth();

  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [showForm, setShowForm] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("ACTIVE");

  const formRef = useRef(null);
  const fileInputRef = useRef(null);

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

  const setSafePreviewUrl = (nextUrl) => {
    setPreviewUrl((previous) => {
      if (previous && previous.startsWith("blob:") && previous !== nextUrl) {
        URL.revokeObjectURL(previous);
      }
      return nextUrl;
    });
  };

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const fetchFacilities = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await facilityAPI.getAll();
      setFacilities(normalizeArray(response));
    } catch (err) {
      setError(err.message || "Failed to load facilities.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, []);

  useEffect(() => {
    if (showForm && formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showForm, editingFacility]);

  const filteredFacilities = useMemo(() => {
    return facilities.filter((facility) => {
      const name = String(facility?.name || "").toLowerCase();
      const type = String(facility?.type || "").toUpperCase();
      const location = String(facility?.location || "").toLowerCase();
      const status = getFacilityStatus(facility);

      const matchesSearch =
        !searchText.trim() ||
        name.includes(searchText.toLowerCase()) ||
        location.includes(searchText.toLowerCase());

      const matchesType = typeFilter === "ALL" || type === typeFilter;
      const matchesStatus = statusFilter === "ALL" || status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [facilities, searchText, typeFilter, statusFilter]);

  const summary = useMemo(() => {
    const total = facilities.length;
    const active = facilities.filter(
      (facility) => getFacilityStatus(facility) === "ACTIVE"
    ).length;
    const outOfService = facilities.filter(
      (facility) => getFacilityStatus(facility) === "OUT_OF_SERVICE"
    ).length;
    const maintenance = facilities.filter(
      (facility) => getFacilityStatus(facility) === "MAINTENANCE"
    ).length;

    return { total, active, outOfService, maintenance };
  }, [facilities]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingFacility(null);
    setSelectedImageFile(null);
    setSafePreviewUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setShowForm(false);
  };

  const handleOpenCreate = () => {
    setMessage("");
    setError("");
    setEditingFacility(null);
    setForm(initialForm);
    setSelectedImageFile(null);
    setSafePreviewUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setShowForm(true);
  };

  const handleOpenEdit = (facility) => {
    setMessage("");
    setError("");
    setEditingFacility(facility);

    const parsedSchedule = parseAvailabilitySchedule(
      facility?.availabilitySchedule || ""
    );

    const existingImage =
      facility?.imageUrl || facility?.imageURL || facility?.image_url || "";

    setForm({
      name: facility?.name || "",
      type: facility?.type || "STUDY_ROOM",
      capacity: facility?.capacity || 10,
      location: facility?.location || "",
      description: facility?.description || "",
      availabilityStart: parsedSchedule.availabilityStart,
      availabilityEnd: parsedSchedule.availabilityEnd,
      imageUrl: existingImage,
    });

    setSelectedImageFile(null);
    setSafePreviewUrl(existingImage);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setShowForm(true);
  };

  const handleOpenStatusModal = (facility) => {
    setStatusTarget(facility);
    setSelectedStatus(getFacilityStatus(facility));
    setMessage("");
    setError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "imageUrl" && !selectedImageFile) {
      setSafePreviewUrl(value.trim());
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      setSelectedImageFile(null);
      setSafePreviewUrl(form.imageUrl.trim());
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Only JPG, JPEG, PNG, or WEBP images are allowed.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError("Facility image must be 5MB or smaller.");
      e.target.value = "";
      return;
    }

    setError("");
    setSelectedImageFile(file);
    setSafePreviewUrl(URL.createObjectURL(file));
  };

  const removeSelectedFile = () => {
    setSelectedImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setSafePreviewUrl(form.imageUrl.trim());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim() || !form.location.trim() || !form.description.trim()) {
      setError("Please fill all required facility details.");
      return;
    }

    if (!form.availabilityStart || !form.availabilityEnd) {
      setError("Please select both start time and end time.");
      return;
    }

    if (form.availabilityStart >= form.availabilityEnd) {
      setError("End time must be later than start time.");
      return;
    }

    try {
      setWorking(true);
      setError("");
      setMessage("");

      const formData = new FormData();
      formData.append("name", form.name.trim());
      formData.append("type", form.type);
      formData.append("capacity", String(parseInt(form.capacity, 10)));
      formData.append("location", form.location.trim());
      formData.append("description", form.description.trim());
      formData.append(
        "availabilitySchedule",
        buildAvailabilitySchedule(form.availabilityStart, form.availabilityEnd)
      );
      formData.append("imageUrl", form.imageUrl.trim());

      if (selectedImageFile) {
        formData.append("imageFile", selectedImageFile);
      }

      if (editingFacility?.id) {
        await facilityAPI.update(editingFacility.id, formData);
        setMessage("Facility updated successfully.");
      } else {
        await facilityAPI.create(formData);
        setMessage("Facility created successfully.");
      }

      resetForm();
      await fetchFacilities();
    } catch (err) {
      setError(err.message || "Failed to save facility.");
    } finally {
      setWorking(false);
    }
  };

  const handleStatusConfirm = async () => {
    if (!statusTarget) return;

    try {
      setWorking(true);
      setError("");
      setMessage("");

      await facilityAPI.updateStatus(statusTarget.id, selectedStatus);

      setMessage(
        `Facility status updated to ${formatStatusLabel(selectedStatus).toLowerCase()}.`
      );
      setStatusTarget(null);
      await fetchFacilities();
    } catch (err) {
      setError(err.message || "Failed to update facility status.");
    } finally {
      setWorking(false);
    }
  };

  const askDelete = (facility) => {
    setDeleteTarget(facility);
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;

    try {
      setWorking(true);
      setError("");
      setMessage("");
      await facilityAPI.delete(deleteTarget.id);
      setMessage("Facility deleted successfully.");
      setDeleteTarget(null);
      await fetchFacilities();
    } catch (err) {
      setError(err.message || "Failed to delete facility.");
    } finally {
      setWorking(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <section className="mx-auto max-w-4xl px-6 py-24">
          <div className="rounded-3xl bg-white p-12 text-center shadow-md ring-1 ring-slate-200">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-4xl">
              🔒
            </div>
            <h2 className="mt-5 text-3xl font-extrabold text-slate-900">
              Admin Only
            </h2>
            <p className="mt-3 text-slate-600">
              Facility management is only available for admin accounts.
            </p>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

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
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
            Admin Control
          </p>
          <h1 className="text-4xl font-extrabold md:text-5xl">
            Manage Facilities
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
            Create, edit, disable, and organize campus facilities used across the booking system.
          </p>

          <div className="mt-8">
            <button
              onClick={handleOpenCreate}
              className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-yellow-600"
            >
              Create Facility
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-8 grid max-w-7xl gap-5 px-6 sm:grid-cols-2 xl:grid-cols-4 lg:px-10">
        <SummaryCard title="Total Facilities" value={summary.total} icon="🏢" />
        <SummaryCard
          title="Active"
          value={summary.active}
          icon="✅"
          valueClass="text-green-600"
        />
        <SummaryCard
          title="Out of Service"
          value={summary.outOfService}
          icon="⛔"
          valueClass="text-red-600"
        />
        <SummaryCard
          title="Maintenance"
          value={summary.maintenance}
          icon="🛠️"
          valueClass="text-orange-600"
        />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        {showForm && (
          <div
            ref={formRef}
            className="mx-auto mb-8 max-w-5xl rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200 lg:p-6"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-600">
                  Facility Form
                </p>
                <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                  {editingFacility ? "Edit Facility" : "Create Facility"}
                </h2>
              </div>

              <button
                onClick={resetForm}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Facility Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Science Block 3"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Facility Type
                  </label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                  >
                    {facilityTypes.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="e.g. Floor 2, Main Campus"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Max Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    name="capacity"
                    value={form.capacity}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Available From
                  </label>
                  <input
                    type="time"
                    name="availabilityStart"
                    value={form.availabilityStart}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Available Until
                  </label>
                  <input
                    type="time"
                    name="availabilityEnd"
                    value={form.availabilityEnd}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                    required
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Final Availability Schedule
                </p>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  {buildAvailabilitySchedule(
                    form.availabilityStart,
                    form.availabilityEnd
                  )}
                </p>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  Specific dates are selected later by students or lecturers when they make a booking.
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Cover Image URL
                    </label>
                    <input
                      type="text"
                      name="imageUrl"
                      value={form.imageUrl}
                      onChange={handleChange}
                      placeholder="/facilities/lab-1.jpg or https://images.unsplash.com/..."
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                    />
                    <p className="mt-2 text-xs leading-6 text-slate-500">
                      Paste a direct image URL if you do not want to upload from your PC.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Upload from Computer
                        </p>
                        <p className="mt-1 text-xs leading-6 text-slate-500">
                          JPG, JPEG, PNG, or WEBP. Maximum 5MB.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
                      >
                        <UploadIcon />
                        Browse
                      </button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {selectedImageFile ? (
                      <div className="mt-4 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                        <p className="text-sm font-semibold text-slate-900">
                          {selectedImageFile.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Uploaded file will be used instead of the URL.
                        </p>

                        <button
                          type="button"
                          onClick={removeSelectedFile}
                          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          Remove uploaded file
                        </button>
                      </div>
                    ) : (
                      <p className="mt-4 text-xs leading-6 text-slate-500">
                        No image file selected. The system will use the URL above if provided.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Image Preview
                  </p>
                  <div className="mt-3 flex min-h-[240px] items-center justify-center overflow-hidden rounded-2xl bg-white">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Facility preview"
                        className="max-h-[260px] w-auto max-w-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex h-[220px] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-5xl">
                        🏢
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description
                </label>
                <textarea
                  name="description"
                  rows="3"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe the facility and its amenities..."
                  className="w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                  required
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={working}
                  className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-yellow-600 disabled:opacity-70"
                >
                  {working
                    ? editingFacility
                      ? "Updating..."
                      : "Creating..."
                    : editingFacility
                    ? "Update Facility"
                    : "Create Facility"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="mb-6 rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Search Facilities
              </label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search by name or location"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
              >
                <option value="ALL">All</option>
                {facilityTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
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
                <option value="ACTIVE">Active</option>
                <option value="OUT_OF_SERVICE">Out of Service</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-md ring-1 ring-slate-200">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
            <p className="mt-4 text-slate-600">Loading facilities...</p>
          </div>
        ) : filteredFacilities.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-md ring-1 ring-slate-200">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100 text-4xl">
              🏢
            </div>
            <h3 className="mt-5 text-2xl font-bold text-slate-900">
              No facilities found
            </h3>
            <p className="mt-3 text-slate-600">
              No facilities match the current filters.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredFacilities.map((facility) => {
              const status = getFacilityStatus(facility);
              const image = getFacilityImage(facility);
              const createdDate =
                facility?.createdAt ||
                facility?.createdDate ||
                facility?.dateCreated ||
                null;

              return (
                <div
                  key={facility.id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative h-36 bg-slate-100">
                    {image ? (
                      <img
                        src={image}
                        alt={facility.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-5xl">
                        🏢
                      </div>
                    )}

                    <div className="absolute left-3 top-3">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase shadow ${getStatusClasses(
                          status
                        )}`}
                      >
                        {formatStatusLabel(status)}
                      </span>
                    </div>

                    <div className="absolute right-3 top-3 flex items-center gap-2">
                      <ActionIconButton
                        title="Edit Facility"
                        onClick={() => handleOpenEdit(facility)}
                      >
                        <PencilIcon />
                      </ActionIconButton>

                      <ActionIconButton
                        title="Change Facility Status"
                        onClick={() => handleOpenStatusModal(facility)}
                        disabled={working}
                      >
                        <PowerIcon />
                      </ActionIconButton>

                      <ActionIconButton
                        title="Delete Facility"
                        onClick={() => askDelete(facility)}
                        disabled={working}
                        className="text-red-600"
                      >
                        <TrashIcon />
                      </ActionIconButton>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent"></div>
                  </div>

                  <div className="p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-yellow-600">
                      {String(facility.type || "FACILITY").replaceAll("_", " ")}
                    </p>

                    <h3 className="mt-2 text-xl font-extrabold leading-tight text-slate-900">
                      {facility.name}
                    </h3>

                    <p
                      className="mt-2 text-sm leading-6 text-slate-600"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {facility.description || "No description available."}
                    </p>

                    <div className="mt-4 rounded-2xl bg-slate-50 p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Location
                        </span>
                        <span className="text-right text-sm font-bold text-slate-900">
                          {facility.location || "N/A"}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between gap-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Capacity
                        </span>
                        <span className="text-right text-sm font-bold text-slate-900">
                          {facility.capacity || 0}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between gap-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Hours
                        </span>
                        <span className="text-right text-sm font-bold text-slate-900">
                          {facility.availabilitySchedule || "N/A"}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between gap-3">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          Added On
                        </span>
                        <span className="text-right text-sm font-bold text-slate-900">
                          {formatDate(createdDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <StatusModal
        facility={statusTarget}
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        onCancel={() => setStatusTarget(null)}
        onConfirm={handleStatusConfirm}
        working={working}
      />

      <ConfirmDeleteModal
        facility={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirmed}
        working={working}
      />

      <Footer />
    </div>
  );
};

export default ManageFacilities;