import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { useAuth } from "../../context/AuthContext";
import { facilityAPI } from "../../services/api";

const normalizeAnalyticsArray = (data) => {
  if (Array.isArray(data)) return data;
  return [];
};

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeStatus = (rawStatus) => {
  const value = String(rawStatus || "").toUpperCase();

  if (value === "OUT_OF_SERVICE") return "OUT_OF_SERVICE";
  if (value === "MAINTENANCE") return "MAINTENANCE";
  return "ACTIVE";
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

const AnalyticsCard = ({
  title,
  value,
  subtitle,
  icon,
  valueClass = "text-slate-900",
}) => (
  <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className={`mt-2 text-3xl font-extrabold ${valueClass}`}>{value}</h3>
        {subtitle ? (
          <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
        ) : null}
      </div>

      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-xl">
        {icon}
      </div>
    </div>
  </div>
);

const InsightCard = ({ title, value, description, icon }) => (
  <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-xl">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          {title}
        </p>
        <h3 className="mt-2 break-words text-xl font-extrabold text-slate-900">
          {value || "N/A"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  </div>
);

const AnalyticsBarList = ({ title, subtitle, items, barColor = "bg-blue-500" }) => {
  const maxValue = Math.max(...items.map((item) => safeNumber(item?.value)), 1);

  return (
    <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
      <div className="mb-5">
        <h3 className="text-xl font-extrabold text-slate-900">{title}</h3>
        {subtitle ? (
          <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-500">
          No data available.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => {
            const value = safeNumber(item?.value);
            const width = `${Math.max((value / maxValue) * 100, value > 0 ? 12 : 0)}%`;

            return (
              <div key={`${item?.label || "item"}-${index}`} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-slate-700">
                    {item?.label || "Unknown"}
                  </p>
                  <span className="shrink-0 text-sm font-bold text-slate-900">
                    {value}
                  </span>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${barColor}`}
                    style={{ width }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const FacilityRankingCard = ({
  title,
  subtitle,
  items,
  emptyText,
  accentClass = "bg-yellow-500",
}) => (
  <div className="rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
    <div className="mb-5">
      <h3 className="text-xl font-extrabold text-slate-900">{title}</h3>
      {subtitle ? (
        <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
      ) : null}
    </div>

    {items.length === 0 ? (
      <div className="rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-500">
        {emptyText}
      </div>
    ) : (
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={`${item?.facilityId || item?.facilityName || "facility"}-${index}`}
            className="rounded-2xl bg-slate-50 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black text-white ${accentClass}`}
                  >
                    {index + 1}
                  </div>

                  <div className="min-w-0">
                    <h4 className="truncate text-base font-extrabold text-slate-900">
                      {item?.facilityName || "Unknown Facility"}
                    </h4>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {String(item?.type || "Unknown").replaceAll("_", " ")}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                    {item?.location || "Unknown location"}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                      item?.status
                    )}`}
                  >
                    {formatStatusLabel(item?.status)}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                    Capacity: {item?.capacity ?? "N/A"}
                  </span>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Approved
                </p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">
                  {safeNumber(item?.approvedBookingCount)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const FacilityAnalytics = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");

  const fetchAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError("");
      const response = await facilityAPI.getAnalytics();
      setAnalytics(response || {});
    } catch (err) {
      setAnalytics(null);
      setAnalyticsError(err.message || "Failed to load facility analytics.");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const analyticsSummary = useMemo(() => analytics?.summary || {}, [analytics]);
  const analyticsInsights = useMemo(() => analytics?.insights || {}, [analytics]);

  const facilitiesByTypeData = useMemo(
    () => normalizeAnalyticsArray(analytics?.facilitiesByType),
    [analytics]
  );
  const facilitiesByLocationData = useMemo(
    () => normalizeAnalyticsArray(analytics?.facilitiesByLocation),
    [analytics]
  );
  const bookingsByTypeData = useMemo(
    () => normalizeAnalyticsArray(analytics?.bookingsByType),
    [analytics]
  );
  const bookingsByLocationData = useMemo(
    () => normalizeAnalyticsArray(analytics?.bookingsByLocation),
    [analytics]
  );
  const peakBookingHoursData = useMemo(
    () => normalizeAnalyticsArray(analytics?.peakBookingHours),
    [analytics]
  );
  const topBookedFacilitiesData = useMemo(
    () => normalizeAnalyticsArray(analytics?.topBookedFacilities),
    [analytics]
  );
  const underusedFacilitiesData = useMemo(
    () => normalizeAnalyticsArray(analytics?.underusedFacilities),
    [analytics]
  );

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
              Facility analytics is only available for admin accounts.
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

      <section className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
            Admin Control
          </p>
          <h1 className="text-4xl font-extrabold md:text-5xl">
            Facility Analytics Dashboard
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
            Analyze booking demand, discover peak hours, identify top-used facilities,
            and spot underused resources to improve smart campus decisions.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => navigate("/admin/facilities/manage")}
              className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-white shadow transition hover:bg-yellow-600"
            >
              Create Facility and View Facilities
            </button>

            <button
              type="button"
              onClick={fetchAnalytics}
              className="rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Refresh Analytics
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        {analyticsLoading ? (
          <div className="rounded-3xl bg-white p-12 text-center shadow-md ring-1 ring-slate-200">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-4 text-slate-600">Loading facility analytics...</p>
          </div>
        ) : analyticsError ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-md">
            <h3 className="text-xl font-extrabold text-red-700">
              Facility analytics unavailable
            </h3>
            <p className="mt-3 text-sm leading-7 text-red-700">
              {analyticsError}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <AnalyticsCard
                title="Approved Bookings"
                value={analyticsSummary.totalApprovedBookings ?? 0}
                subtitle="Confirmed usage records"
                icon="📘"
              />
              <AnalyticsCard
                title="Avg. Bookings / Facility"
                value={analyticsSummary.averageBookingsPerFacility ?? 0}
                subtitle="Average approved bookings"
                icon="📊"
                valueClass="text-blue-600"
              />
              <AnalyticsCard
                title="Active Facilities"
                value={analyticsSummary.activeFacilities ?? 0}
                subtitle="Available for reservations"
                icon="🟢"
                valueClass="text-green-600"
              />
              <AnalyticsCard
                title="Out of Service"
                value={analyticsSummary.outOfServiceFacilities ?? 0}
                subtitle="Unavailable resources"
                icon="🚫"
                valueClass="text-red-600"
              />
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              <InsightCard
                title="Most Booked Facility"
                value={analyticsInsights.mostBookedFacility}
                description="Resource with the highest approved booking count."
                icon="🏆"
              />
              <InsightCard
                title="Least Used Facility"
                value={analyticsInsights.leastUsedFacility}
                description="Facility currently receiving the lowest demand."
                icon="📉"
              />
              <InsightCard
                title="Busiest Hour"
                value={analyticsInsights.busiestHour}
                description="Peak booking hour based on approved reservations."
                icon="⏰"
              />
              <InsightCard
                title="Most Common Type"
                value={analyticsInsights.mostCommonFacilityType}
                description="Facility type with the highest campus presence."
                icon="🏢"
              />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <AnalyticsBarList
                title="Facilities by Type"
                subtitle="Distribution of registered facility types."
                items={facilitiesByTypeData}
                barColor="bg-blue-500"
              />

              <AnalyticsBarList
                title="Bookings by Facility Type"
                subtitle="Approved bookings grouped by facility type."
                items={bookingsByTypeData}
                barColor="bg-green-500"
              />

              <AnalyticsBarList
                title="Facilities by Location"
                subtitle="Campus resource distribution across locations."
                items={facilitiesByLocationData}
                barColor="bg-purple-500"
              />

              <AnalyticsBarList
                title="Peak Booking Hours"
                subtitle="Most demanded booking time ranges."
                items={peakBookingHoursData}
                barColor="bg-orange-500"
              />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <FacilityRankingCard
                title="Top Booked Facilities"
                subtitle="Highest approved booking counts in the system."
                items={topBookedFacilitiesData}
                emptyText="No approved booking data available yet."
                accentClass="bg-green-500"
              />

              <FacilityRankingCard
                title="Underused Facilities"
                subtitle="Facilities with the lowest approved usage counts."
                items={underusedFacilitiesData}
                emptyText="No facility usage data available yet."
                accentClass="bg-orange-500"
              />
            </div>

            {bookingsByLocationData.length > 0 && (
              <div className="mt-6">
                <AnalyticsBarList
                  title="Bookings by Location"
                  subtitle="Approved reservations grouped by location."
                  items={bookingsByLocationData}
                  barColor="bg-pink-500"
                />
              </div>
            )}
          </>
        )}
      </section>

      <Footer />
    </div>
  );
};

export default FacilityAnalytics;