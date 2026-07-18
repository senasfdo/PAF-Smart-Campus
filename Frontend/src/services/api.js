const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8084/api";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8084";

const getToken = () => localStorage.getItem("token");

const parseError = async (response) => {
  const raw = await response.text();

  if (!raw) {
    return `Request failed (${response.status})`;
  }

  try {
    const data = JSON.parse(raw);
    return (
      data?.message ||
      data?.error ||
      data?.details ||
      `Request failed (${response.status})`
    );
  } catch {
    return raw || `Request failed (${response.status})`;
  }
};

const parseSuccess = async (response) => {
  const raw = await response.text();

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

const apiRequest = async (
  endpoint,
  method = "GET",
  data = null,
  customHeaders = {}
) => {
  const token = getToken();

  const headers = {
    ...customHeaders,
  };

  if (!(data instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (data) {
    options.body = data instanceof FormData ? data : JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  if (response.status === 204) return null;

  return parseSuccess(response);
};

export const getDashboardPathByRole = (role) => {
  switch ((role || "").toUpperCase()) {
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

export const authAPI = {
  googleLogin: () => {
    window.location.href = `${BACKEND_URL}/oauth2/authorization/google`;
  },

  handleOAuthCallback: (search = window.location.search) => {
    const params = new URLSearchParams(search);
    const token = params.get("token");
    const role = (params.get("role") || "").toUpperCase();

    if (!token) return null;

    localStorage.setItem("token", token);
    localStorage.setItem("role", role);

    return { token, role };
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    window.location.href = "/";
  },

  getProfile: () => apiRequest("/user/profile"),
};

export const facilityAPI = {
  getAll: () => apiRequest("/facilities"),
  getById: (id) => apiRequest(`/facilities/${id}`),
  getActive: () => apiRequest("/facilities/active"),
  getByType: (type) => apiRequest(`/facilities/type/${type}`),
  search: (params) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/facilities/search?${query}`);
  },

  create: (data) => apiRequest("/facilities", "POST", data),
  update: (id, data) => apiRequest(`/facilities/${id}`, "PUT", data),
  updateStatus: (id, status) =>
    apiRequest(`/facilities/${id}/status`, "PATCH", { status }),
  delete: (id) => apiRequest(`/facilities/${id}`, "DELETE"),
  getAnalytics: () => apiRequest("/facilities/analytics/summary"),
};

export const bookingAPI = {
  create: (data) => apiRequest("/bookings", "POST", data),
  getMyBookings: () => apiRequest("/bookings/my"),
  cancel: (id) => apiRequest(`/bookings/${id}/cancel`, "PUT"),
  update: (id, data) => apiRequest(`/bookings/${id}`, "PUT", data),
  delete: (id) => apiRequest(`/bookings/${id}`, "DELETE"),
  checkAvailability: (facilityId, startTime, endTime) =>
    apiRequest(
      `/bookings/check-availability?facilityId=${facilityId}&startTime=${startTime}&endTime=${endTime}`
    ),

  getPending: () => apiRequest("/bookings/pending"),
  approve: (id) => apiRequest(`/bookings/${id}/approve`, "PUT"),
  reject: (id, reason) =>
    apiRequest(`/bookings/${id}/reject`, "PUT", { reason }),
  getByFacility: (facilityId) => apiRequest(`/bookings/facility/${facilityId}`),

  getAll: () => apiRequest("/bookings/all"),
  getStats: () => apiRequest("/bookings/stats"),

  // QR / Check-in APIs
  getQrDetails: (bookingId) => apiRequest(`/bookings/${bookingId}/qr`),
  verifyQr: (token) => apiRequest(`/bookings/qr/verify/${token}`),
  checkInByQr: (token) => apiRequest(`/bookings/qr/check-in/${token}`, "POST"),
};

export const ticketAPI = {
  create: (formData) => apiRequest("/tickets", "POST", formData),
  getMyTickets: () => apiRequest("/tickets/my"),
  getById: (id) => apiRequest(`/tickets/${id}`),

  update: (id, data) => apiRequest(`/tickets/${id}`, "PUT", data),
  delete: (id) => apiRequest(`/tickets/${id}`, "DELETE"),

  updateStatus: (id, status, notes) =>
    apiRequest(`/tickets/${id}/status`, "PUT", { status, notes }),
  resolve: (id, notes) => apiRequest(`/tickets/${id}/resolve`, "PUT", { notes }),

  getOpen: () => apiRequest("/tickets/open"),
  getByStatus: (status) => apiRequest(`/tickets/status/${status}`),
  getByPriority: (priority) => apiRequest(`/tickets/priority/${priority}`),
  getTechnicians: () => apiRequest("/tickets/technicians"),
  getAssignedToMe: () => apiRequest("/tickets/assigned/me"),
  assignTechnician: (id, technicianId) =>
    apiRequest(`/tickets/${id}/assign`, "PUT", { technicianId }),
  reject: (id, reason) => apiRequest(`/tickets/${id}/reject`, "PUT", { reason }),

  getAll: () => apiRequest("/tickets/all"),
  getStats: () => apiRequest("/tickets/stats"),
};

export const announcementAPI = {
  getAll: () => apiRequest("/announcements"),
  getActive: () => apiRequest("/announcements/active"),
  create: (data) => apiRequest("/announcements", "POST", data),
  update: (id, data) => apiRequest(`/announcements/${id}`, "PUT", data),
  delete: (id) => apiRequest(`/announcements/${id}`, "DELETE"),
};

export const commentAPI = {
  getByTicket: (ticketId) => apiRequest(`/comments/ticket/${ticketId}`),
  add: (ticketId, content) =>
    apiRequest(`/comments/ticket/${ticketId}`, "POST", { content }),
  update: (id, content) => apiRequest(`/comments/${id}`, "PUT", { content }),
  delete: (id) => apiRequest(`/comments/${id}`, "DELETE"),
};

export const notificationAPI = {
  getAll: () => apiRequest("/notifications"),
  getUnreadCount: () => apiRequest("/notifications/unread-count"),
  markAsRead: (id) => apiRequest(`/notifications/${id}/read`, "PUT"),
  markAllAsRead: () => apiRequest("/notifications/read-all", "PUT"),
  deleteAllRead: () => apiRequest("/notifications/read", "DELETE"),
  delete: (id) => apiRequest(`/notifications/${id}`, "DELETE"),
};

export const userAPI = {
  getAll: () => apiRequest("/user/all"),
};