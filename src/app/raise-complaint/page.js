"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getCitizenId } from "@/lib/citizen";

const STEPS = {
  ISSUE: "issue",
  LOCATION: "location",
  REVIEW: "review",
  SIMILAR: "similar",
  CONFIRMATION: "confirmation",
  SUCCESS: "success",
};

const LOCATIONS = [
  "Dwarka, Delhi",
  "Rohini, Delhi",
  "Janakpuri, Delhi",
  "Saket, Delhi",
];

const MOCK_SIMILAR_COMPLAINTS = [
  {
    id: "sim-1",
    title: "Pothole near Sector 12 main road",
    location: "Sector 12, Dwarka",
    supportCount: 128,
  },
  {
    id: "sim-2",
    title: "Damaged road surface outside community park",
    location: "Sector 12, Dwarka",
    supportCount: 74,
  },
];

const CATEGORIES = [
  "Roads",
  "Streetlight",
  "Waste",
  "Water",
  "Traffic",
  "Environment",
];

function derivePriority(description) {
  const len = description.trim().length;
  if (len > 180) return "high";
  if (len > 80) return "medium";
  return "low";
}

function deriveCategory(description) {
  const lower = description.toLowerCase();
  if (lower.includes("water")) return "Water";
  if (lower.includes("light")) return "Streetlight";
  if (lower.includes("garbage") || lower.includes("waste")) return "Waste";
  if (lower.includes("traffic") || lower.includes("signal")) return "Traffic";
  if (lower.includes("tree") || lower.includes("pollution"))
    return "Environment";
  return "Roads";
}

const PRIORITY_STYLES = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

