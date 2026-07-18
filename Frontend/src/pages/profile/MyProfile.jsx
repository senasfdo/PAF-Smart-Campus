import React from "react";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { useAuth } from "../../context/AuthContext";

const formatRole = (role = "") => {
  const value = role.toUpperCase();

  switch (value) {
    case "STUDENT":
      return "Student";
    case "LECTURER":
      return "Lecturer";
    case "TECHNICIAN":
      return "Technician";
    case "MANAGER":
      return "Manager";
    case "ADMIN":
      return "Admin";
    default:
      return "User";
  }
};

const getProfileTitle = (role = "") => {
  const value = role.toUpperCase();

  switch (value) {
    case "STUDENT":
      return "Student Profile";
    case "LECTURER":
      return "Lecturer Profile";
    case "TECHNICIAN":
      return "Technician Profile";
    case "MANAGER":
      return "Manager Profile";
    case "ADMIN":
      return "Admin Profile";
    default:
      return "User Profile";
  }
};

const getDisplayName = (user) => {
  return (
    user?.name ||
    user?.fullName ||
    user?.username ||
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "User")
  );
};

const getInitials = (name = "User") => {
  const parts = name.trim().split(" ").filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
};

const getProfileImage = (user) => {
  return (
    user?.picture ||
    user?.avatar ||
    user?.avatarUrl ||
    user?.image ||
    user?.imageUrl ||
    user?.photoUrl ||
    user?.profilePicture ||
    ""
  );
};

const DetailCard = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-yellow-300 hover:shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
      {label}
    </p>
    <p className="mt-3 text-lg font-bold text-slate-900 break-words">
      {value}
    </p>
  </div>
);

const MyProfile = () => {
  const { user, role } = useAuth();

  const displayName = getDisplayName(user);
  const displayRole = formatRole(role);
  const profileTitle = getProfileTitle(role);
  const initials = getInitials(displayName);
  const profileImage = getProfileImage(user);

  const email = user?.email || "Not available";
  const department = user?.department || user?.faculty || user?.division || "IT";

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <section className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="mx-auto max-w-7xl px-6 pb-28 pt-16 lg:px-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-yellow-400">
            Smart Campus Profile
          </p>

          <h1 className="text-4xl font-extrabold md:text-5xl">
            {profileTitle}
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
            View your account details and campus role information in a cleaner,
            more professional profile layout.
          </p>
        </div>
      </section>

      <section className="mx-auto -mt-16 max-w-7xl px-6 pb-16 lg:px-10">
        <div className="overflow-hidden rounded-[32px] bg-white shadow-xl ring-1 ring-slate-200">
          <div className="flex flex-col lg:flex-row">
            <div className="flex items-center justify-center border-b border-slate-200 bg-slate-50 p-10 lg:w-[32%] lg:border-b-0 lg:border-r">
              <div className="relative">
                <div className="absolute -inset-3 rounded-full bg-yellow-100 blur-xl opacity-70"></div>

                <div className="relative h-48 w-48 overflow-hidden rounded-full border-[6px] border-white bg-yellow-100 shadow-lg">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-yellow-500 text-6xl font-extrabold text-white">
                      {initials}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:w-[68%] p-8 lg:p-10">
              <div className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-yellow-600">
                    {displayRole} Account
                  </p>
                  <h2 className="mt-2 text-3xl font-extrabold text-slate-900">
                    {displayName}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    Your verified Smart Campus profile information is shown here.
                  </p>
                </div>

                <div className="inline-flex w-fit rounded-full bg-yellow-100 px-4 py-2 text-sm font-bold text-yellow-700">
                  {displayRole}
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <DetailCard label="Full Name" value={displayName} />
                <DetailCard label="Email Address" value={email} />
                <DetailCard label="Role" value={displayRole} />
                <DetailCard label="Department" value={department} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default MyProfile;