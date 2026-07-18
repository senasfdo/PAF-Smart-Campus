import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { useAuth } from "../../context/AuthContext";
import { userAPI } from "../../services/api";

const normalizeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const getRoleClasses = (role = "") => {
  const value = String(role).toUpperCase();

  switch (value) {
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

const getProviderLabel = (provider = "") => {
  if (!provider) return "N/A";
  return String(provider).toUpperCase();
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

const SystemUsers = () => {
  const { isAdmin } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await userAPI.getAll();
      setUsers(normalizeArray(response));
    } catch (err) {
      setError(err.message || "Failed to load system users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const name = String(user?.name || "").toLowerCase();
      const email = String(user?.email || "").toLowerCase();
      const role = String(user?.role || "").toUpperCase();

      const matchesSearch =
        !searchText.trim() ||
        name.includes(searchText.toLowerCase()) ||
        email.includes(searchText.toLowerCase());

      const matchesRole = roleFilter === "ALL" || role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, searchText, roleFilter]);

  const summary = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((u) => String(u?.role || "").toUpperCase() === "ADMIN").length,
      managers: users.filter((u) => String(u?.role || "").toUpperCase() === "MANAGER").length,
      technicians: users.filter((u) => String(u?.role || "").toUpperCase() === "TECHNICIAN").length,
    };
  }, [users]);

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
              This page is only available for admin accounts.
            </p>
          </div>
        </section>
        <Footer />
      </div>
    );
  }
//ui part
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <section className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
            Admin Control
          </p>
          <h1 className="text-4xl font-extrabold md:text-5xl">
            System Users
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
            View all registered users in the system with their roles and login providers.
          </p>
        </div>
      </section>

      <section className="mx-auto -mt-8 grid max-w-7xl gap-5 px-6 sm:grid-cols-2 xl:grid-cols-4 lg:px-10">
        <SummaryCard title="Total Users" value={summary.total} icon="👥" />
        <SummaryCard
          title="Admins"
          value={summary.admins}
          icon="🛡️"
          valueClass="text-red-600"
        />
        <SummaryCard
          title="Managers"
          value={summary.managers}
          icon="📋"
          valueClass="text-purple-600"
        />
        <SummaryCard
          title="Technicians"
          value={summary.technicians}
          icon="🛠️"
          valueClass="text-blue-600"
        />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Search Users
              </label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search by name or email"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
              >
                <option value="ALL">All</option>
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="TECHNICIAN">Technician</option>
                <option value="LECTURER">Lecturer</option>
                <option value="STUDENT">Student</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-md ring-1 ring-slate-200">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
            <p className="mt-4 text-slate-600">Loading system users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-md ring-1 ring-slate-200">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100 text-4xl">
              👥
            </div>
            <h3 className="mt-5 text-2xl font-bold text-slate-900">
              No users found
            </h3>
            <p className="mt-3 text-slate-600">
              No users match the current filters.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      ID
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      Name
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      Email
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      Role
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-600">
                      Provider
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                        {user.id}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                        {user.name || "N/A"}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">
                        {user.email || "N/A"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${getRoleClasses(
                            user.role
                          )}`}
                        >
                          {user.role || "N/A"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                        {getProviderLabel(user.provider)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default SystemUsers;