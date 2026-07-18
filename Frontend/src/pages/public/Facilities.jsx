import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { useAuth } from "../../context/AuthContext";
import { facilityAPI, bookingAPI } from "../../services/api";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:8084";

const normalizeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const getTodayLocalDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().split("T")[0];
};

const normalizeFacilityStatus = (rawStatus) => {
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

  return normalizeFacilityStatus(raw);
};

const formatStatusLabel = (status) => {
  switch (normalizeFacilityStatus(status)) {
    case "OUT_OF_SERVICE":
      return "Out of Service";
    case "MAINTENANCE":
      return "Maintenance";
    default:
      return "Active";
  }
};

const getStatusClasses = (status) => {
  switch (normalizeFacilityStatus(status)) {
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

const formatFacilityType = (type = "") =>
  String(type || "FACILITY").replaceAll("_", " ");

const resolveFacilityImage = (facility) => {
  const raw =
    facility?.imageUrl ||
    facility?.imageURL ||
    facility?.image_url ||
    facility?.photoUrl ||
    "";

  if (!raw) return "";

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  if (raw.startsWith("/facilities/") || raw.startsWith("/images/")) {
    return raw;
  }

  if (raw.startsWith("/")) {
    return `${BACKEND_URL}${raw}`;
  }

  return raw;
};

const combineDateAndTime = (date, time) => {
  if (!date || !time) return "";
  return `${date}T${time}`;
};

const timeToMinutes = (time) => {
  if (!time || !time.includes(":")) return null;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const parse12HourLabelTo24 = (value) => {
  if (!value) return null;

  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let [, hour, minute, period] = match;
  let h = parseInt(hour, 10);
  const m = parseInt(minute, 10);

  if (period.toUpperCase() === "AM") {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const parseFacilityHours = (schedule) => {
  if (!schedule || typeof schedule !== "string" || !schedule.includes(" - ")) {
    return null;
  }

  const [startLabel, endLabel] = schedule.split(" - ");
  const start = parse12HourLabelTo24(startLabel);
  const end = parse12HourLabelTo24(endLabel);

  if (!start || !end) return null;

  return { start, end };
};

const openNativePicker = (inputRef) => {
  const input = inputRef?.current;
  if (!input) return;

  if (typeof input.showPicker === "function") {
    input.showPicker();
  } else {
    input.focus();
    input.click();
  }
};

const CalendarIcon = () => (
  <svg
    className="h-5 w-5 text-slate-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const ClockIcon = () => (
  <svg
    className="h-5 w-5 text-slate-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const Facilities = () => {
  const { isAuthenticated, isStudent, isLecturer } = useAuth();

  const [facilities, setFacilities] = useState([]);
  const [loadingFacilities, setLoadingFacilities] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const [selectedFacility, setSelectedFacility] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [bookingDate, setBookingDate] = useState("");
  const [startClock, setStartClock] = useState("");
  const [endClock, setEndClock] = useState("");
  const [purpose, setPurpose] = useState("");
  const [expectedAttendees, setExpectedAttendees] = useState(1);

  const [bookingStatus, setBookingStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const bookingDateRef = useRef(null);

  const canBook = isAuthenticated && (isStudent || isLecturer);
  const today = getTodayLocalDate();

  useEffect(() => {
    const loadFacilities = async () => {
      try {
        setLoadingFacilities(true);

        let response;
        try {
          response = await facilityAPI.getActive();
        } catch {
          response = await facilityAPI.getAll();
        }

        const items = normalizeArray(response).filter(
          (facility) => getFacilityStatus(facility) === "ACTIVE"
        );

        setFacilities(items);
      } catch (error) {
        setFacilities([]);
      } finally {
        setLoadingFacilities(false);
      }
    };

    loadFacilities();
  }, []);

  const availableTypes = useMemo(() => {
    const unique = Array.from(
      new Set(
        facilities
          .map((facility) => String(facility?.type || "").toUpperCase())
          .filter(Boolean)
      )
    );

    return unique;
  }, [facilities]);

  const filteredFacilities = useMemo(() => {
    return facilities.filter((facility) => {
      const name = String(facility?.name || "").toLowerCase();
      const description = String(facility?.description || "").toLowerCase();
      const location = String(facility?.location || "").toLowerCase();
      const type = String(facility?.type || "").toUpperCase();

      const matchesSearch =
        !searchText.trim() ||
        name.includes(searchText.toLowerCase()) ||
        description.includes(searchText.toLowerCase()) ||
        location.includes(searchText.toLowerCase());

      const matchesType = typeFilter === "ALL" || type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [facilities, searchText, typeFilter]);

  const openBookingModal = (facility) => {
    setSelectedFacility(facility);
    setBookingStatus("idle");
    setErrorMessage("");
    setBookingDate("");
    setStartClock("");
    setEndClock("");
    setPurpose("");
    setExpectedAttendees(1);
    setIsModalOpen(true);
  };

  const closeBookingModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setSelectedFacility(null);
      setBookingStatus("idle");
      setErrorMessage("");
    }, 200);
  };

  const validateBooking = () => {
    if (!selectedFacility) {
      return "No facility selected.";
    }

    if (!bookingDate || !startClock || !endClock || !purpose.trim()) {
      return "Please fill all required booking details.";
    }

    if (bookingDate < today) {
      return "You cannot book a previous date.";
    }

    const attendees = parseInt(expectedAttendees, 10);

    if (!attendees || attendees < 1) {
      return "Expected attendees must be at least 1.";
    }

    if (selectedFacility?.capacity && attendees > selectedFacility.capacity) {
      return `Expected attendees cannot exceed facility capacity (${selectedFacility.capacity}).`;
    }

    const startMinutes = timeToMinutes(startClock);
    const endMinutes = timeToMinutes(endClock);

    if (startMinutes === null || endMinutes === null) {
      return "Please select valid start and end times.";
    }

    if (endMinutes <= startMinutes) {
      return "End time must be later than start time.";
    }

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (bookingDate === today && startMinutes <= currentMinutes) {
      return "Start time must be later than the current time for today.";
    }

    const facilityHours = parseFacilityHours(
      selectedFacility?.availabilitySchedule
    );

    if (facilityHours) {
      const facilityStart = timeToMinutes(facilityHours.start);
      const facilityEnd = timeToMinutes(facilityHours.end);

      if (startMinutes < facilityStart || endMinutes > facilityEnd) {
        return `Selected time must be within facility hours: ${selectedFacility.availabilitySchedule}.`;
      }
    }

    if (purpose.trim().length < 5) {
      return "Purpose should be at least 5 characters long.";
    }

    return "";
  };

  const handleBookFacility = async (e) => {
    e.preventDefault();

    if (!selectedFacility) return;

    setBookingStatus("loading");
    setErrorMessage("");

    const validationError = validateBooking();

    if (validationError) {
      setBookingStatus("error");
      setErrorMessage(validationError);
      return;
    }

    const attendees = parseInt(expectedAttendees, 10);
    const startTime = combineDateAndTime(bookingDate, startClock);
    const endTime = combineDateAndTime(bookingDate, endClock);

    const bookingRequestData = {
      facilityId: selectedFacility.id,
      startTime,
      endTime,
      purpose: purpose.trim(),
      expectedAttendees: attendees,
    };

    try {
      await bookingAPI.create(bookingRequestData);
      setBookingStatus("success");

      setTimeout(() => {
        closeBookingModal();
      }, 1800);
    } catch (error) {
      setBookingStatus("error");
      setErrorMessage(
        error?.message ||
          "Failed to book facility due to a time conflict or server validation error."
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <section className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
          <div className="max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
              Explore Resources
            </p>
            <h1 className="text-4xl font-extrabold md:text-5xl">
              Campus Facilities
            </h1>
            <p className="mt-4 text-base leading-8 text-slate-300 md:text-lg">
              Browse available campus spaces and submit facility booking requests
              for lectures, meetings, study sessions, and academic activities.
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl flex-grow px-6 py-10 lg:px-10">
        {!isAuthenticated ? (
          <div className="rounded-[32px] bg-white p-12 text-center shadow-md ring-1 ring-slate-200">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-4xl">
              🔐
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-slate-900">
              Login Required
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base leading-8 text-slate-600">
              Please log in with your university account to view available
              facilities and submit booking requests.
            </p>
            <Link
              to="/login"
              className="mt-8 inline-flex rounded-xl bg-yellow-500 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-yellow-600"
            >
              Go to Login
            </Link>
          </div>
        ) : loadingFacilities ? (
          <div className="rounded-[32px] bg-white p-12 text-center shadow-md ring-1 ring-slate-200">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-yellow-500 border-t-transparent"></div>
            <p className="mt-4 text-slate-600">Loading facilities...</p>
          </div>
        ) : (
          <>
            <div className="mb-8 rounded-3xl bg-white p-5 shadow-md ring-1 ring-slate-200">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Search Facilities
                  </label>
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search by name, description, or location"
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
                    {availableTypes.map((type) => (
                      <option key={type} value={type}>
                        {formatFacilityType(type)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {filteredFacilities.length === 0 ? (
              <div className="rounded-[32px] bg-white p-12 text-center shadow-md ring-1 ring-slate-200">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100 text-4xl">
                  🏢
                </div>
                <h3 className="mt-5 text-2xl font-bold text-slate-900">
                  No Facilities Found
                </h3>
                <p className="mt-3 text-slate-600">
                  No active facilities match the current filters.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredFacilities.map((facility) => {
                  const imageUrl = resolveFacilityImage(facility);
                  const status = getFacilityStatus(facility);

                  return (
                    <div
                      key={facility.id}
                      className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-md ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div className="relative h-40 bg-slate-100">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
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

                        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent"></div>

                        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase shadow ${getStatusClasses(
                              status
                            )}`}
                          >
                            {formatStatusLabel(status)}
                          </span>
                          <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase text-yellow-700 shadow">
                            {formatFacilityType(facility.type)}
                          </span>
                        </div>
                      </div>

                      <div className="p-4">
                        <h3 className="text-xl font-extrabold leading-tight text-slate-900">
                          {facility.name}
                        </h3>

                        <p
                          className="mt-2 text-sm leading-6 text-slate-600"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
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
                        </div>

                        {canBook ? (
                          <button
                            type="button"
                            onClick={() => openBookingModal(facility)}
                            className="mt-4 w-full rounded-xl bg-yellow-500 px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-yellow-600"
                          >
                            Book Facility
                          </button>
                        ) : (
                          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-500">
                            Only students and lecturers can book facilities
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {isModalOpen && selectedFacility && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl md:flex-row">
            <div className="relative h-60 w-full bg-slate-100 md:h-auto md:w-2/5">
              {resolveFacilityImage(selectedFacility) ? (
                <img
                  src={resolveFacilityImage(selectedFacility)}
                  alt={selectedFacility.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-6xl">
                  🏢
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>

              <div className="absolute bottom-5 left-5 right-5">
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase shadow ${getStatusClasses(
                    getFacilityStatus(selectedFacility)
                  )}`}
                >
                  {formatStatusLabel(getFacilityStatus(selectedFacility))}
                </span>

                <h3 className="mt-4 text-2xl font-extrabold text-white">
                  {selectedFacility.name}
                </h3>
                <p className="mt-2 text-sm font-semibold text-yellow-300">
                  {selectedFacility.location}
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-200">
                  {selectedFacility.availabilitySchedule || "Schedule not available"}
                </p>
              </div>
            </div>

            <div className="relative w-full overflow-y-auto p-6 md:w-3/5">
              <button
                type="button"
                onClick={closeBookingModal}
                className="absolute right-4 top-4 rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-yellow-600">
                Booking Request
              </p>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                Reserve This Facility
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Fill the reservation details below. Your request will be sent
                for manager/admin review.
              </p>

              {bookingStatus === "success" ? (
                <div className="mt-8 rounded-3xl border border-green-200 bg-green-50 p-8 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white shadow-md">
                    <svg
                      className="h-8 w-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>

                  <h4 className="mt-5 text-xl font-extrabold text-green-900">
                    Booking Request Submitted
                  </h4>
                  <p className="mt-2 text-sm leading-7 text-green-700">
                    Your reservation request has been sent successfully. You can
                    track it in your bookings page.
                  </p>

                  <Link
                    to="/my-bookings"
                    className="mt-6 inline-flex rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
                  >
                    View My Bookings
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleBookFacility} className="mt-8 space-y-5">
                  {bookingStatus === "error" && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {errorMessage}
                    </div>
                  )}

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Booking Date
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                          <CalendarIcon />
                        </div>

                        <input
                          ref={bookingDateRef}
                          type="date"
                          required
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                          onClick={() => openNativePicker(bookingDateRef)}
                          min={today}
                          className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-12 pr-14 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                        />

                        <button
                          type="button"
                          onClick={() => openNativePicker(bookingDateRef)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                          <CalendarIcon />
                        </button>
                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        Select a date from the calendar. Previous dates are disabled.
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Expected Attendees
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={selectedFacility.capacity || 1}
                        required
                        value={expectedAttendees}
                        onChange={(e) => setExpectedAttendees(e.target.value)}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Start Time
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                          <ClockIcon />
                        </div>
                        <input
                          type="time"
                          required
                          value={startClock}
                          onChange={(e) => setStartClock(e.target.value)}
                          className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        End Time
                      </label>
                      <div className="relative">
                        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                          <ClockIcon />
                        </div>
                        <input
                          type="time"
                          required
                          value={endClock}
                          onChange={(e) => setEndClock(e.target.value)}
                          className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Purpose
                    </label>
                    <textarea
                      required
                      rows="4"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="Explain why you need this facility..."
                      className="w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                    />
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Booking Summary
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Facility
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-900">
                          {selectedFacility.name}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Capacity Limit
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-900">
                          {selectedFacility.capacity || "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Selected Date
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-900">
                          {bookingDate || "Not selected"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Selected Time
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-900">
                          {startClock && endClock
                            ? `${startClock} - ${endClock}`
                            : "Not selected"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={bookingStatus === "loading"}
                    className={`w-full rounded-xl px-5 py-3 text-sm font-semibold text-white shadow transition ${
                      bookingStatus === "loading"
                        ? "cursor-not-allowed bg-yellow-300 text-yellow-900"
                        : "bg-yellow-500 hover:bg-yellow-600"
                    }`}
                  >
                    {bookingStatus === "loading"
                      ? "Submitting Request..."
                      : "Confirm Booking"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Facilities;