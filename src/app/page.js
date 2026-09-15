"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import LocationSelector from "@/components/LocationSelector";
import FeedTabs from "@/components/FeedTabs";
import ComplaintCard from "@/components/ComplaintCard";
import { complaints as fallbackComplaints } from "@/data/complaints";
import { supabase, isSupabaseConfigured, mapComplaintFromDb } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const [complaintList, setComplaintList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadComplaints() {
      if (!isSupabaseConfigured || !supabase) {
        setComplaintList(fallbackComplaints);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("complaints")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching complaints from Supabase:", error);
          setComplaintList(fallbackComplaints);
        } else if (data && data.length > 0) {
          setComplaintList(data.map(mapComplaintFromDb));
        } else {
          setComplaintList(fallbackComplaints);
        }
      } catch (err) {
        console.error("Failed to load complaints:", err);
        setComplaintList(fallbackComplaints);
      } finally {
        setLoading(false);
      }
    }

    loadComplaints();
  }, []);

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
          {loading ? (
            <div className="flex min-h-[160px] items-center justify-center">
              <div
                className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900"
                aria-hidden="true"
              />
            </div>
          ) : complaintList.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-500">
              No complaints found.
            </p>
          ) : (
            complaintList.map((complaint) => (
              <ComplaintCard
                key={complaint.id}
                {...complaint}
                onViewDetails={(id) => router.push(`/complaint/${id}`)}
              />
            ))
          )}
        </section>
      </main>
    </div>
  );
}