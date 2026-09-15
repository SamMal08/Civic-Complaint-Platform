"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ComplaintCard from "@/components/ComplaintCard";
import { complaints as fallbackComplaints } from "@/data/complaints";
import { supabase, isSupabaseConfigured, mapComplaintFromDb } from "@/lib/supabase";

// PROTOTYPE ONLY: without authentication, we simulate "followed complaints"
// by selecting a fixed subset of complaint IDs.
const FOLLOWED_COMPLAINT_IDS = [1, 3];

export default function FollowingPage() {
  const router = useRouter();
  const [followedComplaints, setFollowedComplaints] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFollowed() {
      if (!isSupabaseConfigured || !supabase) {
        setFollowedComplaints(
          fallbackComplaints.filter((c) => FOLLOWED_COMPLAINT_IDS.includes(c.id))
        );
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("complaints")
          .select("*")
          .in("id", FOLLOWED_COMPLAINT_IDS);

        if (error || !data || data.length === 0) {
          setFollowedComplaints(
            fallbackComplaints.filter((c) => FOLLOWED_COMPLAINT_IDS.includes(c.id))
          );
        } else {
          setFollowedComplaints(data.map(mapComplaintFromDb));
        }
      } catch (err) {
        setFollowedComplaints(
          fallbackComplaints.filter((c) => FOLLOWED_COMPLAINT_IDS.includes(c.id))
        );
      } finally {
        setLoading(false);
      }
    }

    loadFollowed();
  }, []);

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
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <div
              className="h-7 w-7 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900"
              aria-hidden="true"
            />
          </div>
        ) : followedComplaints.length === 0 ? (
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