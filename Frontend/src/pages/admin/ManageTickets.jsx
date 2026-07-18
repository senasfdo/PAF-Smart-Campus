import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { useAuth } from "../../context/AuthContext";
import { ticketAPI, commentAPI } from "../../services/api";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8084";

const COMMENT_EDIT_WINDOW_MS = 5 * 60 * 1000;

const OVERDUE_HOURS = {
  HIGH: 6,
  MEDIUM: 24,
  LOW: 48,
};

const normalizeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const normalizeComments = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.comments)) return data.comments;
  return [];
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

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
};

const getStatusClasses = (status) => {
  const value = (status || "").toUpperCase();

  switch (value) {
    case "OPEN":
      return "bg-blue-100 text-blue-700";
    case "IN_PROGRESS":
      return "bg-yellow-100 text-yellow-700";
    case "RESOLVED":
      return "bg-green-100 text-green-700";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    case "CLOSED":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const getPriorityClasses = (priority) => {
  const value = (priority || "").toUpperCase();

  switch (value) {
    case "HIGH":
      return "bg-red-100 text-red-700";
    case "MEDIUM":
      return "bg-orange-100 text-orange-700";
    case "LOW":
      return "bg-green-100 text-green-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const toAbsoluteUrl = (raw) => {
  if (!raw || typeof raw !== "string") return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${BACKEND_URL}${raw}`;
  return `${BACKEND_URL}/${raw}`;
};

const getTicketImages = (ticket) => {
  const images = [];

  const direct =
    ticket?.imageUrl ||
    ticket?.image ||
    ticket?.screenshotUrl ||
    ticket?.attachmentUrl ||
    ticket?.attachmentPath;

  if (direct) {
    images.push(toAbsoluteUrl(direct));
  }

  if (Array.isArray(ticket?.attachments) && ticket.attachments.length > 0) {
    ticket.attachments.forEach((item) => {
      const url = toAbsoluteUrl(
        item?.url ||
          item?.path ||
          item?.fileUrl ||
          item?.downloadUrl ||
          item?.attachmentUrl
      );

      if (url) images.push(url);
    });
  }

  if (Array.isArray(ticket?.attachmentUrls) && ticket.attachmentUrls.length > 0) {
    ticket.attachmentUrls.forEach((url) => {
      const normalized = toAbsoluteUrl(url);
      if (normalized) images.push(normalized);
    });
  }

  return [...new Set(images.filter(Boolean))];
};

const getTicketImage = (ticket) => {
  const images = getTicketImages(ticket);
  return images[0] || "";
};

const getAssignedTechnician = (ticket) => {
  return (
    ticket?.assignedTechnician?.name ||
    ticket?.assignedTechnician?.fullName ||
    ticket?.assignedTo?.name ||
    ticket?.assignedTo?.fullName ||
    ticket?.technicianName ||
    "Not assigned"
  );
};

const getUserLabel = (user) => {
  const name =
    user?.name || user?.fullName || user?.username || user?.displayName || "User";
  const email = user?.email ? ` (${user.email})` : "";
  return `${name}${email}`;
};

const getCommentId = (comment, index = 0) =>
  comment?.id || comment?.commentId || `comment-${index}`;

const getCommentContent = (comment) =>
  comment?.content ||
  comment?.message ||
  comment?.text ||
  comment?.comment ||
  "";

const getCommentCreatedAt = (comment) =>
  comment?.createdAt ||
  comment?.createdDate ||
  comment?.timestamp ||
  comment?.date ||
  comment?.updatedAt;

const getCommentAuthorObject = (comment) =>
  comment?.user || comment?.author || comment?.createdBy || comment?.owner || null;

const getCommentAuthorName = (comment) => {
  const author = getCommentAuthorObject(comment);

  return (
    author?.name ||
    author?.fullName ||
    author?.username ||
    author?.displayName ||
    comment?.authorName ||
    comment?.createdByName ||
    comment?.userName ||
    "User"
  );
};

const getCommentAuthorRole = (comment) => {
  const author = getCommentAuthorObject(comment);

  return (
    author?.role ||
    comment?.authorRole ||
    comment?.userRole ||
    comment?.createdByRole ||
    ""
  );
};

const getCommentAuthorIdentifier = (comment) => {
  const author = getCommentAuthorObject(comment);

  return (
    author?.id ||
    author?.userId ||
    comment?.userId ||
    comment?.authorId ||
    comment?.createdById ||
    author?.email ||
    comment?.email ||
    comment?.authorEmail ||
    getCommentAuthorName(comment).trim().toLowerCase()
  );
};

const areSameCommentAuthors = (firstComment, secondComment) => {
  return (
    String(getCommentAuthorIdentifier(firstComment)) ===
    String(getCommentAuthorIdentifier(secondComment))
  );
};

const isUsersComment = (comment, user) => {
  if (!user) return false;

  const author = getCommentAuthorObject(comment);

  const commentUserId =
    author?.id ||
    author?.userId ||
    comment?.userId ||
    comment?.authorId ||
    comment?.createdById;

  const currentUserId = user?.id || user?.userId;

  if (commentUserId && currentUserId) {
    return String(commentUserId) === String(currentUserId);
  }

  const commentEmail =
    author?.email || comment?.email || comment?.authorEmail || "";
  const currentEmail = user?.email || "";

  if (commentEmail && currentEmail) {
    return commentEmail.toLowerCase() === currentEmail.toLowerCase();
  }

  const commentName = getCommentAuthorName(comment).trim().toLowerCase();
  const currentName = (
    user?.name ||
    user?.fullName ||
    user?.username ||
    user?.displayName ||
    ""
  )
    .trim()
    .toLowerCase();

  return Boolean(commentName && currentName && commentName === currentName);
};

const isCommentWithinEditWindow = (comment) => {
  const createdAt = getCommentCreatedAt(comment);
  if (!createdAt) return false;

  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) return false;

  return Date.now() - createdTime <= COMMENT_EDIT_WINDOW_MS;
};

const hasOtherUserReplyAfterComment = (comment, comments) => {
  const createdAt = getCommentCreatedAt(comment);
  const createdTime = new Date(createdAt).getTime();

  if (Number.isNaN(createdTime)) return false;

  return comments.some((otherComment) => {
    if (String(getCommentId(otherComment)) === String(getCommentId(comment))) {
      return false;
    }

    const otherCreatedTime = new Date(getCommentCreatedAt(otherComment)).getTime();
    if (Number.isNaN(otherCreatedTime)) return false;

    return (
      otherCreatedTime > createdTime &&
      !areSameCommentAuthors(comment, otherComment)
    );
  });
};

const getCommentLockReason = (comment, comments) => {
  if (!isCommentWithinEditWindow(comment)) {
    return "Edit/Delete available only for 5 minutes.";
  }

  if (hasOtherUserReplyAfterComment(comment, comments)) {
    return "Edit/Delete locked because another user replied.";
  }

  return "";
};

const canManageComment = (comment, comments, user) => {
  if (!isUsersComment(comment, user)) return false;
  if (!isCommentWithinEditWindow(comment)) return false;
  if (hasOtherUserReplyAfterComment(comment, comments)) return false;
  return true;
};

const getTicketCreatedTime = (ticket) => {
  const raw = ticket?.createdAt || ticket?.createdDate;
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const getTicketPriority = (ticket) =>
  String(ticket?.priority || "MEDIUM").toUpperCase();

const getTicketStatus = (ticket) =>
  String(ticket?.status || "").toUpperCase();

const getOverdueThresholdHours = (ticket) => {
  const priority = getTicketPriority(ticket);
  return OVERDUE_HOURS[priority] ?? OVERDUE_HOURS.MEDIUM;
};

const isOverdueTicket = (ticket) => {
  const status = getTicketStatus(ticket);

  if (!["OPEN", "IN_PROGRESS"].includes(status)) {
    return false;
  }

  const createdTime = getTicketCreatedTime(ticket);
  if (!createdTime) return false;

  const thresholdHours = getOverdueThresholdHours(ticket);
  const elapsedHours = (Date.now() - createdTime) / (1000 * 60 * 60);

  return elapsedHours >= thresholdHours;
};

const getOverdueAgeLabel = (ticket) => {
  const createdTime = getTicketCreatedTime(ticket);
  if (!createdTime) return "N/A";

  const elapsedMs = Date.now() - createdTime;
  const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h old`;
  }

  return `${hours}h old`;
};

const getOverdueByLabel = (ticket) => {
  const threshold = getOverdueThresholdHours(ticket);
  return `${threshold}h SLA`;
};

const SliderArrowButton = ({ direction = "left", onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="absolute top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md transition hover:bg-white"
    style={direction === "left" ? { left: "12px" } : { right: "12px" }}
  >
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      {direction === "left" ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.3"
          d="M15 19l-7-7 7-7"
        />
      ) : (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.3"
          d="M9 5l7 7-7 7"
        />
      )}
    </svg>
  </button>
);

const SliderCounter = ({ current, total }) => {
  if (total <= 1) return null;

  return (
    <div className="absolute bottom-3 right-3 z-20 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
      {current + 1} / {total}
    </div>
  );
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

const MetaItem = ({ label, value }) => (
  <div>
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      {label}
    </p>
    <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
  </div>
);

const OverdueWarningPanel = ({ overdueTickets }) => {
  if (!overdueTickets.length) return null;

  return (
    <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-5 shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-600">
            Needs Immediate Attention
          </p>
          <h3 className="mt-2 text-2xl font-extrabold text-red-700">
            {overdueTickets.length} overdue ticket{overdueTickets.length === 1 ? "" : "s"}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-red-700">
            These support requests have passed their response target and have been pushed to the top of the dashboard.
          </p>
        </div>

        <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-red-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Priority SLA
          </p>
          <p className="mt-1 text-sm font-bold text-slate-900">
            High: 6h • Medium: 24h • Low: 48h
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {overdueTickets.slice(0, 3).map((ticket, index) => {
          const id = ticket?.id || ticket?.ticketId || `overdue-${index}`;
          const title = ticket?.title || ticket?.subject || "Untitled Ticket";

          return (
            <div
              key={id}
              className="rounded-2xl border border-red-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                    Ticket #{id}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm font-bold text-slate-900">
                    {title}
                  </p>
                </div>

                <span className="rounded-full bg-red-100 px-3 py-1 text-[11px] font-bold uppercase text-red-700">
                  Overdue
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${getPriorityClasses(ticket?.priority)}`}>
                  {ticket?.priority || "N/A"}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${getStatusClasses(ticket?.status)}`}>
                  {ticket?.status || "N/A"}
                </span>
              </div>

              <p className="mt-3 text-xs font-medium text-slate-500">
                {getOverdueAgeLabel(ticket)} • {getOverdueByLabel(ticket)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CommentThread = ({ ticketId }) => {
  const { user } = useAuth();

  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentInput, setCommentInput] = useState("");
  const [commentError, setCommentError] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingContent, setEditingContent] = useState("");
  const [actionKey, setActionKey] = useState("");

  const fetchComments = async () => {
    if (!ticketId) return;

    try {
      setCommentsLoading(true);
      setCommentError("");

      const response = await commentAPI.getByTicket(ticketId);
      const normalized = normalizeComments(response);

      const sorted = [...normalized].sort((a, b) => {
        const dateA = new Date(getCommentCreatedAt(a) || 0).getTime();
        const dateB = new Date(getCommentCreatedAt(b) || 0).getTime();
        return dateA - dateB;
      });

      setComments(sorted);
    } catch (err) {
      const message = err?.message || "Failed to load comments.";

      if (
        message.toLowerCase().includes("404") ||
        message.toLowerCase().includes("not found")
      ) {
        setComments([]);
        setCommentError("");
      } else {
        setCommentError(message);
      }
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [ticketId]);

  const handleAddComment = async () => {
    if (!commentInput.trim()) {
      setCommentError("Comment cannot be empty.");
      return;
    }

    try {
      setSubmittingComment(true);
      setCommentError("");

      await commentAPI.add(ticketId, commentInput.trim());
      setCommentInput("");
      await fetchComments();
    } catch (err) {
      setCommentError(err.message || "Failed to add comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSaveEdit = async (commentId) => {
    const targetComment = comments.find(
      (comment) => String(getCommentId(comment)) === String(commentId)
    );

    if (!targetComment) {
      setCommentError("Comment not found.");
      return;
    }

    if (!canManageComment(targetComment, comments, user)) {
      setCommentError(getCommentLockReason(targetComment, comments));
      setEditingCommentId(null);
      setEditingContent("");
      return;
    }

    if (!editingContent.trim()) {
      setCommentError("Comment cannot be empty.");
      return;
    }

    try {
      setActionKey(`edit-${commentId}`);
      setCommentError("");

      await commentAPI.update(commentId, editingContent.trim());
      setEditingCommentId(null);
      setEditingContent("");
      await fetchComments();
    } catch (err) {
      setCommentError(err.message || "Failed to update comment.");
    } finally {
      setActionKey("");
    }
  };

  const handleDeleteComment = async (commentId) => {
    const targetComment = comments.find(
      (comment) => String(getCommentId(comment)) === String(commentId)
    );

    if (!targetComment) {
      setCommentError("Comment not found.");
      return;
    }

    if (!canManageComment(targetComment, comments, user)) {
      setCommentError(getCommentLockReason(targetComment, comments));
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this comment?"
    );

    if (!confirmed) return;

    try {
      setActionKey(`delete-${commentId}`);
      setCommentError("");

      await commentAPI.delete(commentId);
      await fetchComments();
    } catch (err) {
      setCommentError(err.message || "Failed to delete comment.");
    } finally {
      setActionKey("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-900">Conversation Thread</p>

          <button
            type="button"
            onClick={fetchComments}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {commentError && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {commentError}
          </div>
        )}

        {commentsLoading ? (
          <div className="py-8 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
            <p className="mt-3 text-sm text-slate-500">Loading comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center">
            <p className="text-sm font-semibold text-slate-700">
              No comments yet
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Start the conversation by posting the first comment.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {comments.map((comment, index) => {
              const commentId = getCommentId(comment, index);
              const isOwn = isUsersComment(comment, user);
              const authorName = getCommentAuthorName(comment);
              const authorRole = getCommentAuthorRole(comment);
              const createdAt = getCommentCreatedAt(comment);
              const content = getCommentContent(comment);
              const canManageOwn = canManageComment(comment, comments, user);
              const lockReason =
                isOwn && !canManageOwn ? getCommentLockReason(comment, comments) : "";

              return (
                <div
                  key={commentId}
                  className={`rounded-2xl border p-4 shadow-sm ${
                    isOwn
                      ? "border-yellow-200 bg-yellow-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">
                          {authorName}
                        </p>

                        {authorRole && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase text-slate-600">
                            {String(authorRole).replaceAll("_", " ")}
                          </span>
                        )}

                        {isOwn && (
                          <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-[11px] font-bold uppercase text-yellow-700">
                            You
                          </span>
                        )}

                        {isOwn && !canManageOwn && (
                          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-bold uppercase text-slate-700">
                            Locked
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs font-medium text-slate-400">
                        {formatDateTime(createdAt)}
                      </p>

                      {lockReason && (
                        <p className="mt-2 text-xs font-medium text-red-600">
                          {lockReason}
                        </p>
                      )}
                    </div>

                    {isOwn && editingCommentId !== commentId && canManageOwn && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCommentId(commentId);
                            setEditingContent(content);
                            setCommentError("");
                          }}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteComment(commentId)}
                          disabled={actionKey === `delete-${commentId}`}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-70"
                        >
                          {actionKey === `delete-${commentId}`
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    )}
                  </div>

                  {editingCommentId === commentId ? (
                    <div className="mt-3 space-y-3">
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        rows={4}
                        className="w-full resize-none rounded-2xl border border-slate-300 bg-white p-4 text-sm leading-7 text-slate-700 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                      />

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(commentId)}
                          disabled={actionKey === `edit-${commentId}`}
                          className="rounded-xl bg-yellow-500 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-yellow-600 disabled:opacity-70"
                        >
                          {actionKey === `edit-${commentId}`
                            ? "Saving..."
                            : "Save"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditingContent("");
                            setCommentError("");
                          }}
                          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-7 text-slate-700">
                      {content || "No content available."}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-slate-900">Add Comment</p>
        <textarea
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          rows={4}
          placeholder="Write your comment here..."
          className="mt-3 w-full resize-none rounded-2xl border border-slate-300 bg-white p-4 text-sm leading-7 text-slate-700 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
        />

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleAddComment}
            disabled={submittingComment}
            className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-yellow-600 disabled:opacity-70"
          >
            {submittingComment ? "Posting..." : "Post Comment"}
          </button>
        </div>
      </div>
    </div>
  );
};

const TicketDetailsModal = ({
  ticket,
  technicians,
  techniciansLoading,
  onClose,
  onAssign,
  onReject,
  onCloseTicket,
  working,
}) => {
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (ticket) {
      setSelectedTechnicianId("");
      setRejectReason("");
      setError("");
      setCurrentImageIndex(0);
    }
  }, [ticket]);

  if (!ticket) return null;

  const id = ticket?.id || ticket?.ticketId || "N/A";
  const title = ticket?.title || ticket?.subject || "Untitled Ticket";
  const description =
    ticket?.description ||
    ticket?.issueDescription ||
    "No description available.";
  const category = ticket?.category || ticket?.type || "General";
  const priority = ticket?.priority || "N/A";
  const status = ticket?.status || "N/A";
  const normalizedStatus = (status || "").toUpperCase();
  const createdAt = ticket?.createdAt || ticket?.createdDate;
  const location = ticket?.location || "Not specified";
  const resourceName = ticket?.resourceName || "Not specified";
  const contactEmail = ticket?.contactEmail || "Not available";
  const contactPhone = ticket?.contactPhone || "Not available";
  const assignedTechnician = getAssignedTechnician(ticket);
  const imageUrls = getTicketImages(ticket);
  const imageUrl = imageUrls[currentImageIndex] || getTicketImage(ticket);
  const resolutionNotes = ticket?.resolutionNotes || "";
  const savedRejectionReason = ticket?.rejectionReason || "";

  const canAssign =
    !ticket?.assignedTo &&
    !ticket?.assignedTechnician &&
    normalizedStatus === "OPEN";

  const canReject = normalizedStatus === "OPEN";
  const canCloseTicket = normalizedStatus === "RESOLVED";
  const noTechniciansAvailable = !techniciansLoading && technicians.length === 0;
  const showSliderControls = imageUrls.length > 1;

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? imageUrls.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === imageUrls.length - 1 ? 0 : prev + 1
    );
  };

  const handleAssignClick = async () => {
    if (!selectedTechnicianId) {
      setError("Please select a technician.");
      return;
    }

    try {
      setError("");
      await onAssign(id, selectedTechnicianId);
    } catch (err) {
      setError(err.message || "Failed to assign technician.");
    }
  };

  const handleRejectClick = async () => {
    if (!rejectReason.trim()) {
      setError("Please enter a rejection reason.");
      return;
    }

    try {
      setError("");
      await onReject(id, rejectReason.trim());
    } catch (err) {
      setError(err.message || "Failed to reject ticket.");
    }
  };

  const handleCloseTicketClick = async () => {
    try {
      setError("");
      await onCloseTicket(id);
    } catch (err) {
      setError(err.message || "Failed to close ticket.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-yellow-600">
              Ticket Management
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
              {title}
            </h2>

            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${getStatusClasses(
                  status
                )}`}
              >
                {status}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${getPriorityClasses(
                  priority
                )}`}
              >
                {priority}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="space-y-5 px-6 pb-6">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
            <div className="relative flex min-h-[260px] items-center justify-center bg-slate-100 p-4">
              {imageUrl ? (
                <>
                  <img
                    src={imageUrl}
                    alt={title}
                    className="mx-auto max-h-[320px] w-auto max-w-full rounded-2xl object-contain"
                  />

                  {showSliderControls && (
                    <>
                      <SliderArrowButton
                        direction="left"
                        onClick={handlePrevImage}
                      />
                      <SliderArrowButton
                        direction="right"
                        onClick={handleNextImage}
                      />
                      <SliderCounter
                        current={currentImageIndex}
                        total={imageUrls.length}
                      />
                    </>
                  )}
                </>
              ) : (
                <div className="flex h-48 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-6xl">
                  🎫
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <MetaItem label="Ticket ID" value={id} />
              <MetaItem label="Assigned Technician" value={assignedTechnician} />
              <MetaItem label="Submitted On" value={formatDateTime(createdAt)} />
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetaItem label="Category" value={category} />
              <MetaItem label="Resource Name" value={resourceName} />
              <MetaItem label="Location" value={location} />
              <MetaItem label="Contact Email" value={contactEmail} />

              <div className="sm:col-span-2">
                <MetaItem label="Contact Phone" value={contactPhone} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Description
            </p>
            <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm leading-7 text-slate-700">{description}</p>
            </div>
          </div>

          {["RESOLVED", "CLOSED"].includes(normalizedStatus) && resolutionNotes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Resolution Notes
              </p>
              <div className="mt-2 rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm">
                <p className="text-sm leading-7 text-slate-700">
                  {resolutionNotes}
                </p>
              </div>
            </div>
          )}

          {normalizedStatus === "REJECTED" && savedRejectionReason && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Rejection Reason
              </p>
              <div className="mt-2 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
                <p className="text-sm leading-7 text-slate-700">
                  {savedRejectionReason}
                </p>
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-bold text-slate-900">
                Assign Technician
              </p>
              <p className="mt-1 text-xs leading-6 text-slate-500">
                Select a technician from the system and assign this issue.
              </p>

              <select
                value={selectedTechnicianId}
                onChange={(e) => setSelectedTechnicianId(e.target.value)}
                disabled={
                  !canAssign || working || techniciansLoading || noTechniciansAvailable
                }
                className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">
                  {techniciansLoading
                    ? "Loading technicians..."
                    : noTechniciansAvailable
                    ? "No technicians found"
                    : "Select technician"}
                </option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {getUserLabel(tech)}
                  </option>
                ))}
              </select>

              <button
                onClick={handleAssignClick}
                disabled={
                  !canAssign ||
                  working ||
                  techniciansLoading ||
                  noTechniciansAvailable
                }
                className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {working
                  ? "Processing..."
                  : canAssign
                  ? "Assign Technician"
                  : "Already Assigned / Not Allowed"}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-bold text-slate-900">Reject Ticket</p>
              <p className="mt-1 text-xs leading-6 text-slate-500">
                Only open invalid tickets should be rejected with a reason.
              </p>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="Enter rejection reason"
                disabled={!canReject || working}
                className="mt-4 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              />

              {!canReject && (
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Rejection is allowed only while the ticket is in <b>OPEN</b> status.
                </p>
              )}

              <button
                onClick={handleRejectClick}
                disabled={!canReject || working}
                className="mt-4 w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {working
                  ? "Processing..."
                  : canReject
                  ? "Reject Ticket"
                  : "Rejection Not Allowed"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm font-bold text-slate-900">Close Ticket</p>

            {normalizedStatus === "CLOSED" ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700">
                This ticket is already closed.
              </div>
            ) : canCloseTicket ? (
              <>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  This ticket is currently <b>RESOLVED</b>. You can now complete
                  the final step and mark it as <b>CLOSED</b>.
                </p>

                <button
                  onClick={handleCloseTicketClick}
                  disabled={working}
                  className="mt-4 w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {working ? "Processing..." : "Close Ticket"}
                </button>
              </>
            ) : (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
                Ticket can be closed only after it reaches <b>RESOLVED</b>.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TicketCommentsModal = ({ ticket, onClose }) => {
  if (!ticket) return null;

  const id = ticket?.id || ticket?.ticketId || "N/A";
  const title = ticket?.title || ticket?.subject || "Untitled Ticket";
  const priority = ticket?.priority || "N/A";
  const status = ticket?.status || "N/A";
  const category = ticket?.category || ticket?.type || "General";
  const createdAt = ticket?.createdAt || ticket?.createdDate;
  const assignedTechnician = getAssignedTechnician(ticket);
  const resolutionNotes = ticket?.resolutionNotes || "";
  const rejectionReason = ticket?.rejectionReason || "";

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-6 py-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-yellow-400">
                Ticket Comments
              </p>
              <h2 className="mt-2 text-2xl font-extrabold">{title}</h2>

              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${getStatusClasses(
                    status
                  )}`}
                >
                  {status}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${getPriorityClasses(
                    priority
                  )}`}
                >
                  {priority}
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

        <div className="space-y-5 p-6">
          <div className="grid gap-5 lg:grid-cols-[230px,1fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <MetaItem label="Ticket ID" value={id} />
                  <MetaItem label="Category" value={category} />
                  <MetaItem label="Assigned Technician" value={assignedTechnician} />
                  <MetaItem label="Submitted On" value={formatDateTime(createdAt)} />
                </div>
              </div>

              {["RESOLVED", "CLOSED"].includes(
                (status || "").toUpperCase()
              ) &&
                resolutionNotes && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Resolution Notes
                    </p>
                    <div className="mt-2 rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm">
                      <p className="text-sm leading-7 text-slate-700">
                        {resolutionNotes}
                      </p>
                    </div>
                  </div>
                )}

              {(status || "").toUpperCase() === "REJECTED" && rejectionReason && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Rejection Reason
                  </p>
                  <div className="mt-2 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
                    <p className="text-sm leading-7 text-slate-700">
                      {rejectionReason}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <CommentThread ticketId={id} />
        </div>
      </div>
    </div>
  );
};

const ManageTickets = () => {
  const { isAdmin } = useAuth();

  const [scope, setScope] = useState(isAdmin ? "ALL" : "OPEN");
  const [tickets, setTickets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [techniciansLoading, setTechniciansLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedCommentsTicket, setSelectedCommentsTicket] = useState(null);
  const [cardImageIndexes, setCardImageIndexes] = useState({});

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [searchText, setSearchText] = useState("");

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

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError("");

      let response;

      if (isAdmin && scope === "ALL") {
        response = await ticketAPI.getAll();
      } else {
        response = await ticketAPI.getOpen();
      }

      const normalized = normalizeArray(response);

      const sorted = [...normalized].sort((a, b) => {
        const dateA = new Date(a?.createdAt || a?.createdDate || 0).getTime();
        const dateB = new Date(b?.createdAt || b?.createdDate || 0).getTime();
        return dateB - dateA;
      });

      setTickets(sorted);

      if (selectedTicket) {
        const selectedId = selectedTicket?.id || selectedTicket?.ticketId;
        const refreshed = sorted.find((item) => {
          const currentId = item?.id || item?.ticketId;
          return String(currentId) === String(selectedId);
        });

        if (refreshed) {
          setSelectedTicket(refreshed);
        } else {
          setSelectedTicket(null);
        }
      }

      if (selectedCommentsTicket) {
        const selectedId =
          selectedCommentsTicket?.id || selectedCommentsTicket?.ticketId;
        const refreshed = sorted.find((item) => {
          const currentId = item?.id || item?.ticketId;
          return String(currentId) === String(selectedId);
        });

        if (refreshed) {
          setSelectedCommentsTicket(refreshed);
        } else {
          setSelectedCommentsTicket(null);
        }
      }
    } catch (err) {
      setError(err.message || "Failed to load tickets.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      setTechniciansLoading(true);
      const response = await ticketAPI.getTechnicians();
      setTechnicians(normalizeArray(response));
    } catch {
      setTechnicians([]);
    } finally {
      setTechniciansLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [scope, isAdmin]);

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const title = (ticket?.title || ticket?.subject || "").toLowerCase();
      const description = (
        ticket?.description ||
        ticket?.issueDescription ||
        ""
      ).toLowerCase();
      const id = String(ticket?.id || ticket?.ticketId || "").toLowerCase();

      const matchesSearch =
        !searchText.trim() ||
        title.includes(searchText.toLowerCase()) ||
        description.includes(searchText.toLowerCase()) ||
        id.includes(searchText.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" ||
        (ticket?.status || "").toUpperCase() === statusFilter;

      const matchesPriority =
        priorityFilter === "ALL" ||
        (ticket?.priority || "").toUpperCase() === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tickets, searchText, statusFilter, priorityFilter]);

  const summary = useMemo(() => {
    const total = filteredTickets.length;
    const open = filteredTickets.filter(
      (ticket) => (ticket?.status || "").toUpperCase() === "OPEN"
    ).length;
    const inProgress = filteredTickets.filter(
      (ticket) => (ticket?.status || "").toUpperCase() === "IN_PROGRESS"
    ).length;
    const resolved = filteredTickets.filter((ticket) =>
      ["RESOLVED", "CLOSED"].includes((ticket?.status || "").toUpperCase())
    ).length;
    const overdue = filteredTickets.filter((ticket) => isOverdueTicket(ticket)).length;

    return { total, open, inProgress, resolved, overdue };
  }, [filteredTickets]);

  const overdueTickets = useMemo(() => {
    return filteredTickets.filter((ticket) => isOverdueTicket(ticket));
  }, [filteredTickets]);

  const handleAssignTechnician = async (ticketId, technicianId) => {
    try {
      setWorking(true);
      setError("");
      setMessage("");
      await ticketAPI.assignTechnician(ticketId, Number(technicianId));
      setMessage("Technician assigned successfully.");
      await fetchTickets();
    } finally {
      setWorking(false);
    }
  };

  const handleRejectTicket = async (ticketId, reason) => {
    try {
      setWorking(true);
      setError("");
      setMessage("");
      await ticketAPI.reject(ticketId, reason);
      setMessage("Ticket rejected successfully.");
      await fetchTickets();
    } finally {
      setWorking(false);
    }
  };

  const handleCloseTicket = async (ticketId) => {
    try {
      setWorking(true);
      setError("");
      setMessage("");
      await ticketAPI.updateStatus(ticketId, "CLOSED", null);
      setMessage("Ticket closed successfully.");
      await fetchTickets();
    } finally {
      setWorking(false);
    }
  };

  const handlePrevCardImage = (ticketId, totalImages) => {
    setCardImageIndexes((prev) => {
      const current = prev[ticketId] || 0;
      return {
        ...prev,
        [ticketId]: current === 0 ? totalImages - 1 : current - 1,
      };
    });
  };

  const handleNextCardImage = (ticketId, totalImages) => {
    setCardImageIndexes((prev) => {
      const current = prev[ticketId] || 0;
      return {
        ...prev,
        [ticketId]: current === totalImages - 1 ? 0 : current + 1,
      };
    });
  };

  const pageTitle = isAdmin
    ? "Admin Ticket Management"
    : "Manager Ticket Management";
  const pageDescription = isAdmin
    ? "Review ticket activity, assign technicians, reject invalid tickets, and oversee support workflow."
    : "Review open support requests, assign technicians, and manage ticket operations efficiently.";

  const sortedTickets = useMemo(() => {
    return [...filteredTickets].sort((a, b) => {
      const overdueA = isOverdueTicket(a) ? 1 : 0;
      const overdueB = isOverdueTicket(b) ? 1 : 0;

      if (overdueA !== overdueB) {
        return overdueB - overdueA;
      }

      const dateA = getTicketCreatedTime(a);
      const dateB = getTicketCreatedTime(b);

      return dateB - dateA;
    });
  }, [filteredTickets]);

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
            Support Operations
          </p>
          <h1 className="text-4xl font-extrabold md:text-5xl">{pageTitle}</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
            {pageDescription}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {isAdmin && (
              <>
                <FilterButton
                  active={scope === "ALL"}
                  label="All Tickets"
                  onClick={() => setScope("ALL")}
                />
                <FilterButton
                  active={scope === "OPEN"}
                  label="Open Queue"
                  onClick={() => setScope("OPEN")}
                />
              </>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-8 grid max-w-7xl gap-5 px-6 sm:grid-cols-2 xl:grid-cols-5 lg:px-10">
        <SummaryCard title="Visible Tickets" value={summary.total} icon="🎫" />
        <SummaryCard
          title="Open"
          value={summary.open}
          icon="🟦"
          valueClass="text-blue-600"
        />
        <SummaryCard
          title="In Progress"
          value={summary.inProgress}
          icon="🟨"
          valueClass="text-yellow-600"
        />
        <SummaryCard
          title="Resolved / Closed"
          value={summary.resolved}
          icon="✅"
          valueClass="text-green-600"
        />
        <SummaryCard
          title="Overdue"
          value={summary.overdue}
          icon="🚨"
          valueClass="text-red-600"
        />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <OverdueWarningPanel overdueTickets={overdueTickets} />

        <div className="mb-6 rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Search Tickets
              </label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search by ticket ID, title, or description"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
              >
                <option value="ALL">All</option>
                <option value="OVERDUE">Overdue</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Priority
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
              >
                <option value="ALL">All</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-md ring-1 ring-slate-200">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
            <p className="mt-4 text-slate-600">Loading tickets...</p>
          </div>
        ) : sortedTickets.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-md ring-1 ring-slate-200">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100 text-4xl">
              🎫
            </div>
            <h3 className="mt-5 text-2xl font-bold text-slate-900">
              No tickets found
            </h3>
            <p className="mt-3 text-slate-600">
              No tickets match the current filters.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedTickets.map((ticket, index) => {
              const id = ticket?.id || ticket?.ticketId || `ticket-${index}`;
              const title = ticket?.title || ticket?.subject || "Untitled Ticket";
              const category = ticket?.category || ticket?.type || "General";
              const priority = ticket?.priority || "N/A";
              const status = ticket?.status || "N/A";
              const createdAt = ticket?.createdAt || ticket?.createdDate;
              const imageUrls = getTicketImages(ticket);
              const currentImageIndex = cardImageIndexes[id] || 0;
              const imageUrl = imageUrls[currentImageIndex] || getTicketImage(ticket);
              const showSliderControls = imageUrls.length > 1;
              const overdue = isOverdueTicket(ticket);

              return (
                <div
                  key={id}
                  className={`overflow-hidden rounded-3xl border bg-white shadow-md ring-1 transition hover:-translate-y-1 hover:shadow-xl ${
                    overdue
                      ? "border-red-200 ring-red-100"
                      : "border-slate-200 ring-slate-100"
                  }`}
                >
                  <div className="relative h-40 bg-slate-100">
                    {imageUrl ? (
                      <>
                        <img
                          src={imageUrl}
                          alt={title}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />

                        {showSliderControls && (
                          <>
                            <SliderArrowButton
                              direction="left"
                              onClick={() =>
                                handlePrevCardImage(id, imageUrls.length)
                              }
                            />
                            <SliderArrowButton
                              direction="right"
                              onClick={() =>
                                handleNextCardImage(id, imageUrls.length)
                              }
                            />
                            <SliderCounter
                              current={currentImageIndex}
                              total={imageUrls.length}
                            />
                          </>
                        )}
                      </>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-4xl">
                        🎫
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent"></div>

                    <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase shadow ${getStatusClasses(
                          status
                        )}`}
                      >
                        {status}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase shadow ${getPriorityClasses(
                          priority
                        )}`}
                      >
                        {priority}
                      </span>
                      {overdue && (
                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold uppercase text-red-700 shadow">
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-medium text-slate-500">
                        Ticket ID: {id}
                      </p>

                      {overdue && (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold uppercase text-red-700">
                          Needs Immediate Attention
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2 line-clamp-2 text-lg font-extrabold text-slate-900">
                      {title}
                    </h3>

                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Category
                        </span>
                        <span className="text-sm font-bold text-slate-900">
                          {category}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Date
                        </span>
                        <span className="text-right text-sm font-bold text-slate-900">
                          {formatDate(createdAt)}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Technician
                        </span>
                        <span className="text-right text-sm font-bold text-slate-900">
                          {getAssignedTechnician(ticket)}
                        </span>
                      </div>

                      {overdue && (
                        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                          <p className="text-xs font-bold uppercase tracking-wide text-red-700">
                            Overdue Alert
                          </p>
                          <p className="mt-1 text-xs font-medium text-red-700">
                            {getOverdueAgeLabel(ticket)} • {getOverdueByLabel(ticket)}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedTicket(ticket)}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                      >
                        View Details
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedCommentsTicket(ticket)}
                        className="rounded-xl bg-yellow-500 px-3 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-yellow-600"
                      >
                        Comments
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <TicketDetailsModal
        ticket={selectedTicket}
        technicians={technicians}
        techniciansLoading={techniciansLoading}
        onClose={() => setSelectedTicket(null)}
        onAssign={handleAssignTechnician}
        onReject={handleRejectTicket}
        onCloseTicket={handleCloseTicket}
        working={working}
      />

      <TicketCommentsModal
        ticket={selectedCommentsTicket}
        onClose={() => setSelectedCommentsTicket(null)}
      />

      <Footer />
    </div>
  );
};

export default ManageTickets;