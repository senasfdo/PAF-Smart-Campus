import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { useAuth } from "../../context/AuthContext";
import { notificationAPI } from "../../services/api";

const normalizeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.notifications)) return data.notifications;
  return [];
};

const getNotificationId = (notification, index) =>
  notification?.id || notification?.notificationId || `notification-${index}`;

const getNotificationTitle = (notification) =>
  notification?.title ||
  notification?.subject ||
  notification?.type ||
  "Notification";

const getNotificationMessage = (notification) =>
  notification?.message ||
  notification?.content ||
  notification?.description ||
  notification?.body ||
  "No notification details available.";

const getNotificationType = (notification) =>
  notification?.type || notification?.category || "GENERAL";

const getNotificationLink = (notification) =>
  notification?.link || notification?.url || notification?.path || "";

const getCreatedAt = (notification) =>
  notification?.createdAt ||
  notification?.createdDate ||
  notification?.timestamp ||
  notification?.date;

const isReadNotification = (notification) => {
  if (typeof notification?.read === "boolean") return notification.read;
  if (typeof notification?.isRead === "boolean") return notification.isRead;
  if (typeof notification?.readStatus === "string") {
    return notification.readStatus.toUpperCase() === "READ";
  }
  if (typeof notification?.status === "string") {
    return notification.status.toUpperCase() === "READ";
  }
  return false;
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
};

