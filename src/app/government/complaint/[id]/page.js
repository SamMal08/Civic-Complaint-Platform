"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { complaints } from "@/data/complaints";

const STATUS_OPTIONS = ["Submitted", "Under Review", "Action in Progress", "Resolved"];

const PRIORITY_STYLES = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

export default function GovernmentComplaintPage({ params }) {
  const router = useRouter();

  const [complaintId, setComplaintId] = useState(null);
  const [paramsLoaded, setParamsLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    Promise.resolve(params).then((resolved) => {
      if (isMounted) {
        setComplaintId(Number(resolved.id));
        setParamsLoaded(true);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [params]);

  const complaint = complaintId !== null
    ? complaints.find((c) => c.id === complaintId)
    : null;

  const [status, setStatus] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [resolutionDetails, setResolutionDetails] = useState("");
  const [expectedResolutionDate, setExpectedResolutionDate] = useState("");
  const [resolutionDate, setResolutionDate] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentStatus, setCurrentStatus] = useState("");

  useEffect(() => {
    if (complaint) {
      setStatus(complaint.status);
      setCurrentStatus(complaint.status);
    }
  }, [complaint]);

  const handleUpdate = () => {
    setCurrentStatus(status);
    setShowSuccess(true);
  };

  if (!paramsLoaded) {
    return null;
  }

  if (!complaint) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex h-16 max-w-3xl items-center px-4 sm:px-6">
            <Link
              href="/government"
              className="text-sm font-medium text-neutral-600 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded-sm"
            >
              ← Back to Government Dashboard
            </Link>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 py-16 text-center sm:px-6">
          <p className="text-sm font-medium text-neutral-700">
            Complaint not found
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            The complaint you&apos;re looking for doesn&apos;t exist or may have been removed.
          </p>
          <Link
            href="/government"
            className="mt-6 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            Return to Dashboard
          </Link>
        </main>
      </div>
    );
  }

  const priorityDotClass = PRIORITY_STYLES[complaint.priority] || PRIORITY_STYLES.low;
  const currentStatusIndex = STATUS_OPTIONS.indexOf(currentStatus);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl flex-wrap items-center justify-between gap-2 px-4 sm:px-6">
          <Link
            href="/government"
            className="text-sm font-medium text-neutral-600 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded-sm"
          >
            ← Back to Government Dashboard
          </Link>
          <Link
            href={`/complaint/${complaint.id}`}
            className="text-sm font-medium text-neutral-600 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded-sm"
          >
            View citizen page →
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        {/* Complaint information */}
        <section className="overflow-hidden rounded-md border border-neutral-200 bg-white">
          {complaint.image ? (
            <div className="h-56 w-full overflow-hidden bg-neutral-100 sm:h-64">
              <img
                src={complaint.image}
                alt={`Photo related to ${complaint.title}`}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-32 w-full items-center justify-center bg-neutral-50 px-4 text-center">
              <p className="text-sm text-neutral-500">No media attached</p>
            </div>
          )}

          <div className="p-4 sm:p-6">
            <div className="flex items-start gap-2">
              <span
                className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${priorityDotClass}`}
                role="img"
                aria-label={`Priority: ${complaint.priority}`}
              />
              <h1 className="text-lg font-semibold leading-snug text-neutral-900 sm:text-xl">
                {complaint.title}
              </h1>
            </div>

            {complaint.description && (
              <p className="mt-3 text-sm leading-relaxed text-neutral-700">
                {complaint.description}
              </p>
            )}

            <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-neutral-500">Category</dt>
                <dd className="text-sm font-medium text-neutral-900">
                  {complaint.category}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Current Status</dt>
                <dd className="mt-0.5 inline-flex items-center rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-medium text-neutral-700">
                  {currentStatus}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Location</dt>
                <dd className="text-sm font-medium text-neutral-900">
                  {complaint.location}
                  {complaint.distance ? ` · ${complaint.distance} away` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Submitted</dt>
                <dd className="text-sm font-medium text-neutral-900">
                  {complaint.time}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Support Count</dt>
                <dd className="text-sm font-medium text-neutral-900">
                  {complaint.supportCount}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Workflow progress */}
        <section
          aria-label="Complaint workflow status"
          className="mt-6 rounded-md border border-neutral-200 bg-white p-4 sm:p-6"
        >
          <p className="text-sm font-semibold text-neutral-900">Complaint Workflow</p>
          <ol className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
            {STATUS_OPTIONS.map((option, index) => {
              const isComplete = index < currentStatusIndex;
              const isActive = index === currentStatusIndex;
              return (
                <li key={option} className="flex items-center gap-2 sm:flex-1">
                  <span
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-[11px] font-medium ${
                      isActive
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : isComplete
                        ? "border-neutral-900 bg-white text-neutral-900"
                        : "border-neutral-300 bg-white text-neutral-400"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={`text-sm ${
                      isActive ? "font-medium text-neutral-900" : "text-neutral-500"
                    }`}
                  >
                    {option}
                  </span>
                  {index < STATUS_OPTIONS.length - 1 && (
                    <span
                      className="hidden h-px flex-1 bg-neutral-200 sm:block"
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        {/* Government Action panel */}
        <section
          aria-labelledby="gov-action-heading"
          className="mt-6 rounded-md border border-neutral-200 bg-white p-4 sm:p-6"
        >
          <h2 id="gov-action-heading" className="text-sm font-semibold text-neutral-900">
            Government Action
          </h2>

          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label
                htmlFor="status-select"
                className="mb-1 block text-xs font-medium text-neutral-600"
              >
                Status
              </label>
              <select
                id="status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="action-taken"
                className="mb-1 block text-xs font-medium text-neutral-600"
              >
                Action Taken
              </label>
              <textarea
                id="action-taken"
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                rows={3}
                placeholder="Describe the action taken to address this complaint..."
                className="w-full resize-none rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
              />
            </div>

            <div>
              <label
                htmlFor="resolution-details"
                className="mb-1 block text-xs font-medium text-neutral-600"
              >
                Resolution Details
              </label>
              <textarea
                id="resolution-details"
                value={resolutionDetails}
                onChange={(e) => setResolutionDetails(e.target.value)}
                rows={3}
                placeholder="Describe how the complaint was resolved..."
                className="w-full resize-none rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="expected-resolution-date"
                  className="mb-1 block text-xs font-medium text-neutral-600"
                >
                  Expected Resolution Date
                </label>
                <input
                  id="expected-resolution-date"
                  type="date"
                  value={expectedResolutionDate}
                  onChange={(e) => setExpectedResolutionDate(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
                />
              </div>

              <div>
                <label
                  htmlFor="resolution-date"
                  className="mb-1 block text-xs font-medium text-neutral-600"
                >
                  Resolution Date
                </label>
                <input
                  id="resolution-date"
                  type="date"
                  value={resolutionDate}
                  onChange={(e) => setResolutionDate(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
                />
              </div>
            </div>

            {showSuccess && (
              <p
                role="status"
                className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-800"
              >
                Complaint updated successfully.
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleUpdate}
                className="flex-1 rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 sm:flex-none"
              >
                Update Complaint
              </button>
              <button
                type="button"
                onClick={() => router.push("/government")}
                className="flex-1 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 sm:flex-none"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}