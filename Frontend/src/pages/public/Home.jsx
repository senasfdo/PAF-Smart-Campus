import React from "react";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";

const Home = () => {
  const quickFeatures = [
    {
      title: "QUICK ACCESS TO\nESSENTIAL SERVICES",
      text: "Quick access to essential services and manage your profile.",
      icon: (
        <svg
          className="h-7 w-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
    },
    {
      title: "FACILITY BOOKING\nSIMPLIFIED",
      text: "Book campus facilities quickly and manage your reservations with ease.",
      icon: (
        <svg
          className="h-7 w-7"
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
      ),
    },
    {
      title: "CAMPUS MAPS &\nNAVIGATION",
      text: "Navigate the campus easily and find important places faster.",
      icon: (
        <svg
          className="h-7 w-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
          />
        </svg>
      ),
    },
    {
      title: "CAMPUS UPDATES &\nNEWS",
      text: "Stay informed with the latest announcements and campus updates.",
      icon: (
        <svg
          className="h-7 w-7"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
          />
        </svg>
      ),
    },
  ];

  const glanceFacilities = [
    { name: "Library", status: "Closed" },
    { name: "Gym", status: "Closed" },
    { name: "Study Rooms", status: "Closed" },
    { name: "Lab", status: "Closed" },
  ];

  const facilityCards = [
    {
      title: "Central Library",
      image:
        "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=600&q=80",
      description:
        "A vast collection of academic resources, quiet study zones, and collaborative pods equipped with smart screens.",
    },
    {
      title: "Fitness Center",
      image:
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=600&q=80",
      description:
        "State-of-the-art cardiovascular and strength training equipment, group fitness studios, and indoor courts.",
    },
    {
      title: "Research Labs",
      image:
        "https://images.unsplash.com/photo-1563206767-5b18f218e8de?auto=format&fit=crop&w=600&q=80",
      description:
        "Advanced computing and science laboratories available for undergraduate and postgraduate research.",
    },
  ];

  const contactCards = [
    {
      title: "Email",
      value: "support@smartcampus.edu",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      title: "Phone",
      value: "+1 (555) 123-4567",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
          />
        </svg>
      ),
    },
    {
      title: "Office",
      value: "Main Admins, Room 101",
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <Navbar />

      {/* HERO */}
      <section className="relative min-h-[78vh] overflow-hidden pt-24">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/65 to-black/45" />

        <div className="relative z-10 mx-auto flex min-h-[78vh] max-w-7xl items-center px-6 py-16 lg:px-10">
          <div className="max-w-4xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-yellow-400">
              Welcome to Smart Campus
            </p>
            <h1 className="text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-6xl">
              Innovating Your
              <br />
              <span className="text-yellow-500">College Experience</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-200 md:text-lg">
              Access seamless services, modern facilities, and digital campus
              resources at your fingertips.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#facilities"
                className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-sm font-bold text-yellow-600 shadow-lg transition hover:bg-yellow-50 hover:text-yellow-700"
              >
                Explore Facilities
              </a>

              <a
                href="#contact"
                className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-8 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK FEATURES */}
      <section className="relative z-20 -mt-14 px-6 lg:px-10">
        <div className="mx-auto max-w-7xl rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200 md:p-8">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {quickFeatures.map((item, index) => (
              <div
                key={index}
                className={`flex h-full flex-col rounded-2xl border border-slate-100 p-5 ${
                  index !== 0 ? "xl:border-l xl:border-l-slate-200" : ""
                }`}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-50 text-yellow-500">
                  {item.icon}
                </div>

                <h3 className="whitespace-pre-line text-sm font-extrabold leading-6 text-slate-900">
                  {item.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {item.text}
                </p>

                <button className="mt-5 inline-flex w-fit rounded-full border border-yellow-500 px-4 py-2 text-xs font-semibold text-yellow-600 transition hover:bg-yellow-50">
                  Learn More
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FACILITIES AT A GLANCE */}
      <section className="mt-14 bg-slate-50 py-14">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="mb-6 flex items-center justify-between rounded-2xl bg-yellow-500 px-5 py-4 shadow-md">
            <h2 className="text-sm font-bold tracking-[0.2em] text-white md:text-base">
              FACILITIES AT A GLANCE
            </h2>

            <div className="flex gap-2">
              <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30">
                {"<"}
              </button>
              <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-yellow-600 shadow transition hover:bg-yellow-50">
                {">"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {glanceFacilities.map((facility, index) => (
              <div
                key={index}
                className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {facility.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Real-time Availability
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-red-500">
                    {facility.status}
                  </span>

                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
                    <svg
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="scroll-mt-28 py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <img
                src="/about-us-students.png"
                alt="Students on campus"
                className="h-[420px] w-full rounded-3xl object-cover shadow-xl"
              />
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-500">
                Discover Our Campus
              </p>
              <h2 className="mt-3 text-3xl font-extrabold text-slate-900 md:text-4xl">
                About Us
              </h2>
              <p className="mt-6 text-base leading-8 text-slate-600">
                Smart Campus Hub is designed to revolutionize the way students,
                faculty, and staff interact with university resources. We bridge
                the gap between academic needs and digital convenience.
              </p>
              <p className="mt-5 text-base leading-8 text-slate-600">
                Our platform provides a centralized, mobile-responsive
                environment for checking facility availability in real-time,
                booking rooms, staying updated with campus news, and navigating
                the grounds effortlessly.
              </p>

              <a
                href="#contact"
                className="mt-8 inline-flex rounded-full bg-yellow-500 px-8 py-3 text-sm font-semibold text-white shadow transition hover:bg-yellow-600"
              >
                Get In Touch
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FACILITIES */}
      <section
        id="facilities"
        className="scroll-mt-28 border-t border-slate-100 bg-slate-50 py-20"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-500">
              Explore Resources
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900 md:text-4xl">
              Campus Facilities
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Our modern campus is equipped with state-of-the-art facilities
              designed to support your academic and extracurricular journey.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {facilityCards.map((facility, index) => (
              <div
                key={index}
                className="flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-md transition hover:-translate-y-1 hover:shadow-xl"
              >
                <img
                  src={facility.image}
                  alt={facility.title}
                  className="h-56 w-full object-cover"
                />

                <div className="flex flex-1 flex-col p-6">
                  <h3 className="text-2xl font-extrabold text-slate-900">
                    {facility.title}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-slate-600">
                    {facility.description}
                  </p>

                  <button className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-yellow-600 transition hover:text-yellow-700">
                    Check Availability
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="scroll-mt-28 bg-white py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="border-t border-slate-100 pt-20">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-extrabold text-slate-900 md:text-4xl">
                Contact Us
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                Have questions or need assistance? Reach out to our campus
                administration and support teams.
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-2 xl:grid-cols-3">
              {contactCards.map((item, index) => (
                <div
                  key={index}
                  className="flex min-h-[210px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-6 py-8 text-center shadow-sm"
                >
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                    {item.icon}
                  </div>
                  <h3 className="text-2xl font-extrabold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-base leading-7 text-slate-600">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;