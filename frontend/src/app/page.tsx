"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ActionButtons from "@/components/ActionButtons";
import UpcomingMeetings from "@/components/UpcomingMeetings";
import { api, User } from "@/lib/api";
import { showComingSoonToast } from "@/components/Toast";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [copiedPMI, setCopiedPMI] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try {
        const u = await api.getCurrentUser();
        const localName =
          typeof window !== "undefined"
            ? localStorage.getItem("meetroom_user_name")
            : null;
        if (localName) u.name = localName;
        setUser(u);
      } catch {}
    }
    loadUser();
  }, []);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  // Generate a stable Personal Meeting ID from user id
  const personalMeetingId = user?.id
    ? `${String(user.id).padStart(3, "0")} ${String(user.id * 412 + 5279).slice(0, 3)} ${String(
        user.id * 3187 + 1000
      ).slice(0, 4)}`
    : "— — —";

  const handleCopyPMI = () => {
    if (typeof window !== "undefined") {
      const link = `${window.location.origin}/join`;
      navigator.clipboard.writeText(link);
      setCopiedPMI(true);
      setTimeout(() => setCopiedPMI(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <Navbar />

      {/* Body: responsive flex container */}
      <div className="flex flex-col lg:flex-row flex-1 lg:h-[calc(100vh-56px)] overflow-hidden">
        {/* Sidebar (Fixed on desktop, horizontal scroll bar on mobile) */}
        <Sidebar />

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 flex flex-col lg:flex-row gap-5 min-h-full items-start">

            {/* ── Center Column ── */}
            <div className="w-full lg:flex-1 min-w-0 space-y-4">

              {/* User Profile Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white text-lg sm:text-xl font-semibold flex-shrink-0"
                    style={{ backgroundColor: "#747487" }}
                  >
                    {initials}
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">
                      {user?.name || "Default User"}
                    </h2>
                    <p className="text-xs sm:text-sm font-medium mt-0.5" style={{ color: "#0B5CFF" }}>
                      Plan: Workplace Basic
                    </p>
                  </div>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  <button
                    onClick={() => showComingSoonToast("Plan Management")}
                    className="text-xs sm:text-sm text-gray-700 border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors font-medium cursor-pointer"
                  >
                    Manage Plan
                  </button>
                  <button
                    onClick={() => showComingSoonToast("Plan Details")}
                    className="text-xs sm:text-sm hover:underline font-medium cursor-pointer"
                    style={{ color: "#0B5CFF" }}
                  >
                    View Plan Details
                  </button>
                </div>
              </div>

              {/* Meeting Action Buttons */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
                <ActionButtons />
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 shadow-sm">
                <h3 className="text-base font-semibold text-gray-900 mb-3">
                  Recent activity
                </h3>
                <UpcomingMeetings defaultTab="recent" />
              </div>
            </div>

            {/* ── Right Panel ── */}
            <div className="w-full lg:w-72 flex-shrink-0 space-y-4">

              {/* Quick Icon Actions */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="grid grid-cols-3 gap-3 mb-4 sm:mb-5">
                  {/* Schedule */}
                  <button
                    onClick={() => router.push("/schedule")}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer"
                    aria-label="Schedule a meeting"
                  >
                    <div
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white text-lg sm:text-xl group-hover:opacity-90 transition-all group-hover:scale-105 active:scale-95 shadow-sm"
                      style={{ backgroundColor: "#0B5CFF" }}
                    >
                      📅
                    </div>
                    <span className="text-xs text-gray-600 font-medium">Schedule</span>
                  </button>

                  {/* Join */}
                  <button
                    onClick={() => router.push("/join")}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer"
                    aria-label="Join a meeting"
                  >
                    <div
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white text-lg sm:text-xl group-hover:opacity-90 transition-all group-hover:scale-105 active:scale-95 shadow-sm"
                      style={{ backgroundColor: "#0B5CFF" }}
                    >
                      🔗
                    </div>
                    <span className="text-xs text-gray-600 font-medium">Join</span>
                  </button>

                  {/* Host (New Meeting) */}
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("zoom:newmeeting"));
                    }}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer"
                    aria-label="Host a new meeting"
                  >
                    <div
                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white text-lg sm:text-xl group-hover:opacity-90 transition-all group-hover:scale-105 active:scale-95 shadow-sm"
                      style={{ backgroundColor: "#E86C12" }}
                    >
                      🎥
                    </div>
                    <span className="text-xs text-gray-600 font-medium">Host</span>
                  </button>
                </div>

                {/* Personal Meeting ID */}
                <div className="border-t border-gray-100 pt-3 sm:pt-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs sm:text-sm font-semibold text-gray-900">
                      Personal Meeting ID
                    </p>
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent("zoom:newmeeting"))}
                      className="text-[11px] font-semibold px-2 py-0.5 rounded text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      Start Room
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <span className="text-xs sm:text-sm text-gray-700 font-mono font-medium tracking-wide">
                      {personalMeetingId}
                    </span>
                    <button
                      onClick={handleCopyPMI}
                      className="text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1 text-[11px] font-medium px-2 py-1 bg-white border border-gray-200 rounded shadow-2xs cursor-pointer"
                      title="Copy Join Link"
                      aria-label="Copy personal meeting join link"
                    >
                      {copiedPMI ? (
                        <>
                          <Check className="w-3 h-3 text-green-500" />
                          <span className="text-green-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-gray-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Upcoming Meetings Panel */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <UpcomingMeetings defaultTab="upcoming" />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
