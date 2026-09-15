"use client";

import { useState } from "react";

const PRIORITY_STYLES = {
  high: "bg-red-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

const DEFAULT_CATEGORY_ICONS = {
  Roads: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M4 20 10 4h4l6 16" />
      <path d="M12 4v16" strokeDasharray="2 2" />
    </svg>
  ),
  Streetlight: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12 2v4" />
      <circle cx="12" cy="9" r="3" />
      <path d="M12 12v10" />
      <path d="M8 22h8" />
    </svg>
  ),
  Waste: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  ),
  Water: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12 2s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z" />
    </svg>
  ),
  Traffic: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect x="8" y="2" width="8" height="20" rx="2" />
      <circle cx="12" cy="7" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="17" r="1" />
    </svg>
  ),
  Environment: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12 22c4-2 7-6 7-11a7 7 0 0 0-14 0c0 5 3 9 7 11Z" />
      <path d="M12 12v6" />
    </svg>
  ),
};

const GENERIC_CATEGORY_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
  </svg>
);

export default function ComplaintCard({
  id,
  title,
  description,
  image,
  category,
  categoryIcon,
  location,
  distance,
  time,
  supportCount = 0,
  dontSupportCount = 0,
  status,
  priority = "low",
  onViewDetails,
}) {
  const [support, setSupport] = useState(supportCount);
  const [dontSupport, setDontSupport] = useState(dontSupportCount);
  const [userChoice, setUserChoice] = useState(null); // "support" | "dontSupport" | null
  const [isFollowing, setIsFollowing] = useState(false);

  const handleSupportClick = () => {
    if (userChoice === "support") {
      setSupport((prev) => prev - 1);
      setUserChoice(null);
    } else if (userChoice === "dontSupport") {
      setDontSupport((prev) => prev - 1);
      setSupport((prev) => prev + 1);
      setUserChoice("support");
    } else {
      setSupport((prev) => prev + 1);
      setUserChoice("support");
    }
  };

  const handleDontSupportClick = () => {
    if (userChoice === "dontSupport") {
      setDontSupport((prev) => prev - 1);
      setUserChoice(null);
    } else if (userChoice === "support") {
      setSupport((prev) => prev - 1);
      setDontSupport((prev) => prev + 1);
      setUserChoice("dontSupport");
    } else {
      setDontSupport((prev) => prev + 1);
      setUserChoice("dontSupport");
    }
  };

  const handleFollowClick = () => {
    setIsFollowing((prev) => !prev);
  };

  const handleViewDetailsClick = () => {
    if (onViewDetails) {
      onViewDetails(id);
    }
  };

  const priorityDotClass = PRIORITY_STYLES[priority] || PRIORITY_STYLES.low;
  const resolvedCategoryIcon =
    categoryIcon || DEFAULT_CATEGORY_ICONS[category] || GENERIC_CATEGORY_ICON;

  return (
    <article className="w-full max-w-full overflow-hidden rounded-md border border-neutral-200 bg-white sm:max-w-md">
      {/* Visual area */}
      {image ? (
        <div className="h-48 w-full overflow-hidden bg-neutral-100 sm:h-52">
          <img
            src={image}
            alt={title ? `Photo related to ${title}` : "Complaint photo"}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-48 w-full flex-col items-center justify-center bg-neutral-50 px-4 text-center sm:h-52">
          <p className="line-clamp-3 text-sm font-medium text-neutral-700">
            {title || "Untitled complaint"}
          </p>
          {description && (
            <p className="mt-1 line-clamp-2 text-xs text-neutral-500">
              {description}
            </p>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Header: priority dot + title */}
        <div className="flex items-start gap-2">
          <span
            className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${priorityDotClass}`}
            role="img"
            aria-label={`Priority: ${priority}`}
          />
          <h3 className="text-sm font-semibold leading-snug text-neutral-900 sm:text-base">
            {title}
          </h3>
        </div>

        {/* Category */}
        {category && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-neutral-600">
            <span className="text-neutral-500">{resolvedCategoryIcon}</span>
            <span>{category}</span>
          </div>
        )}

        {/* Location + distance */}
        {location && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5 flex-shrink-0"
              aria-hidden="true"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="truncate">
              {location}
              {distance ? ` · ${distance} away` : ""}
            </span>
          </div>
        )}

        {/* Time */}
        {time && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5 flex-shrink-0"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
            <span>{time}</span>
          </div>
        )}

        {/* Status */}
        {status && (
          <div className="mt-3 inline-flex items-center rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs font-medium text-neutral-700">
            {status}
          </div>
        )}

        {/* Support / Don't Support */}
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handleSupportClick}
            aria-pressed={userChoice === "support"}
            aria-label={`Support this complaint. Current support count: ${support}`}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 ${
              userChoice === "support"
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path d="M7 10v11" />
              <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a2.55 2.55 0 0 1 3 3.88Z" />
            </svg>
            Support ({support})
          </button>

          <button
            type="button"
            onClick={handleDontSupportClick}
            aria-pressed={userChoice === "dontSupport"}
            aria-label={`Don't support this complaint. Current count: ${dontSupport}`}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 ${
              userChoice === "dontSupport"
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path d="M17 14V3" />
              <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a2.55 2.55 0 0 1-3-3.88Z" />
            </svg>
            Don&apos;t Support ({dontSupport})
          </button>
        </div>

        {/* Follow + View Details */}
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={handleFollowClick}
            aria-pressed={isFollowing}
            aria-label={isFollowing ? "Unfollow this complaint" : "Follow this complaint"}
            className={`flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 ${
              isFollowing
                ? "border-neutral-900 bg-neutral-100 text-neutral-900"
                : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              {isFollowing ? (
                <path d="M20 6 9 17l-5-5" />
              ) : (
                <path d="M12 5v14M5 12h14" />
              )}
            </svg>
            {isFollowing ? "Following" : "Follow"}
          </button>

          <button
            type="button"
            onClick={handleViewDetailsClick}
            className="ml-auto flex items-center gap-1 rounded-md px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            View Details
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}