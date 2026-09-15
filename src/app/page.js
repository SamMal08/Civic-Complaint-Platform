"use client";

import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import LocationSelector from "@/components/LocationSelector";
import FeedTabs from "@/components/FeedTabs";
import ComplaintCard from "@/components/ComplaintCard";
import { complaints } from "@/data/complaints";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navbar />

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4">
          <LocationSelector />
        </div>

        <div className="mb-6">
          <FeedTabs />
        </div>

        <section
          aria-label="Civic feed"
          className="flex min-h-[240px] flex-col items-center justify-center rounded-md border border-neutral-200 bg-white px-4 py-16 text-center"
        >
          <p className="text-sm font-medium text-neutral-700">
            Civic issues near you
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Important local issues will appear here.
          </p>
        </section>

        <section
          aria-label="Complaint feed"
          className="mt-6 flex flex-col items-center gap-4 sm:items-stretch"
        >
          {complaints.map((complaint) => (
            <ComplaintCard
              key={complaint.id}
              {...complaint}
              onViewDetails={(id) => router.push(`/complaint/${id}`)}
            />
          ))}
        </section>
      </main>
    </div>
  );
}