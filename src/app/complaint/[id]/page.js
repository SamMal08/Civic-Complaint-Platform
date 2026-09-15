"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { complaints as fallbackComplaints } from "@/data/complaints";
import { getCitizenId } from "@/lib/citizen";
import {
  supabase,
  isSupabaseConfigured,
  getCitizenSupabase,
  mapComplaintFromDb,
} from "@/lib/supabase";

const PRIORITY_STYLES = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

export default function ComplaintDetailsPage({ params }) {
  const [complaintId, setComplaintId] = useState(null);
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);

  // Feedback form state
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

  useEffect(() => {
    let isMounted = true;

    Promise.resolve(params).then(async (resolved) => {
      if (!isMounted) return;
      const id = resolved.id;
      setComplaintId(id);

      if (!isSupabaseConfigured || !supabase) {
        const found = fallbackComplaints.find((c) => String(c.id) === String(id));
        if (isMounted) {
          setComplaint(found || null);
          setLoading(false);
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from("complaints")
          .select("*")
          .eq("id", id)
          .single();

        if (error || !data) {
          console.error("Complaint not found in Supabase:", error);
          const found = fallbackComplaints.find((c) => String(c.id) === String(id));
          if (isMounted) setComplaint(found || null);
        } else if (isMounted) {
          const mapped = mapComplaintFromDb(data);
          setComplaint(mapped);
          if (mapped.feedbackRating || mapped.feedbackComment) {
            setFeedbackSubmitted(true);
            setRating(mapped.feedbackRating || 5);
            setFeedbackComment(mapped.feedbackComment || "");
          }
        }
      } catch (err) {
        console.error("Error loading complaint details:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [params]);

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!complaintId) return;

    setSubmittingFeedback(true);
    setFeedbackError("");

    const citizenId = getCitizenId();
    const client = getCitizenSupabase(citizenId) || supabase;

    if (isSupabaseConfigured && client) {
      try {
        const { error } = await client
          .from("complaints")
          .update({
            feedback_rating: rating,
            feedback_comment: feedbackComment.trim(),
            feedback_submitted_at: new Date().toISOString(),
          })
          .eq("id", complaintId);

        if (error) {
          console.error("Error submitting feedback to Supabase:", error);
          setFeedbackError("Failed to submit feedback. Please try again.");
          setSubmittingFeedback(false);
          return;
        }
      } catch (err) {
        console.error("Feedback request failed:", err);
        setFeedbackError("Network error while submitting feedback.");
        setSubmittingFeedback(false);
        return;
      }
    }

    setFeedbackSubmitted(true);
    setSubmittingFeedback(false);
    setComplaint((prev) =>
      prev
        ? {
            ...prev,
            feedbackRating: rating,
            feedbackComment: feedbackComment.trim(),
          }
        : prev
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex h-16 max-w-2xl items-center px-4 sm:px-6">
            <Link
              href="/"
              className="text-sm font-medium text-neutral-600 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded-sm"
            >
              ← Back to Darpan
            </Link>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-16 text-center sm:px-6">
          <p className="text-sm font-medium text-neutral-700">
            Complaint not found
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            The complaint you&apos;re looking for doesn&apos;t exist or may have been removed.
          </p>
          <Link
            href="/"
            className="mt-6 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            Return to Home
          </Link>
        </main>
      </div>
    );
  }

  const priorityDotClass = PRIORITY_STYLES[complaint.priority] || PRIORITY_STYLES.low;
  const isResolved = complaint.status === "Resolved";

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-2xl items-center px-4 sm:px-6">
          <Link
            href="/"
            className="text-sm font-medium text-neutral-600 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded-sm"
          >
            ← Back to Darpan
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <div className="overflow-hidden rounded-md border border-neutral-200 bg-white">
          {complaint.image ? (
            <div className="h-56 w-full overflow-hidden bg-neutral-100 sm:h-64">
              <img
                src={complaint.image}
                alt={`Photo related to ${complaint.title}`}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-40 w-full items-center justify-center bg-neutral-50 px-4 text-center">
              <p className="text-sm text-neutral-500">No media provided</p>
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
                <dt className="text-xs text-neutral-500">Status</dt>
                <dd className="mt-0.5 inline-flex items-center rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-medium text-neutral-700">
                  {complaint.status}
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
                <dt className="text-xs text-neutral-500">Time</dt>
                <dd className="text-sm font-medium text-neutral-900">
                  {complaint.time}
                </dd>
              </div>
            </dl>

            {/* Resolution Information if available */}
            {(complaint.actionTaken || complaint.resolutionDetails || complaint.resolutionDate) && (
              <div className="mt-6 rounded-md border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Government Action & Resolution
                </p>
                {complaint.actionTaken && (
                  <div className="mt-2">
                    <p className="text-xs text-neutral-500">Action Taken</p>
                    <p className="text-sm text-neutral-800">{complaint.actionTaken}</p>
                  </div>
                )}
                {complaint.resolutionDetails && (
                  <div className="mt-2">
                    <p className="text-xs text-neutral-500">Resolution Details</p>
                    <p className="text-sm text-neutral-800">{complaint.resolutionDetails}</p>
                  </div>
                )}
                {complaint.resolutionDate && (
                  <div className="mt-2">
                    <p className="text-xs text-neutral-500">Resolved Date</p>
                    <p className="text-sm text-neutral-800">{complaint.resolutionDate}</p>
                  </div>
                )}
              </div>
            )}

            {/* Citizen Feedback Section when complaint is Resolved */}
            {isResolved && (
              <div className="mt-6 rounded-md border border-neutral-200 bg-white p-4">
                <p className="text-sm font-semibold text-neutral-900">
                  Citizen Feedback
                </p>

                {feedbackSubmitted ? (
                  <div className="mt-3 rounded-md bg-neutral-50 p-3">
                    <p className="text-xs font-medium text-green-700">
                      ✓ Feedback recorded. Thank you for helping improve civic services!
                    </p>
                    <p className="mt-1 text-sm text-neutral-800">
                      Rating: {"★".repeat(rating)}{"☆".repeat(5 - rating)} ({rating}/5)
                    </p>
                    {feedbackComment && (
                      <p className="mt-1 text-xs text-neutral-600">
                        &ldquo;{feedbackComment}&rdquo;
                      </p>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleFeedbackSubmit} className="mt-3">
                    <p className="text-xs text-neutral-500">
                      This issue has been marked resolved. How satisfied are you with the resolution?
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className={`flex h-8 w-8 items-center justify-center rounded border text-sm font-medium transition-colors ${
                            rating >= star
                              ? "border-neutral-900 bg-neutral-900 text-white"
                              : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                          }`}
                          aria-label={`${star} star${star > 1 ? "s" : ""}`}
                        >
                          ★
                        </button>
                      ))}
                      <span className="ml-2 text-xs font-medium text-neutral-600">
                        {rating} / 5
                      </span>
                    </div>

                    <div className="mt-3">
                      <label
                        htmlFor="feedback-comment"
                        className="block text-xs font-medium text-neutral-600"
                      >
                        Comments (optional)
                      </label>
                      <textarea
                        id="feedback-comment"
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        rows={2}
                        placeholder="Add any feedback regarding the resolution..."
                        className="mt-1 w-full resize-none rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
                      />
                    </div>

                    {feedbackError && (
                      <p className="mt-2 text-xs text-red-600" role="alert">
                        {feedbackError}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={submittingFeedback}
                      className="mt-3 inline-flex items-center justify-center rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 disabled:opacity-50"
                    >
                      {submittingFeedback ? "Submitting..." : "Submit Feedback"}
                    </button>
                  </form>
                )}
              </div>
            )}

            <div className="mt-5 flex items-center gap-4 border-t border-neutral-200 pt-4 text-sm text-neutral-700">
              <span>Support ({complaint.supportCount})</span>
              <span className="text-neutral-300">|</span>
              <span>Don&apos;t Support ({complaint.dontSupportCount})</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}