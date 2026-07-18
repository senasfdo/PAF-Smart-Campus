import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { useAuth } from "../../context/AuthContext";
import { announcementAPI } from "../../services/api";

const roleOptions = ["ALL", "STUDENT", "LECTURER", "TECHNICIAN", "MANAGER", "ADMIN"];
const priorityOptions = ["NORMAL", "IMPORTANT"];

const normalizeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const getTargetRoles = (item) => {
  if (Array.isArray(item?.targetRoles)) {
    return item.targetRoles.map((role) => String(role).toUpperCase());
  }

  if (item?.targetRole) {
    return [String(item.targetRole).toUpperCase()];
  }

  return [];
};

const getPriorityClasses = (priority = "") => {
  const value = String(priority).toUpperCase();

  switch (value) {
    case "IMPORTANT":
      return "bg-red-100 text-red-700";
    case "NORMAL":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const getTargetRoleClasses = (role = "") => {
  const value = String(role).toUpperCase();

  switch (value) {
    case "ALL":
      return "bg-slate-900 text-white";
    case "ADMIN":
      return "bg-red-100 text-red-700";
    case "MANAGER":
      return "bg-purple-100 text-purple-700";
    case "TECHNICIAN":
      return "bg-blue-100 text-blue-700";
    case "LECTURER":
      return "bg-green-100 text-green-700";
    case "STUDENT":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const formatDateTime = (value) => {
  if (!value) return "N/A";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const getRolePreview = (roles = [], max = 2) => {
  if (roles.includes("ALL")) {
    return {
      summary: "All users",
      visibleRoles: ["ALL"],
      extraCount: 0,
    };
  }

  return {
    summary: `${roles.length} role${roles.length === 1 ? "" : "s"}`,
    visibleRoles: roles.slice(0, max),
    extraCount: Math.max(roles.length - max, 0),
  };
};

const SummaryCard = ({ title, value, valueClass = "text-slate-900", icon }) => (
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

const AnnouncementFormModal = ({
  mode,
  form,
  setForm,
  onClose,
  onSubmit,
  working,
}) => {
  if (!form) return null;

  const isEdit = mode === "edit";
  const selectedRoles = Array.isArray(form.targetRoles) ? form.targetRoles : [];
  const allSelected = selectedRoles.includes("ALL");

  const handleRoleToggle = (role) => {
    setForm((prev) => {
      const current = Array.isArray(prev.targetRoles) ? prev.targetRoles : [];

      if (role === "ALL") {
        return {
          ...prev,
          targetRoles: current.includes("ALL") ? [] : ["ALL"],
        };
      }

      const withoutAll = current.filter((item) => item !== "ALL");
      const exists = withoutAll.includes(role);

      return {
        ...prev,
        targetRoles: exists
          ? withoutAll.filter((item) => item !== role)
          : [...withoutAll, role],
      };
    });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-3 sm:p-4">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-yellow-600">
              Admin Announcement Center
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
              {isEdit ? "Update Announcement" : "Create Announcement"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Send system-wide or role-based announcements to users through notifications.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Enter announcement title"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Message
              </label>
              <textarea
                value={form.message}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, message: e.target.value }))
                }
                rows={4}
                placeholder="Write announcement message"
                className="w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Target Roles
                </label>

                <div className="rounded-2xl border border-slate-300 bg-white p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {roleOptions.map((role) => {
                      const checked = selectedRoles.includes(role);
                      const disabled = allSelected && role !== "ALL";

                      return (
                        <label
                          key={role}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                            checked
                              ? "border-yellow-400 bg-yellow-50 text-yellow-700"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => handleRoleToggle(role)}
                            className="h-4 w-4 accent-yellow-500"
                          />
                          <span>{role}</span>
                        </label>
                      );
                    })}
                  </div>

                  <p className="mt-3 text-xs leading-6 text-slate-500">
                    Select <span className="font-semibold">ALL</span> to notify everyone, or choose multiple specific roles.
                  </p>

                  {selectedRoles.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedRoles.map((role) => (
                        <span
                          key={role}
                          className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${getTargetRoleClasses(
                            role
                          )}`}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, priority: e.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                  >
                    {priorityOptions.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </div>

                {isEdit && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Status
                    </label>
                    <select
                      value={String(form.active)}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          active: e.target.value === "true",
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="submit"
                disabled={working}
                className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-yellow-600 disabled:opacity-70"
              >
                {working
                  ? isEdit
                    ? "Updating..."
                    : "Creating..."
                  : isEdit
                  ? "Update Announcement"
                  : "Create Announcement"}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmModal = ({ item, onClose, onConfirm, working }) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl">
          🗑️
        </div>

        <h3 className="mt-5 text-2xl font-extrabold text-slate-900">
          Delete Announcement?
        </h3>

        <p className="mt-3 text-sm leading-7 text-slate-600">
          Are you sure you want to delete{" "}
          <span className="font-bold text-slate-900">
            {item?.title || "this announcement"}
          </span>
          ?
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
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

const ManageAnnouncements = () => {
  const { role } = useAuth();
  const normalizedRole = String(role || "").toUpperCase();
  const allowed = normalizedRole === "ADMIN" || normalizedRole === "MANAGER";

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const [formMode, setFormMode] = useState(null);
  const [form, setForm] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await announcementAPI.getAll();
      setAnnouncements(normalizeArray(response));
    } catch (err) {
      setError(err.message || "Failed to load announcements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allowed) {
      fetchAnnouncements();
    }
  }, [allowed]);

  useEffect(() => {
    if (!message && !error) return;

    const timer = setTimeout(() => {
      setMessage("");
      setError("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [message, error]);

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item) => {
      const title = String(item?.title || "").toLowerCase();
      const msg = String(item?.message || "").toLowerCase();
      const roles = getTargetRoles(item);

      const matchesSearch =
        !searchText.trim() ||
        title.includes(searchText.toLowerCase()) ||
        msg.includes(searchText.toLowerCase());

      const matchesRole =
        roleFilter === "ALL" ||
        roles.includes("ALL") ||
        roles.includes(roleFilter);

      return matchesSearch && matchesRole;
    });
  }, [announcements, searchText, roleFilter]);

  const summary = useMemo(() => {
    return {
      total: announcements.length,
      active: announcements.filter((a) => a?.active).length,
      important: announcements.filter(
        (a) => String(a?.priority || "").toUpperCase() === "IMPORTANT"
      ).length,
      allUsers: announcements.filter((a) =>
        getTargetRoles(a).includes("ALL")
      ).length,
    };
  }, [announcements]);

  const closeAlerts = () => {
    setMessage("");
    setError("");
  };

  const openAddModal = () => {
    setFormMode("add");
    setForm({
      title: "",
      message: "",
      targetRoles: [],
      priority: "NORMAL",
      active: true,
    });
  };

  const openEditModal = (item) => {
    setFormMode("edit");
    setForm({
      id: item.id,
      title: item.title || "",
      message: item.message || "",
      targetRoles: getTargetRoles(item),
      priority: item.priority || "NORMAL",
      active: Boolean(item.active),
    });
  };

  const closeFormModal = () => {
    setFormMode(null);
    setForm(null);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!form) return;

    if (!Array.isArray(form.targetRoles) || form.targetRoles.length === 0) {
      setError("Please select at least one target role.");
      return;
    }

    try {
      setWorking(true);
      setError("");
      setMessage("");

      if (formMode === "add") {
        await announcementAPI.create({
          title: form.title,
          message: form.message,
          targetRoles: form.targetRoles,
          priority: form.priority,
        });
        setMessage("Announcement created successfully.");
      } else {
        await announcementAPI.update(form.id, {
          title: form.title,
          message: form.message,
          targetRoles: form.targetRoles,
          priority: form.priority,
          active: form.active,
        });
        setMessage("Announcement updated successfully.");
      }

      closeFormModal();
      await fetchAnnouncements();
      window.dispatchEvent(new Event("notifications:changed"));
    } catch (err) {
      setError(err.message || "Failed to save announcement.");
    } finally {
      setWorking(false);
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!deleteTarget) return;

    try {
      setWorking(true);
      setError("");
      setMessage("");

      await announcementAPI.delete(deleteTarget.id);
      setMessage("Announcement deleted successfully.");
      setDeleteTarget(null);
      await fetchAnnouncements();
    } catch (err) {
      setError(err.message || "Failed to delete announcement.");
    } finally {
      setWorking(false);
    }
  };

  if (!allowed) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <section className="mx-auto max-w-4xl px-6 py-24">
          <div className="rounded-3xl bg-white p-12 text-center shadow-md ring-1 ring-slate-200">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-4xl">
              🔒
            </div>
            <h2 className="mt-5 text-3xl font-extrabold text-slate-900">
              Manager or Admin Only
            </h2>
            <p className="mt-3 text-slate-600">
              This page is only available for manager and admin accounts.
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

      <div className="pointer-events-none fixed right-4 top-20 z-[130] flex w-full max-w-sm flex-col gap-3">
        {message && (
          <AlertPopup type="success" text={message} onClose={closeAlerts} />
        )}
        {error && (
          <AlertPopup type="error" text={error} onClose={closeAlerts} />
        )}
      </div>

      <section className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
            Communication Center
          </p>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-extrabold md:text-5xl">
                Manage Announcements
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
                Create role-based announcements and push them into the system notification flow.
              </p>
            </div>

            <button
              type="button"
              onClick={openAddModal}
              className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-yellow-600"
            >
              Create Announcement
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-8 grid max-w-7xl gap-5 px-6 sm:grid-cols-2 xl:grid-cols-4 lg:px-10">
        <SummaryCard title="Total Announcements" value={summary.total} icon="📢" />
        <SummaryCard
          title="Active"
          value={summary.active}
          valueClass="text-green-600"
          icon="✅"
        />
        <SummaryCard
          title="Important"
          value={summary.important}
          valueClass="text-red-600"
          icon="⚠️"
        />
        <SummaryCard
          title="For All Users"
          value={summary.allUsers}
          valueClass="text-slate-900"
          icon="🌍"
        />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div className="mb-6 rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Search Announcements
              </label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search by title or message"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Target Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-md ring-1 ring-slate-200">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
            <p className="mt-4 text-slate-600">Loading announcements...</p>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-md ring-1 ring-slate-200">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100 text-4xl">
              📢
            </div>
            <h3 className="mt-5 text-2xl font-bold text-slate-900">
              No announcements found
            </h3>
            <p className="mt-3 text-slate-600">
              No announcements match the current filters.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="w-16 px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      ID
                    </th>
                    <th className="w-[34%] px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      Title
                    </th>
                    <th className="w-[22%] px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      Target
                    </th>
                    <th className="w-[12%] px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      Priority
                    </th>
                    <th className="w-[12%] px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      Status
                    </th>
                    <th className="w-[14%] px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      Created
                    </th>
                    <th className="w-[14%] px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {filteredAnnouncements.map((item) => {
                    const roles = getTargetRoles(item);
                    const rolePreview = getRolePreview(roles);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 align-top">
                        <td className="px-5 py-5 text-sm font-semibold text-slate-700 align-middle">
                          {item.id}
                        </td>

                        <td className="px-5 py-5">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 break-words">
                              {item.title}
                            </p>
                            <p className="mt-2 max-w-[520px] text-sm leading-7 text-slate-600 break-words">
                              {item.message}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <div className="max-w-[220px]">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {rolePreview.summary}
                            </p>

                            <div className="flex flex-wrap gap-2">
                              {rolePreview.visibleRoles.map((role) => (
                                <span
                                  key={`${item.id}-${role}`}
                                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${getTargetRoleClasses(
                                    role
                                  )}`}
                                >
                                  {role}
                                </span>
                              ))}

                              {rolePreview.extraCount > 0 && (
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-700">
                                  +{rolePreview.extraCount} more
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-5 align-middle">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase ${getPriorityClasses(
                              item.priority
                            )}`}
                          >
                            {item.priority || "N/A"}
                          </span>
                        </td>

                        <td className="px-5 py-5 align-middle">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase ${
                              item.active
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {item.active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="px-5 py-5 text-sm leading-6 text-slate-700 align-middle break-words">
                          {formatDateTime(item.createdAt)}
                        </td>

                        <td className="px-5 py-5 align-middle">
                          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 whitespace-nowrap"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 whitespace-nowrap"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <AnnouncementFormModal
        mode={formMode}
        form={form}
        setForm={setForm}
        onClose={closeFormModal}
        onSubmit={handleSubmitForm}
        working={working}
      />

      <DeleteConfirmModal
        item={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteAnnouncement}
        working={working}
      />

      <Footer />
    </div>
  );
};

export default ManageAnnouncements;