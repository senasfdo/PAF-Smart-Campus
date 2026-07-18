import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { useAuth } from "../../context/AuthContext";
import { ticketAPI, commentAPI } from "../../services/api";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8084";

const COMMENT_EDIT_WINDOW_MS = 5 * 60 * 1000;

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

  if (Array.isArray(ticket?.attachmentUrls) && ticket?.attachmentUrls.length > 0) {
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

const isFinalTicketStatus = (status) =>
  ["RESOLVED", "REJECTED", "CLOSED"].includes(
    String(status || "").toUpperCase()
  );

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

const TicketDetailsModal = ({ ticket, onClose, onRefresh }) => {
  const [status, setStatus] = useState("IN_PROGRESS");
  const [notes, setNotes] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (ticket) {
      const currentStatus = (ticket?.status || "OPEN").toUpperCase();
      setStatus(currentStatus === "OPEN" ? "IN_PROGRESS" : currentStatus);
      setNotes(ticket?.resolutionNotes || "");
      setError("");
      setCurrentImageIndex(0);
    }
  }, [ticket]);

  if (!ticket) return null;

  const normalizedStatus = (ticket?.status || "").toUpperCase();
  const isFinalized = isFinalTicketStatus(normalizedStatus);
  const canMoveToInProgress = normalizedStatus === "OPEN";
  const canResolve = normalizedStatus === "IN_PROGRESS";

  const id = ticket?.id || ticket?.ticketId || "N/A";
  const title = ticket?.title || ticket?.subject || "Untitled Ticket";
  const description =
    ticket?.description ||
    ticket?.issueDescription ||
    "No description available.";
  const category = ticket?.category || ticket?.type || "General";
  const priority = ticket?.priority || "N/A";
  const createdAt = ticket?.createdAt || ticket?.createdDate;
  const location = ticket?.location || "Not specified";
  const resourceName = ticket?.resourceName || "Not specified";
  const contactEmail = ticket?.contactEmail || "Not available";
  const contactPhone = ticket?.contactPhone || "Not available";
  const imageUrls = getTicketImages(ticket);
  const imageUrl = imageUrls[currentImageIndex] || getTicketImage(ticket);
  const rejectionReason = ticket?.rejectionReason || "";
  const resolutionNotes = ticket?.resolutionNotes || notes || "";
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

  const handleStatusUpdate = async () => {
    if (!canMoveToInProgress) return;

    try {
      setWorking(true);
      setError("");
      await ticketAPI.updateStatus(id, "IN_PROGRESS", null);
      await onRefresh();
    } catch (err) {
      setError(err.message || "Failed to update status.");
    } finally {
      setWorking(false);
    }
  };

  const handleResolve = async () => {
    if (!canResolve) return;

    if (!notes.trim()) {
      setError("Please enter resolution notes before resolving.");
      return;
    }

    try {
      setWorking(true);
      setError("");
      await ticketAPI.resolve(id, notes.trim());
      await onRefresh();
    } catch (err) {
      setError(err.message || "Failed to resolve ticket.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
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
                Technician Ticket
              </p>
              <h2 className="mt-2 text-2xl font-extrabold">{title}</h2>

              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${getStatusClasses(
                    ticket?.status
                  )}`}
                >
                  {ticket?.status || "N/A"}
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
              <div className="relative flex h-full min-h-[260px] items-center justify-center p-4">
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
                  <div className="flex h-[260px] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 text-6xl">
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
                  <MetaItem label="Resource Name" value={resourceName} />
                  <MetaItem label="Location" value={location} />
                  <MetaItem label="Contact Email" value={contactEmail} />
                  <MetaItem label="Contact Phone" value={contactPhone} />
                  <div className="sm:col-span-2">
                    <MetaItem
                      label="Submitted On"
                      value={formatDateTime(createdAt)}
                    />
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

              {normalizedStatus === "REJECTED" && rejectionReason && (
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

              {["RESOLVED", "CLOSED"].includes(normalizedStatus) &&
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
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-bold text-slate-900">Update Status</p>

              {isFinalized ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm font-semibold text-slate-800">
                    This ticket is already finalized.
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    Status changes are disabled because the ticket is{" "}
                    <span className="font-bold text-slate-700">
                      {normalizedStatus}
                    </span>
                    .
                  </p>
                </div>
              ) : canMoveToInProgress ? (
                <>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={working}
                    className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                  >
                    <option value="IN_PROGRESS">In Progress</option>
                  </select>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Technician can first move this ticket from <b>OPEN</b> to{" "}
                    <b>IN_PROGRESS</b>.
                  </p>

                  <button
                    onClick={handleStatusUpdate}
                    disabled={working}
                    className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:bg-slate-300"
                  >
                    {working ? "Processing..." : "Move to In Progress"}
                  </button>
                </>
              ) : (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm font-semibold text-slate-800">
                    Ticket already in progress
                  </p>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    Next allowed step for technician is to add resolution notes
                    and mark it as <span className="font-bold">RESOLVED</span>.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-bold text-slate-900">Resolution Notes</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Enter notes or resolution details"
                disabled={working || isFinalized}
                className="mt-4 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 disabled:bg-slate-100"
              />

              {!isFinalized && !canResolve && (
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Resolve is available only after the ticket becomes{" "}
                  <b>IN_PROGRESS</b>.
                </p>
              )}

              <button
                onClick={handleResolve}
                disabled={working || isFinalized || !canResolve}
                className="mt-4 w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:bg-slate-300"
              >
                {working ? "Processing..." : "Resolve Ticket"}
              </button>
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
  const priority = ticket?.priority || "N/A";
  const status = ticket?.status || "N/A";
  const category = ticket?.category || ticket?.type || "General";
  const createdAt = ticket?.createdAt || ticket?.createdDate;
  const location = ticket?.location || "Not specified";
  const resourceName = ticket?.resourceName || "Not specified";
  const rejectionReason = ticket?.rejectionReason || "";
  const resolutionNotes = ticket?.resolutionNotes || "";

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
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100"></div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <MetaItem label="Ticket ID" value={id} />
                  <MetaItem label="Category" value={category} />
                  <MetaItem label="Resource Name" value={resourceName} />
                  <MetaItem label="Location" value={location} />
                  <div className="sm:col-span-2">
                    <MetaItem
                      label="Submitted On"
                      value={formatDateTime(createdAt)}
                    />
                  </div>
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

const TechnicianTickets = () => {
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
      const response = await ticketAPI.getAssignedToMe();
      const normalized = normalizeArray(response);

      const sorted = [...normalized].sort((a, b) => {
        const dateA = new Date(a?.createdAt || a?.createdDate || 0).getTime();
        const dateB = new Date(b?.createdAt || b?.createdDate || 0).getTime();
        return dateB - dateA;
      });

      setTickets(sorted);

      if (selectedDetailsTicket) {
        const selectedId =
          selectedDetailsTicket?.id || selectedDetailsTicket?.ticketId;
        const refreshed = sorted.find((item) => {
          const currentId = item?.id || item?.ticketId;
          return String(currentId) === String(selectedId);
        });

        if (refreshed) {
          setSelectedDetailsTicket(refreshed);
        } else {
          setSelectedDetailsTicket(null);
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
      setError(err.message || "Failed to load technician tickets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const summary = useMemo(() => {
    const total = tickets.length;
    const inProgress = tickets.filter(
      (ticket) => (ticket?.status || "").toUpperCase() === "IN_PROGRESS"
    ).length;
    const resolved = tickets.filter(
      (ticket) => (ticket?.status || "").toUpperCase() === "RESOLVED"
    ).length;
    const closed = tickets.filter(
      (ticket) => (ticket?.status || "").toUpperCase() === "CLOSED"
    ).length;

    return { total, inProgress, resolved, closed };
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
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
            Technician Workspace
          </p>
          <h1 className="text-4xl font-extrabold md:text-5xl">
            My Assigned Tickets
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
            Review your assigned tickets, update issue progress, and complete
            resolution work from this page.
          </p>
        </div>
      </section>

      <section className="mx-auto -mt-8 grid max-w-7xl gap-5 px-6 sm:grid-cols-2 xl:grid-cols-4 lg:px-10">
        <SummaryCard title="Assigned Tickets" value={summary.total} icon="🎫" />
        <SummaryCard
          title="In Progress"
          value={summary.inProgress}
          icon="🛠️"
          valueClass="text-yellow-600"
        />
        <SummaryCard
          title="Resolved"
          value={summary.resolved}
          icon="✅"
          valueClass="text-green-600"
        />
        <SummaryCard
          title="Closed"
          value={summary.closed}
          icon="📁"
          valueClass="text-slate-700"
        />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        {loading ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-md ring-1 ring-slate-200">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
            <p className="mt-4 text-slate-600">Loading assigned tickets...</p>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-md">
            <p className="text-lg font-bold text-red-700">
              Failed to load assigned tickets
            </p>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <button
              onClick={fetchTickets}
              className="mt-4 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Try Again
            </button>
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-md ring-1 ring-slate-200">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100 text-4xl">
              🎫
            </div>
            <h3 className="mt-5 text-2xl font-bold text-slate-900">
              No assigned tickets
            </h3>
            <p className="mt-3 text-slate-600">
              You do not have any assigned tickets right now.
            </p>
          </div>
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
        onRefresh={fetchTickets}
      />

      <TicketCommentsModal
        ticket={selectedCommentsTicket}
        onClose={() => setSelectedCommentsTicket(null)}
      />

      <Footer />
    </div>
  );
};

export default TechnicianTickets;