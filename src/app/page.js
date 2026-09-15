"use client";

import Navbar from "@/components/Navbar";
import LocationSelector from "@/components/LocationSelector";
import FeedTabs from "@/components/FeedTabs";
import ComplaintCard from "@/components/ComplaintCard";

const complaints = [
  {
    id: 1,
    title: "Large pothole causing daily traffic slowdowns",
    description:
      "A deep pothole has formed near the main intersection, causing vehicles to swerve and slowing traffic during peak hours.",
    image:
      "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?w=800&q=80",
    category: "Roads",
    location: "Sector 12, Dwarka",
    distance: "0.8 km",
    time: "2 hours ago",
    supportCount: 128,
    dontSupportCount: 4,
    status: "Under Review",
    priority: "high",
  },
  {
    id: 2,
    title: "Streetlight not working for over two weeks",
    description:
      "The streetlight outside the community park has been non-functional, making the area unsafe after sunset.",
    image: null,
    category: "Streetlight",
    location: "Palam Colony, Dwarka",
    distance: "1.5 km",
    time: "1 day ago",
    supportCount: 56,
    dontSupportCount: 2,
    status: "Submitted",
    priority: "medium",
  },
  {
    id: 3,
    title: "Garbage collection delayed in residential block",
    description:
      "Waste has not been collected for several days, leading to overflowing bins and unpleasant odor in the neighborhood.",
    image:
      "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&q=80",
    category: "Waste",
    location: "Sector 6, Dwarka",
    distance: "2.1 km",
    time: "3 days ago",
    supportCount: 87,
    dontSupportCount: 6,
    status: "Action in Progress",
    priority: "low",
  },
];

export default function Home() {
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
              onViewDetails={(id) => console.log("View complaint:", id)}
            />
          ))}
        </section>
      </main>
    </div>
  );
}