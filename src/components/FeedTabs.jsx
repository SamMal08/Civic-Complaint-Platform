"use client";

import { useState } from "react";

const TABS = ["For You", "Nearby", "Trending", "Following"];

export default function FeedTabs({ defaultTab = "For You", onTabChange }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  return (
    <div className="w-full border-b border-neutral-200 bg-white">
      <div
        role="tablist"
        aria-label="Civic feed navigation"
        className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabClick(tab)}
              className={`relative flex-shrink-0 whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 ${
                isActive
                  ? "text-neutral-900"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {tab}
              <span
                className={`absolute inset-x-0 -bottom-px h-0.5 rounded-full ${
                  isActive ? "bg-neutral-900" : "bg-transparent"
                }`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}