const formatRelativeTime = (value) => {
  if (!value) return "Unknown time";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} day ago`;

  return date.toLocaleDateString();
};

const getTypeBadgeClasses = (type = "") => {
  const value = String(type).toUpperCase();

  if (value.includes("BOOKING")) return "bg-blue-100 text-blue-700";
  if (value.includes("TICKET")) return "bg-yellow-100 text-yellow-700";
  if (value.includes("REJECT")) return "bg-red-100 text-red-700";
  if (value.includes("APPROVE") || value.includes("RESOLVE"))
    return "bg-green-100 text-green-700";

  return "bg-slate-100 text-slate-700";
};

const getDashboardPathByRole = (role = "") => {
  switch (String(role).toUpperCase()) {
    case "STUDENT":
      return "/student";
    case "LECTURER":
      return "/lecturer";
    case "TECHNICIAN":
      return "/technician";
    case "MANAGER":
      return "/manager";
    case "ADMIN":
      return "/admin";
    default:
      return "/";
  }
};

const inferNotificationTarget = (notification, role, dashboardPath) => {
  const explicitLink = getNotificationLink(notification);

  if (explicitLink) return explicitLink;

  const text = `${getNotificationTitle(notification)} ${getNotificationMessage(
    notification
  )} ${getNotificationType(notification)}`.toUpperCase();

  const normalizedRole = String(role || "").toUpperCase();

  if (text.includes("BOOKING")) {
    if (normalizedRole === "ADMIN") return "/admin/bookings";
    if (normalizedRole === "MANAGER") return "/manager/bookings";
    return "/my-bookings";
  }

  if (text.includes("TICKET")) {
    if (normalizedRole === "ADMIN") return "/admin/tickets";
    if (normalizedRole === "MANAGER") return "/manager/tickets";
    if (normalizedRole === "TECHNICIAN") return "/technician/tickets";
    return "/my-tickets";
  }

  if (text.includes("FACILITY")) {
    if (normalizedRole === "ADMIN") return "/admin/facilities";
    return "/facilities";
  }

  return dashboardPath || getDashboardPathByRole(role);
};

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

const StatCard = ({ title, value, subtitle, valueClass = "text-slate-900" }) => (
  <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
    <p className="text-sm font-medium text-slate-500">{title}</p>
    <h3 className={`mt-2 text-3xl font-extrabold ${valueClass}`}>{value}</h3>
    <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
  </div>
);

const EmptyState = ({ dashboardPath = "/" }) => (
  <div className="overflow-hidden rounded-[32px] bg-white shadow-sm ring-1 ring-slate-200">
    <div className="grid lg:grid-cols-[320px,1fr]">
      <div className="flex items-center justify-center bg-gradient-to-br from-yellow-50 via-white to-slate-50 p-10 lg:p-12">
        <div className="text-center">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-yellow-100 text-5xl shadow-sm">
            🔔
          </div>
          <div className="mt-5 space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-600">
              Notification Center
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900">
              0 Notifications
            </h3>
          </div>
        </div>
      </div>

      <div className="p-8 lg:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
          Updates
        </p>
        <h2 className="mt-3 text-3xl font-extrabold text-slate-900">
          No notifications yet
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
          When bookings or tickets are updated, you will see the latest alerts here.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            to={dashboardPath}
            className="rounded-2xl bg-yellow-500 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-yellow-600"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  </div>
);

const emitNotificationsChanged = () => {
  window.dispatchEvent(new Event("notifications:changed"));
};

const Notifications = () => {
  const navigate = useNavigate();
  const { dashboardPath, role } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingKey, setWorkingKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState("ALL");

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await notificationAPI.getAll();
      const normalized = normalizeArray(response);

      const sorted = [...normalized].sort((a, b) => {
        const dateA = new Date(getCreatedAt(a) || 0).getTime();
        const dateB = new Date(getCreatedAt(b) || 0).getTime();
        return dateB - dateA;
      });

      setNotifications(sorted);
    } catch (err) {
      setError(err.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 8000);

    const handleFocus = () => fetchNotifications();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchNotifications();
      }
    };

    const handleNotificationsChanged = () => fetchNotifications();

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("notifications:changed", handleNotificationsChanged);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(
        "notifications:changed",
        handleNotificationsChanged
      );
    };
  }, []);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      const title = getNotificationTitle(notification).toLowerCase();
      const msg = getNotificationMessage(notification).toLowerCase();
      const type = String(getNotificationType(notification)).toLowerCase();
      const read = isReadNotification(notification);

      const matchesSearch =
        !searchText.trim() ||
        title.includes(searchText.toLowerCase()) ||
        msg.includes(searchText.toLowerCase()) ||
        type.includes(searchText.toLowerCase());

      const matchesFilter =
        filter === "ALL" ||
        (filter === "UNREAD" && !read) ||
        (filter === "READ" && read);

      return matchesSearch && matchesFilter;
    });
  }, [notifications, searchText, filter]);

  const stats = useMemo(() => {
    const unread = notifications.filter((n) => !isReadNotification(n)).length;
    const read = notifications.filter((n) => isReadNotification(n)).length;

    return {
      total: notifications.length,
      unread,
      read,
    };
  }, [notifications]);

  const handleMarkAsRead = async (id) => {
    try {
      setWorkingKey(`read-${id}`);
      setError("");
      setMessage("");
      await notificationAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((item, index) => {
          const currentId = getNotificationId(item, index);
          if (String(currentId) !== String(id)) return item;
          return { ...item, read: true, isRead: true, readStatus: "READ" };
        })
      );
      setMessage("Notification marked as read.");
      emitNotificationsChanged();
    } catch (err) {
      setError(err.message || "Failed to mark notification as read.");
    } finally {
      setWorkingKey("");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setWorkingKey("read-all");
      setError("");
      setMessage("");
      await notificationAPI.markAllAsRead();
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          read: true,
          isRead: true,
          readStatus: "READ",
        }))
      );
      setMessage("All notifications marked as read.");
      emitNotificationsChanged();
    } catch (err) {
      setError(err.message || "Failed to mark all notifications as read.");
    } finally {
      setWorkingKey("");
    }
  };

  const handleDelete = async (id) => {
    try {
      setWorkingKey(`delete-${id}`);
      setError("");
      setMessage("");
      await notificationAPI.delete(id);
      setNotifications((prev) =>
        prev.filter((item, index) => {
          const currentId = getNotificationId(item, index);
          return String(currentId) !== String(id);
        })
      );
      setMessage("Notification deleted.");
      emitNotificationsChanged();
    } catch (err) {
      setError(err.message || "Failed to delete notification.");
    } finally {
      setWorkingKey("");
    }
  };

  const handleDeleteAllRead = async () => {
    try {
      setWorkingKey("delete-read");
      setError("");
      setMessage("");
      await notificationAPI.deleteAllRead();
      setNotifications((prev) => prev.filter((item) => !isReadNotification(item)));
      setMessage("All read notifications deleted.");
      emitNotificationsChanged();
    } catch (err) {
      setError(err.message || "Failed to delete read notifications.");
    } finally {
      setWorkingKey("");
    }
  };

  const handleOpenNotification = async (notification) => {
    const id = getNotificationId(notification, 0);
    const target = inferNotificationTarget(notification, role, dashboardPath);

    if (!isReadNotification(notification)) {
      try {
        await notificationAPI.markAsRead(id);
        setNotifications((prev) =>
          prev.map((item, index) => {
            const currentId = getNotificationId(item, index);
            if (String(currentId) !== String(id)) return item;
            return { ...item, read: true, isRead: true, readStatus: "READ" };
          })
        );
        emitNotificationsChanged();
      } catch {
        // ignore navigation even if mark-as-read fails
      }
    }

    if (!target) return;

    if (target.startsWith("http://") || target.startsWith("https://")) {
      window.location.href = target;
      return;
    }

    navigate(target);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <section className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
            Update Center
          </p>
          <h1 className="text-4xl font-extrabold md:text-5xl">Notifications</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
            View booking and ticket updates, mark notifications as read, and keep your dashboard clean.
          </p>
        </div>
      </section>

      <section className="mx-auto -mt-8 grid max-w-7xl gap-5 px-6 sm:grid-cols-2 xl:grid-cols-3 lg:px-10">
        <StatCard
          title="Total Notifications"
          value={stats.total}
          subtitle="All notifications in your account"
        />
        <StatCard
          title="Unread"
          value={stats.unread}
          subtitle="Need your attention"
          valueClass="text-yellow-600"
        />
        <StatCard
          title="Read"
          value={stats.read}
          subtitle="Already reviewed"
          valueClass="text-green-600"
        />
      </section>

      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        {(message || error) && (
          <div className="mb-6 space-y-3">
            {message && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                {message}
              </div>
            )}
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}
          </div>
        )}

        <div className="mb-6 rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
          <div className="grid gap-4 lg:grid-cols-[1fr,auto]">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Search Notifications
                </label>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search by title, message, or type"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Filter
                </label>
                <div className="flex flex-wrap gap-2">
                  <FilterButton
                    active={filter === "ALL"}
                    label="All"
                    onClick={() => setFilter("ALL")}
                  />
                  <FilterButton
                    active={filter === "UNREAD"}
                    label="Unread"
                    onClick={() => setFilter("UNREAD")}
                  />
                  <FilterButton
                    active={filter === "READ"}
                    label="Read"
                    onClick={() => setFilter("READ")}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={workingKey === "read-all" || stats.unread === 0}
                className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
              >
                {workingKey === "read-all" ? "Marking..." : "Mark All Read"}
              </button>

              <button
                type="button"
                onClick={handleDeleteAllRead}
                disabled={workingKey === "delete-read" || stats.read === 0}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {workingKey === "delete-read" ? "Deleting..." : "Delete Read"}
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-sm ring-1 ring-slate-200">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
            <p className="mt-4 text-slate-600">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <EmptyState dashboardPath={dashboardPath || "/"} />
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification, index) => {
              const id = getNotificationId(notification, index);
              const title = getNotificationTitle(notification);
              const content = getNotificationMessage(notification);
              const type = getNotificationType(notification);
              const createdAt = getCreatedAt(notification);
              const isRead = isReadNotification(notification);
              const target = inferNotificationTarget(
                notification,
                role,
                dashboardPath
              );

              return (
                <div
                  key={id}
                  onClick={() => handleOpenNotification(notification)}
                  className={`cursor-pointer rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md ${
                    isRead
                      ? "border-slate-200 ring-1 ring-slate-100"
                      : "border-yellow-200 ring-2 ring-yellow-100"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div
                        className={`mt-1 h-3.5 w-3.5 flex-shrink-0 rounded-full ${
                          isRead ? "bg-slate-300" : "bg-yellow-500"
                        }`}
                      ></div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-extrabold text-slate-900">
                            {title}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${getTypeBadgeClasses(
                              type
                            )}`}
                          >
                            {String(type).replaceAll("_", " ")}
                          </span>

                          {!isRead && (
                            <span className="rounded-full bg-yellow-100 px-3 py-1 text-[11px] font-bold uppercase text-yellow-700">
                              Unread
                            </span>
                          )}
                        </div>

                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          {content}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-400">
                          <span>{formatRelativeTime(createdAt)}</span>
                          <span>{formatDateTime(createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {!isRead && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(id);
                          }}
                          disabled={workingKey === `read-${id}`}
                          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
                        >
                          {workingKey === `read-${id}` ? "Marking..." : "Mark Read"}
                        </button>
                      )}

                      {target && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenNotification(notification);
                          }}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Open
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(id);
                        }}
                        disabled={workingKey === `delete-${id}`}
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                      >
                        {workingKey === `delete-${id}` ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Notifications;