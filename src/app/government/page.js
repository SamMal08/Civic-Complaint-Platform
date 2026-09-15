"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { complaints } from "@/data/complaints";

const PRIORITY_STYLES = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

const STATUS_OPTIONS = ["All", ...Array.from(new Set(complaints.map((c) => c.status)))];
const CATEGORY_OPTIONS = ["All", ...Array.from(new Set(complaints.map((c) => c.category)))];
const PRIORITY_OPTIONS = ["All", "High", "Medium", "Low"];

export default function GovernmentDashboardPage() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const stats = useMemo(() => {
    return {
      total: complaints.length,
      underReview: complaints.filter((c) => c.status === "Under Review").length,
      inProgress: complaints.filter((c) => c.status === "Action in Progress").length,
      resolved: complaints.filter((c) => c.status === "Resolved").length,
    };
  }, []);

  const filteredComplaints = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return complaints.filter((complaint) => {
      const matchesSearch =
        query.length === 0 ||
        complaint.title.toLowerCase().includes(query) ||
        complaint.category.toLowerCase().includes(query) ||
        complaint.location.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "All" || complaint.status === statusFilter;
      const matchesCategory = categoryFilter === "All" || complaint.category === categoryFilter;
      const matchesPriority =
        priorityFilter === "All" ||
        complaint.priority === priorityFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
    });
  }, [searchQuery, statusFilter, categoryFilter, priorityFilter]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-xl font-semibold text-neutral-900 sm:text-2xl">
            Government Dashboard
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Monitor and manage citizen complaints submitted through Darpan.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Summary stat cards */}
        <section
          aria-label="Complaint summary"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          <StatCard label="Total Complaints" value={stats.total} />
          <StatCard label="Under Review" value={stats.underReview} />
          <StatCard label="Action in Progress" value={stats.inProgress} />
          <StatCard label="Resolved" value={stats.resolved} />
        </section>

        {/* Search and filters */}
        <section
          aria-label="Search and filters"
          className="mt-6 rounded-md border border-neutral-200 bg-white p-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <label htmlFor="complaint-search" className="sr-only">
                Search complaints
              </label>
              <input
                id="complaint-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, category, or location"
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
              />
            </div>

            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTIONS}
            />
            <FilterSelect
              label="Category"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={CATEGORY_OPTIONS}
            />
            <FilterSelect
              label="Priority"
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={PRIORITY_OPTIONS}
            />
          </div>
        </section>

        {/* Complaint monitoring section */}
        <section aria-label="Complaint monitoring" className="mt-6">
          {filteredComplaints.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-md border border-neutral-200 bg-white px-4 py-16 text-center">
              <p className="text-sm font-medium text-neutral-700">
                No complaints match the current filters.
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                Try adjusting your search or filter selections.
              </p>
            </div>
          ) : (
            <>
              {/* Table view for larger screens */}
              <div className="hidden overflow-hidden rounded-md border border-neutral-200 bg-white md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-neutral-200 bg-neutral-50">
                    <tr>
                      <th className="px-4 py-3 font-medium text-neutral-600">Title</th>
                      <th className="px-4 py-3 font-medium text-neutral-600">Category</th>
                      <th className="px-4 py-3 font-medium text-neutral-600">Location</th>
                      <th className="px-4 py-3 font-medium text-neutral-600">Priority</th>
                      <th className="px-4 py-3 font-medium text-neutral-600">Status</th>
                      <th className="px-4 py-3 font-medium text-neutral-600">Support</th>
                      <th className="px-4 py-3 font-medium text-neutral-600">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComplaints.map((complaint) => (
                      <tr
                        key={complaint.id}
                        onClick={() => router.push(`/government/complaint/${complaint.id}`)}
                        className="cursor-pointer border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50"
                      >
                        <td className="px-4 py-3 font-medium text-neutral-900">
                          {complaint.title}
                        </td>
                        <td className="px-4 py-3 text-neutral-600">{complaint.category}</td>
                        <td className="px-4 py-3 text-neutral-600">{complaint.location}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                PRIORITY_STYLES[complaint.priority] || PRIORITY_STYLES.low
                              }`}
                              role="img"
                              aria-label={`Priority: ${complaint.priority}`}
                            />
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-medium text-neutral-700">
                            {complaint.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-600">{complaint.supportCount}</td>
                        <td className="px-4 py-3 text-neutral-500">{complaint.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Card view for small screens */}
              <div className="flex flex-col gap-3 md:hidden">
                {filteredComplaints.map((complaint) => (
                  <button
                    key={complaint.id}
                    type="button"
                    onClick={() => router.push(`/government/complaint/${complaint.id}`)}
                    className="flex flex-col items-start rounded-md border border-neutral-200 bg-white p-4 text-left hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
                  >
                    <div className="flex w-full items-start gap-2">
                      <span
                        className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                          PRIORITY_STYLES[complaint.priority] || PRIORITY_STYLES.low
                        }`}
                        role="img"
                        aria-label={`Priority: ${complaint.priority}`}
                      />
                      <p className="text-sm font-medium text-neutral-900">
                        {complaint.title}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">
                      {complaint.category} · {complaint.location}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-medium text-neutral-700">
                        {complaint.status}
                      </span>
                      <span className="text-xs text-neutral-500">
                        Support: {complaint.supportCount}
                      </span>
                      <span className="text-xs text-neutral-400">{complaint.time}</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  const selectId = `filter-${label.toLowerCase()}`;
  return (
    <div>
      <label htmlFor={selectId} className="sr-only">
        {label}
      </label>
      <select
        id={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "All" ? `${label}: All` : option}
          </option>
        ))}
      </select>
    </div>
  );
}