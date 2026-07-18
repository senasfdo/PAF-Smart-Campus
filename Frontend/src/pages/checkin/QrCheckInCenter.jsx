import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const QrCheckInCenter = () => {
  const navigate = useNavigate();
  const { dashboardPath } = useAuth();

  const [activeTab, setActiveTab] = useState("scan");
  const [tokenInput, setTokenInput] = useState("");
  const [manualError, setManualError] = useState("");

  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const scanTimeoutRef = useRef(null);

  const scannerSupported = useMemo(() => {
    return (
      typeof window !== "undefined" &&
      "BarcodeDetector" in window &&
      !!navigator.mediaDevices &&
      !!navigator.mediaDevices.getUserMedia
    );
  }, []);

  const stopScanner = () => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setScannerActive(false);
    setCameraReady(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const extractToken = (input) => {
    const raw = String(input || "").trim();
    if (!raw) return "";

    try {
      if (raw.startsWith("http://") || raw.startsWith("https://")) {
        const url = new URL(raw);
        const parts = url.pathname.split("/").filter(Boolean);
        const qrIndex = parts.findIndex((part) => part === "qr-check-in");

        if (qrIndex !== -1 && parts[qrIndex + 1]) {
          return decodeURIComponent(parts[qrIndex + 1]);
        }
      }
    } catch {
      // ignore URL parse failure
    }

    if (raw.includes("/qr-check-in/")) {
      const parts = raw.split("/qr-check-in/");
      return decodeURIComponent(parts[parts.length - 1].split("?")[0].trim());
    }

    return raw;
  };

  const goToVerificationPage = (value) => {
    const token = extractToken(value);

    if (!token) {
      return false;
    }

    navigate(`/qr-check-in/${encodeURIComponent(token)}`);
    return true;
  };

  const handleManualVerify = (e) => {
    e.preventDefault();
    setManualError("");

    const ok = goToVerificationPage(tokenInput);

    if (!ok) {
      setManualError("Please enter a valid QR token or QR check-in link.");
    }
  };

  const scanFrame = async () => {
    if (!videoRef.current || !detectorRef.current) {
      return;
    }

    try {
      const codes = await detectorRef.current.detect(videoRef.current);

      if (Array.isArray(codes) && codes.length > 0) {
        const rawValue = codes[0]?.rawValue || "";
        if (rawValue) {
          stopScanner();
          goToVerificationPage(rawValue);
          return;
        }
      }
    } catch {
      // keep scanning silently
    }

    scanTimeoutRef.current = setTimeout(scanFrame, 350);
  };

  const startScanner = async () => {
    setScannerError("");
    setManualError("");

    if (!scannerSupported) {
      setScannerError(
        "Live camera QR scanning is not supported in this browser. Please use the token entry option."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });

      const detector = new window.BarcodeDetector({
        formats: ["qr_code"],
      });

      detectorRef.current = detector;
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setScannerActive(true);
      setCameraReady(true);
      scanFrame();
    } catch (error) {
      stopScanner();
      setScannerError(
        error?.message ||
          "Unable to access the camera. Please allow camera permission or use token entry."
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-yellow-600">
            QR Check-In Center
          </p>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Booking Check-In Hub
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-500 sm:text-base">
            Verify approved facility bookings by scanning a QR code or entering
            the booking token manually.
          </p>
        </div>

        <div className="overflow-hidden rounded-[32px] bg-white shadow-xl ring-1 ring-slate-200">
          <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Check-In Options
                </p>
                <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                  Choose a verification method
                </h2>
              </div>

              <button
                type="button"
                onClick={() => navigate(dashboardPath || "/")}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back to Dashboard
              </button>
            </div>
          </div>

          <div className="px-6 pt-6 sm:px-8">
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setActiveTab("scan")}
                className={`rounded-2xl border px-5 py-4 text-left transition ${
                  activeTab === "scan"
                    ? "border-yellow-300 bg-yellow-50 shadow-sm"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-700">
                  Option 01
                </p>
                <h3 className="mt-2 text-xl font-extrabold text-slate-900">
                  Scan QR
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Use the camera to scan the QR code shown by the student.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("manual")}
                className={`rounded-2xl border px-5 py-4 text-left transition ${
                  activeTab === "manual"
                    ? "border-yellow-300 bg-yellow-50 shadow-sm"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-700">
                  Option 02
                </p>
                <h3 className="mt-2 text-xl font-extrabold text-slate-900">
                  Enter Token
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Paste the QR token or the full QR check-in link manually.
                </p>
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {activeTab === "scan" ? (
              <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Camera Scanner
                  </p>

                  <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-black">
                    <div className="relative aspect-[4/3] w-full">
                      {scannerActive ? (
                        <>
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="h-full w-full object-cover"
                          />
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="h-48 w-48 rounded-3xl border-4 border-yellow-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.22)]" />
                          </div>
                        </>
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center text-white">
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl">
                            📷
                          </div>
                          <p className="mt-4 text-lg font-bold">
                            QR scanner is ready
                          </p>
                          <p className="mt-2 max-w-md text-sm leading-6 text-white/75">
                            Start the camera and position the QR code inside the
                            square area.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {scannerError && (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                      <p className="text-sm font-semibold text-red-700">
                        {scannerError}
                      </p>
                    </div>
                  )}

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    {!scannerActive ? (
                      <button
                        type="button"
                        onClick={startScanner}
                        className="flex-1 rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-black"
                      >
                        Start Scanner
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopScanner}
                        className="flex-1 rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Stop Scanner
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveTab("manual")}
                      className="flex-1 rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Use Token Instead
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Instructions
                    </p>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm font-medium leading-7 text-slate-700">
                        1. Click <span className="font-bold">Start Scanner</span>.
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm font-medium leading-7 text-slate-700">
                        2. Ask the student to show the booking QR code.
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm font-medium leading-7 text-slate-700">
                        3. Once scanned, you will be taken to the verification page.
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-700">
                      Note
                    </p>
                    <p className="mt-3 text-sm leading-7 text-blue-800">
                      If camera scanning is not supported in your browser, use
                      the <span className="font-bold">Enter Token</span> option.
                    </p>
                    {scannerSupported && (
                      <p className="mt-2 text-xs font-medium text-blue-700">
                        Camera scanning support detected.
                      </p>
                    )}
                    {!scannerSupported && (
                      <p className="mt-2 text-xs font-medium text-blue-700">
                        Live camera scanning is unavailable in this browser.
                      </p>
                    )}
                    {cameraReady && (
                      <p className="mt-2 text-xs font-medium text-emerald-700">
                        Camera is active and ready to scan.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Manual Verification
                  </p>
                  <h3 className="mt-2 text-2xl font-extrabold text-slate-900">
                    Enter QR token or check-in link
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Paste the QR token directly, or paste the full
                    <span className="font-semibold"> /qr-check-in/...</span> link.
                  </p>

                  <form onSubmit={handleManualVerify} className="mt-6 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        QR Token / Link
                      </label>
                      <input
                        type="text"
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        placeholder="Paste token or full QR check-in link here"
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100"
                      />
                    </div>

                    {manualError && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                        <p className="text-sm font-semibold text-red-700">
                          {manualError}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="submit"
                        className="flex-1 rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-black"
                      >
                        Verify Booking
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTokenInput("");
                          setManualError("");
                        }}
                        className="flex-1 rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Clear
                      </button>
                    </div>
                  </form>
                </div>

                <div className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-5">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-700">
                    Helpful Tip
                  </p>
                  <p className="mt-3 text-sm leading-7 text-blue-800">
                    You can paste either:
                  </p>
                  <ul className="mt-3 space-y-2 text-sm font-medium text-blue-800">
                    <li>• only the QR token</li>
                    <li>• or the full QR check-in link copied from the QR code</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QrCheckInCenter;