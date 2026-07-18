import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { useAuth } from "../../context/AuthContext";
import { ticketAPI, commentAPI } from "../../services/api";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8084";

const COMMENT_EDIT_WINDOW_MS = 5 * 60 * 1000;

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

const normalizeTickets = (data) => {
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

const canModifyTicket = (ticket) => {
  const status = (ticket?.status || "").toUpperCase();
  const assigned =
    ticket?.assignedTo ||
    ticket?.assignedTechnician ||
    ticket?.technicianName;

  return status === "OPEN" && !assigned;
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
    return "";
  }

  if (hasOtherUserReplyAfterComment(comment, comments)) {
    return "";
  }

  return "";
};

const canManageComment = (comment, comments, user) => {
  if (!isUsersComment(comment, user)) return false;
  if (!isCommentWithinEditWindow(comment)) return false;
  if (hasOtherUserReplyAfterComment(comment, comments)) return false;
  return true;
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

const EmptyState = ({ dashboardPath }) => {
  return (
    <div className="overflow-hidden rounded-[28px] bg-white shadow-md ring-1 ring-slate-200">
      <div className="grid lg:grid-cols-[280px,1fr]">
        <div className="flex items-center justify-center bg-gradient-to-br from-yellow-50 via-white to-slate-50 p-8">
          <div className="text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-yellow-100 text-4xl shadow-sm">
              🎫
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-yellow-600">
              Support Center
            </p>
            <h3 className="mt-2 text-xl font-extrabold text-slate-900">
              0 Tickets
            </h3>
          </div>
        </div>

        <div className="p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Ticket Dashboard
          </p>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900">
            No tickets submitted yet
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            You have not submitted any support requests yet. Create your first
            ticket to report facility issues, technical problems, or other
            campus concerns.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              Report issue
            </span>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              Track status
            </span>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              Get updates
            </span>
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/my-tickets/new"
              className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-yellow-600"
            >
              Create First Ticket
            </Link>

            <Link
              to={dashboardPath || "/student"}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ title, value, valueClass = "text-slate-900" }) => (
  <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-200">
    <p className="text-sm font-medium text-slate-500">{title}</p>
    <h3 className={`mt-2 text-3xl font-extrabold ${valueClass}`}>{value}</h3>
  </div>
);

const MetaItem = ({ label, value }) => (
  <div>
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      {label}
    </p>
    <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
  </div>
);

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

const TicketDetailsModal = ({ ticket, onClose, onUpdated, onDeleted }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (ticket) {
      setDescription(ticket?.description || ticket?.issueDescription || "");
      setPriority((ticket?.priority || "MEDIUM").toUpperCase());
      setIsEditing(false);
      setError("");
      setCurrentImageIndex(0);
    }
  }, [ticket]);

  if (!ticket) return null;

  const id = ticket?.id || ticket?.ticketId || "N/A";
  const title = ticket?.title || ticket?.subject || "Untitled Ticket";
  const category = ticket?.category || ticket?.type || "General";
  const status = ticket?.status || "N/A";
  const createdAt = ticket?.createdAt || ticket?.createdDate;
  const technicianName =
    ticket?.technicianName ||
    ticket?.assignedTechnician?.name ||
    ticket?.assignedTechnician?.fullName ||
    ticket?.assignedTo?.name ||
    ticket?.assignedTo?.fullName ||
    "Not assigned";

  const resolutionNotes = ticket?.resolutionNotes || "";
  const rejectionReason = ticket?.rejectionReason || "";
  const imageUrls = getTicketImages(ticket);
  const imageUrl = imageUrls[currentImageIndex] || getTicketImage(ticket);
  const isEditable = canModifyTicket(ticket);

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

  const handleUpdate = async () => {
    if (!description.trim()) {
      setError("Description cannot be empty.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await ticketAPI.update(id, {
        description: description.trim(),
        priority,
      });

      setIsEditing(false);
      await onUpdated();
    } catch (err) {
      setError(err.message || "Failed to update ticket.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this ticket?"
    );

    if (!confirmed) return;

    try {
      setDeleting(true);
      setError("");

      await ticketAPI.delete(id);
      await onDeleted();
    } catch (err) {
      setError(err.message || "Failed to delete ticket.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-6 py-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-yellow-400">
                Ticket Details
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
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[250px,1fr]">
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
                  <div className="flex h-[250px] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-6xl">
                    🎫
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <MetaItem label="Ticket ID" value={id} />
                  <MetaItem label="Category" value={category} />
                  <MetaItem label="Submitted On" value={formatDateTime(createdAt)} />
                  <MetaItem label="Assigned Technician" value={technicianName} />
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Priority
                    </p>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Description
                    </p>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={7}
                      className="mt-2 w-full resize-none rounded-2xl border border-slate-300 bg-white p-4 text-sm leading-7 text-slate-700 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={handleUpdate}
                      disabled={saving}
                      className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-yellow-600 disabled:opacity-70"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>

                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setDescription(
                          ticket?.description || ticket?.issueDescription || ""
                        );
                        setPriority((ticket?.priority || "MEDIUM").toUpperCase());
                        setError("");
                      }}
                      className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Description
                    </p>
                    <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-sm leading-7 text-slate-700">
                        {description || "No description available."}
                      </p>
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

                  {(status || "").toUpperCase() === "REJECTED" &&
                    rejectionReason && (
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

                  {isEditable && (
                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-yellow-600"
                      >
                        Edit Ticket
                      </button>

                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-red-700 disabled:opacity-70"
                      >
                        {deleting ? "Deleting..." : "Delete Ticket"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
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
  const category = ticket?.category || ticket?.type || "General";
  const priority = ticket?.priority || "N/A";
  const status = ticket?.status || "N/A";
  const createdAt = ticket?.createdAt || ticket?.createdDate;
  const technicianName =
    ticket?.technicianName ||
    ticket?.assignedTechnician?.name ||
    ticket?.assignedTechnician?.fullName ||
    ticket?.assignedTo?.name ||
    ticket?.assignedTo?.fullName ||
    "Not assigned";

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
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <MetaItem label="Ticket ID" value={id} />
                  <MetaItem label="Category" value={category} />
                  <MetaItem label="Submitted On" value={formatDateTime(createdAt)} />
                  <MetaItem label="Assigned Technician" value={technicianName} />
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

const MyTickets = () => {
  const { dashboardPath } = useAuth();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDetailsTicket, setSelectedDetailsTicket] = useState(null);
  const [selectedCommentsTicket, setSelectedCommentsTicket] = useState(null);
  const [cardImageIndexes, setCardImageIndexes] = useState({});

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await ticketAPI.getMyTickets();
      const normalized = normalizeTickets(response);

      const sorted = [...normalized].sort((a, b) => {
        const dateA = new Date(a?.createdAt || a?.createdDate || 0).getTime();
        const dateB = new Date(b?.createdAt || b?.createdDate || 0).getTime();
        return dateB - dateA;
      });

      setTickets(sorted);

      if (selectedDetailsTicket) {
        const currentId =
          selectedDetailsTicket?.id || selectedDetailsTicket?.ticketId;
        const refreshedSelected = sorted.find((t) => {
          const tid = t?.id || t?.ticketId;
          return String(tid) === String(currentId);
        });

        if (refreshedSelected) {
          setSelectedDetailsTicket(refreshedSelected);
        }
      }

      if (selectedCommentsTicket) {
        const currentId =
          selectedCommentsTicket?.id || selectedCommentsTicket?.ticketId;
        const refreshedSelected = sorted.find((t) => {
          const tid = t?.id || t?.ticketId;
          return String(tid) === String(currentId);
        });

        if (refreshedSelected) {
          setSelectedCommentsTicket(refreshedSelected);
        }
      }
    } catch (err) {
      const message = err?.message || "Failed to load your tickets.";

      const looksLikeEmptyBackendBug =
        message.toLowerCase().includes("internal server error") ||
        message.includes("500");

      if (looksLikeEmptyBackendBug) {
        setTickets([]);
        setError("");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const summary = useMemo(() => {
    const openCount = tickets.filter((ticket) =>
      ["OPEN", "IN_PROGRESS"].includes((ticket?.status || "").toUpperCase())
    ).length;

    const resolvedCount = tickets.filter((ticket) =>
      ["RESOLVED", "CLOSED"].includes((ticket?.status || "").toUpperCase())
    ).length;

    const highPriorityCount = tickets.filter(
      (ticket) => (ticket?.priority || "").toUpperCase() === "HIGH"
    ).length;

    return {
      total: tickets.length,
      open: openCount,
      resolved: resolvedCount,
      high: highPriorityCount,
    };
  }, [tickets]);

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

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <section className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-14 lg:flex-row lg:items-end lg:justify-between lg:px-10">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
              Support Center
            </p>
            <h1 className="max-w-3xl text-4xl font-extrabold leading-tight md:text-5xl">
              My Support Tickets
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
              Track your submitted issues, monitor progress, and manage your
              support requests in one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              to="/my-tickets/new"
              className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-yellow-600"
            >
              Create Ticket
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-8 grid max-w-7xl gap-5 px-6 sm:grid-cols-2 xl:grid-cols-4 lg:px-10">
        <SummaryCard title="Total Tickets" value={summary.total} />
        <SummaryCard
          title="Open / In Progress"
          value={summary.open}
          valueClass="text-yellow-600"
        />
        <SummaryCard
          title="Resolved / Closed"
          value={summary.resolved}
          valueClass="text-green-600"
        />
        <SummaryCard
          title="High Priority"
          value={summary.high}
          valueClass="text-red-600"
        />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        {loading ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-md ring-1 ring-slate-200">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
            <p className="mt-4 text-slate-600">Loading your tickets...</p>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-md">
            <p className="text-lg font-bold text-red-700">Failed to load tickets</p>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <button
              onClick={fetchTickets}
              className="mt-4 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Try Again
            </button>
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState dashboardPath={dashboardPath} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tickets.map((ticket, index) => {
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

              return (
                <div
                  key={id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-xl"
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
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Ticket ID: {id}
                    </p>

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
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedDetailsTicket(ticket)}
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
        ticket={selectedDetailsTicket}
        onClose={() => setSelectedDetailsTicket(null)}
        onUpdated={fetchTickets}
        onDeleted={async () => {
          setSelectedDetailsTicket(null);
          await fetchTickets();
        }}
      />

      <TicketCommentsModal
        ticket={selectedCommentsTicket}
        onClose={() => setSelectedCommentsTicket(null)}
      />

      <Footer />
    </div>
  );
};

export default MyTickets;