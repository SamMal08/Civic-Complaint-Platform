"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    message: "Your complaint has been submitted.",
    time: "10 min ago",
    read: false,
  },
  {
    id: 2,
    message: "Your complaint is under review.",
    time: "2 hours ago",
    read: false,
  },
  {
    id: 3,
    message: "Action has started on a complaint you are following.",
    time: "Yesterday",
    read: false,
  },
  {
    id: 4,
    message: "A complaint you follow has been resolved.",
    time: "2 days ago",
    read: true,
  },
  {
    id: 5,
    message: "Your complaint requires your attention.",
    time: "3 days ago",
    read: true,
  },
];

export default function Navbar() {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const notifRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    function handleEscape(event) {
      if (event.key === "Escape") {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Nearby", href: "/nearby" },
    { label: "My Complaints", href: "/my-complaints" },
    { label: "Following", href: "/following" },
  ];

  return (
    <nav
      className="w-full border-b border-neutral-200 bg-white"
      aria-label="Primary"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo */}
        <div className="flex items-center">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded-sm"
          >
            Darpan
          </Link>
        </div>

        {/* Center: Desktop Nav Links */}
        <div className="hidden md:flex md:items-center md:gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Raise Complaint - Desktop */}
          <a
            href="/raise-complaint"
            className="hidden md:inline-flex items-center gap-1.5 rounded-md border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
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
              <path d="M12 5v14M5 12h14" />
            </svg>
            Raise Complaint
          </a>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen((prev) => !prev)}
              aria-label={`Notifications${
                unreadCount > 0 ? `, ${unreadCount} unread` : ""
              }`}
              aria-expanded={notifOpen}
              aria-haspopup="true"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span
                  className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"
                  aria-hidden="true"
                />
              )}
            </button>

            {notifOpen && (
              <div
                role="menu"
                aria-label="Notifications"
                className="absolute right-0 z-10 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-md border border-neutral-200 bg-white shadow-md"
              >
                <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
                  <p className="text-sm font-semibold text-neutral-900">
                    Notifications
                  </p>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className="text-xs font-medium text-neutral-600 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 rounded-sm"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <ul className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <li
                      key={notification.id}
                      role="menuitem"
                      className="flex items-start gap-2 border-b border-neutral-100 px-4 py-3 last:border-b-0 hover:bg-neutral-50"
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                          notification.read
                            ? "bg-transparent"
                            : "bg-neutral-900"
                        }`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm ${
                            notification.read
                              ? "text-neutral-500"
                              : "font-medium text-neutral-900"
                          }`}
                        >
                          {notification.message}
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-400">
                          {notification.time}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              aria-label="Profile"
              aria-expanded={profileOpen}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          </div>

          {/* Login - Desktop */}
          <a
            href="/login"
            className="hidden md:inline-flex items-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            Login
          </a>
        </div>
      </div>
    </nav>
  );
}