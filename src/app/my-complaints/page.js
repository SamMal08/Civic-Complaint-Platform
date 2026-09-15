"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ComplaintCard from "@/components/ComplaintCard";
import { getCitizenId } from "@/lib/citizen";
import { supabase, isSupabaseConfigured, mapComplaintFromDb } from "@/lib/supabase";

export default function MyComplaintsPage() {
  const router = useRouter();
  const [myComplaints, setMyComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMyComplaints() {
      const citizenId = getCitizenId();

      if (!isSupabaseConfigured || !supabase) {
        setMyComplaints([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("complaints")
          .select("*")
          .eq("citizen_id", citizenId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching citizen complaints:", error);
          setMyComplaints([]);
        } else if (data) {
          setMyComplaints(data.map(mapComplaintFromDb));
        }
      } catch (err) {
        console.error("Failed to fetch my complaints:", err);
        setMyComplaints([]);
      } finally {
        setLoading(false);
      }
    }

    loadMyComplaints();
  }, []);

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
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <div
              className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900"
              aria-hidden="true"
            />
          </div>
        ) : myComplaints.length === 0 ? (
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