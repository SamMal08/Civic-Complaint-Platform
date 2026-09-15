"use client";

import { useRouter } from "next/navigation";
import ComplaintCard from "@/components/ComplaintCard";
import { complaints } from "@/data/complaints";

// PROTOTYPE ONLY: without authentication, we simulate "my complaints" by
// selecting a fixed subset of complaint IDs from the shared mock data.
// Replace this with a real user-scoped query once auth/backend exists.
const MY_COMPLAINT_IDS = [1, 2];

export default function MyComplaintsPage() {
  const router = useRouter();

  const myComplaints = complaints.filter((c) => MY_COMPLAINT_IDS.includes(c.id));

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-lg font-semibold text-neutral-900">
            My Complaints
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {myComplaints.length === 0 ? (
          <section
            aria-label="No complaints"
            className="flex min-h-[240px] flex-col items-center justify-center rounded-md border border-neutral-200 bg-white px-4 py-16 text-center"
          >
            <p className="text-sm font-medium text-neutral-700">
              You haven&apos;t submitted any complaints yet.
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Complaints you raise will appear here.
            </p>
          </section>
        ) : (
          <section
            aria-label="My complaint list"
            className="flex flex-col items-center gap-4 sm:items-stretch"
          >
            {myComplaints.map((complaint) => (
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