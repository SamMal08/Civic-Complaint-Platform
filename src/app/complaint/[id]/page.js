import Link from "next/link";
import { complaints } from "@/data/complaints";

const PRIORITY_STYLES = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

export default async function ComplaintDetailsPage({ params }) {
  const { id } = await params;
  const complaintId = Number(id);
  const complaint = complaints.find((c) => c.id === complaintId);

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