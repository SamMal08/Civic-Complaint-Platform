"use client";

import { useRouter } from "next/navigation";
import ComplaintCard from "@/components/ComplaintCard";
import { complaints } from "@/data/complaints";

// PROTOTYPE ONLY: without authentication, we simulate "followed complaints"
// by selecting a fixed subset of complaint IDs from the shared mock data.
// Replace this with a real user-scoped "following" list once auth/backend exists.
const FOLLOWED_COMPLAINT_IDS = [1, 3];

export default function FollowingPage() {
  const router = useRouter();

  const followedComplaints = complaints.filter((c) =>
    FOLLOWED_COMPLAINT_IDS.includes(c.id)
  );

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-lg font-semibold text-neutral-900">
            Following
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {followedComplaints.length === 0 ? (
          <EmptyFollowingState />
        ) : (
          <section
            aria-label="Followed complaints"
            className="flex flex-col items-center gap-4 sm:items-stretch"
          >
            {followedComplaints.map((complaint) => (
              <ComplaintCard
                key={complaint.id}
                {...complaint}
                onViewDetails={(id) => router.push(`/complaint/${id}`)}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

function EmptyFollowingState() {
  return (
    <section
      aria-label="No followed complaints"
      className="flex min-h-[240px] flex-col items-center justify-center rounded-md border border-neutral-200 bg-white px-4 py-16 text-center"
    >
      <p className="text-sm font-medium text-neutral-700">
        You&apos;re not following any complaints yet.
      </p>
      <p className="mt-1 text-sm text-neutral-500">
        Complaints you follow will appear here.
      </p>
    </section>
  );
}