export default function RaiseComplaintPage() {
  const [step, setStep] = useState(STEPS.ISSUE);

  const [description, setDescription] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);

  const [selectedLocation, setSelectedLocation] = useState("Dwarka, Delhi");
  const [isLocationOpen, setIsLocationOpen] = useState(false);

  const [assessedCategory, setAssessedCategory] = useState("");
  const [assessedPriority, setAssessedPriority] = useState("low");
  const [similarFound, setSimilarFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    const isImage = file.type.startsWith("image/");
    if (isImage) {
      const url = URL.createObjectURL(file);
      setMediaPreview(url);
    } else {
      setMediaPreview(null);
    }
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const goToLocation = () => {
    if (!description.trim()) return;
    setStep(STEPS.LOCATION);
  };

  const goToReview = () => {
    setStep(STEPS.REVIEW);
  };

  // Simulate local AI review
  useEffect(() => {
    if (step !== STEPS.REVIEW) return;

    const category = deriveCategory(description);
    const priority = derivePriority(description);
    const foundSimilar =
      category === "Roads" &&
      description.trim().length > 20 &&
      Math.random() > 0.4;

    const timer = setTimeout(() => {
      setAssessedCategory(category);
      setAssessedPriority(priority);
      setSimilarFound(foundSimilar);
      setStep(foundSimilar ? STEPS.SIMILAR : STEPS.CONFIRMATION);
    }, 1600);

    return () => clearTimeout(timer);
  }, [step, description]);

  const handleSupportExisting = () => {
    setStep(STEPS.CONFIRMATION);
  };

  const handleReportAnyway = () => {
    setStep(STEPS.CONFIRMATION);
  };

  const handleSubmitComplaint = async () => {
    setIsSubmitting(true);
    setSubmitError("");

    const cleanDesc = description.trim();
    // Derive a readable title from the first sentence or first 70 characters
    const firstSentence = cleanDesc.split(/[.\n]/)[0]?.trim();
    const title =
      firstSentence && firstSentence.length <= 80
        ? firstSentence
        : cleanDesc.slice(0, 75).trim() + (cleanDesc.length > 75 ? "..." : "");

    const citizenId = getCitizenId();

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from("complaints").insert([
          {
            title: title || "Civic complaint",
            description: cleanDesc,
            category: assessedCategory || CATEGORIES[0],
            location: selectedLocation,
            priority: assessedPriority || "low",
            status: "Submitted",
            image: null,
            citizen_id: citizenId,
            support_count: 1,
            dont_support_count: 0,
          },
        ]);

        if (error) {
          console.error("Error submitting complaint to Supabase:", error);
          setSubmitError("Failed to submit complaint. Please try again.");
          setIsSubmitting(false);
          return;
        }
      } catch (err) {
        console.error("Submission request error:", err);
        setSubmitError("Network error. Please try again.");
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(false);
    setStep(STEPS.SUCCESS);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-2xl items-center px-4 sm:px-6">
          <Link
            href="/"
            className="rounded-sm text-sm font-medium text-neutral-600 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            ← Back to Darpan
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        {step !== STEPS.SUCCESS && (
          <StepIndicator currentStep={step} similarFound={similarFound} />
        )}

        {step === STEPS.ISSUE && (
          <section aria-labelledby="issue-heading" className="mt-6">
            <h1
              id="issue-heading"
              className="text-lg font-semibold text-neutral-900 sm:text-xl"
            >
              What happened?
            </h1>

            <label htmlFor="complaint-description" className="sr-only">
              Describe the issue
            </label>
            <textarea
              id="complaint-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="Describe the civic issue in detail..."
              className="mt-4 w-full resize-none rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
            />

            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-neutral-700">
                Add Photo/Video
              </p>

              {!mediaFile ? (
                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current && fileInputRef.current.click()
                  }
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 bg-white px-4 py-8 text-sm text-neutral-500 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-6 w-6 text-neutral-400"
                    aria-hidden="true"
                  >
                    <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
                    <path d="M20 16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3" />
                  </svg>
                  <span>Tap to upload a photo or video</span>
                </button>
              ) : (
                <div className="flex items-center gap-3 rounded-md border border-neutral-200 bg-white p-3">
                  {mediaPreview ? (
                    <img
                      src={mediaPreview}
                      alt="Uploaded preview"
                      className="h-16 w-16 flex-shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md bg-neutral-100 text-xs text-neutral-500">
                      Video
                    </div>
                  )}
                  <span className="flex-1 truncate text-sm text-neutral-700">
                    {mediaFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveMedia}
                    aria-label="Remove uploaded media"
                    className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <button
              type="button"
              onClick={goToLocation}
              disabled={!description.trim()}
              className="mt-6 w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
            </button>
          </section>
        )}

        {step === STEPS.LOCATION && (
          <section aria-labelledby="location-heading" className="mt-6">
            <h1
              id="location-heading"
              className="text-lg font-semibold text-neutral-900 sm:text-xl"
            >
              Where is the issue?
            </h1>

            <div className="relative mt-4">
              <button
                type="button"
                onClick={() => setIsLocationOpen((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={isLocationOpen}
                className="flex w-full items-center justify-between rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-800 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
              >
                <span className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4 text-neutral-500"
                    aria-hidden="true"
                  >
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {selectedLocation}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`h-4 w-4 text-neutral-400 transition-transform ${
                    isLocationOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {isLocationOpen && (
                <div
                  role="menu"
                  aria-label="Select location"
                  className="absolute left-0 right-0 z-10 mt-1 rounded-md border border-neutral-200 bg-white py-1 shadow-md"
                >
                  {LOCATIONS.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      role="menuitemradio"
                      aria-checked={loc === selectedLocation}
                      onClick={() => {
                        setSelectedLocation(loc);
                        setIsLocationOpen(false);
                      }}
                      className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-neutral-50 ${
                        loc === selectedLocation
                          ? "bg-neutral-50 font-medium text-neutral-900"
                          : "text-neutral-700"
                      }`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div
              className="mt-4 flex h-40 w-full items-center justify-center rounded-md border border-neutral-200 bg-neutral-100 text-sm text-neutral-500"
              aria-label="Map placeholder"
            >
              Map preview will appear here
            </div>

            <button
              type="button"
              onClick={goToReview}
              className="mt-6 w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            >
              Continue
            </button>
          </section>
        )}

        {step === STEPS.REVIEW && (
          <section
            aria-live="polite"
            className="mt-16 flex flex-col items-center text-center"
          >
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900"
              aria-hidden="true"
            />
            <p className="mt-4 text-sm font-medium text-neutral-700">
              Darpan is reviewing your complaint...
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Checking category, severity, and similar reports nearby.
            </p>
          </section>
        )}

        {step === STEPS.SIMILAR && (
          <section aria-labelledby="similar-heading" className="mt-6">
            <h1
              id="similar-heading"
              className="text-lg font-semibold text-neutral-900 sm:text-xl"
            >
              We found similar complaints nearby
            </h1>

            <div className="mt-4 flex flex-col gap-3">
              {MOCK_SIMILAR_COMPLAINTS.map((item) => (
                <div
                  key={item.id}
                  className="rounded-md border border-neutral-200 bg-white p-3"
                >
                  <p className="text-sm font-medium text-neutral-900">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {item.location}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {item.supportCount} citizens supporting
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleSupportExisting}
                className="flex-1 rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
              >
                Support Existing Issue
              </button>
              <button
                type="button"
                onClick={handleReportAnyway}
                className="flex-1 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
              >
                Report Anyway
              </button>
            </div>
          </section>
        )}

        {step === STEPS.CONFIRMATION && (
          <section aria-labelledby="confirmation-heading" className="mt-6">
            <h1
              id="confirmation-heading"
              className="text-lg font-semibold text-neutral-900 sm:text-xl"
            >
              Review your complaint
            </h1>

            <div className="mt-4 rounded-md border border-neutral-200 bg-white p-4">
              <div className="flex items-start gap-2">
                <span
                  className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${PRIORITY_STYLES[assessedPriority]}`}
                  role="img"
                  aria-label={`Priority: ${assessedPriority}`}
                />
                <p className="text-sm text-neutral-800">{description}</p>
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-neutral-500">Category</dt>
                  <dd className="text-sm font-medium text-neutral-900">
                    {assessedCategory || CATEGORIES[0]}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-neutral-500">Location</dt>
                  <dd className="text-sm font-medium text-neutral-900">
                    {selectedLocation}
                  </dd>
                </div>
              </dl>

              {mediaPreview && (
                <img
                  src={mediaPreview}
                  alt="Uploaded complaint media"
                  className="mt-4 h-40 w-full rounded-md object-cover"
                />
              )}
              {mediaFile && !mediaPreview && (
                <p className="mt-4 text-xs text-neutral-500">
                  Attached file: {mediaFile.name}
                </p>
              )}
            </div>

            {submitError && (
              <p className="mt-3 text-xs font-medium text-red-600" role="alert">
                {submitError}
              </p>
            )}

            <button
              type="button"
              onClick={handleSubmitComplaint}
              disabled={isSubmitting}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Submitting Complaint...</span>
                </>
              ) : (
                "Submit Complaint"
              )}
            </button>
          </section>
        )}

        {step === STEPS.SUCCESS && (
          <section
            aria-live="polite"
            className="mt-16 flex flex-col items-center text-center"
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-white"
              aria-hidden="true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <p className="mt-4 text-base font-semibold text-neutral-900">
              Complaint submitted successfully.
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Your complaint has been recorded and will be reviewed by the
              concerned authority.
            </p>
            <Link
              href="/"
              className="mt-6 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            >
              Return to Home
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}

function StepIndicator({ currentStep, similarFound }) {
  const baseSteps = [
    { key: STEPS.ISSUE, label: "Issue" },
    { key: STEPS.LOCATION, label: "Location" },
    { key: STEPS.REVIEW, label: "AI Review" },
    { key: STEPS.SIMILAR, label: "Similar Issues" },
    { key: STEPS.CONFIRMATION, label: "Confirmation" },
  ];

  const visibleSteps = similarFound
    ? baseSteps
    : baseSteps.filter((s) => s.key !== STEPS.SIMILAR);

  const currentIndex = visibleSteps.findIndex((s) => s.key === currentStep);

  return (
    <ol className="flex items-center gap-2 text-xs text-neutral-400">
      {visibleSteps.map((s, index) => {
        const isActive = index === currentIndex;
        const isComplete = index < currentIndex;
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-medium ${
                isActive
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : isComplete
                    ? "border-neutral-900 bg-white text-neutral-900"
                    : "border-neutral-300 bg-white text-neutral-400"
              }`}
            >
              {index + 1}
            </span>
            <span className={isActive ? "font-medium text-neutral-900" : ""}>
              {s.label}
            </span>
            {index < visibleSteps.length - 1 && (
              <span
                className="mx-1 h-px w-4 bg-neutral-300"
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}