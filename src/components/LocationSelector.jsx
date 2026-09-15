"use client";

import { useState, useRef, useEffect } from "react";

const LOCATIONS = ["Dwarka, Delhi", "Rohini, Delhi", "Janakpuri, Delhi", "Saket, Delhi"];

export default function LocationSelector({ defaultLocation = "Dwarka, Delhi" }) {
  const [selectedLocation, setSelectedLocation] = useState(defaultLocation);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleSelect = (location) => {
    setSelectedLocation(location);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Change location, currently ${selectedLocation}`}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 text-neutral-500"
          aria-hidden="true"
        >
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>{selectedLocation}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Select location"
          className="absolute left-0 z-10 mt-1 w-48 rounded-md border border-neutral-200 bg-white py-1 shadow-md"
        >
          {LOCATIONS.map((location) => {
            const isSelected = location === selectedLocation;
            return (
              <button
                key={location}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                onClick={() => handleSelect(location)}
                className={`flex w-full items-center px-3 py-2 text-left text-sm focus:outline-none focus-visible:bg-neutral-100 ${
                  isSelected
                    ? "font-medium text-neutral-900 bg-neutral-50"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {location}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}