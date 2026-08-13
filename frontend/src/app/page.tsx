"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ActionButtons from "@/components/ActionButtons";
import UpcomingMeetings from "@/components/UpcomingMeetings";
import { api, User } from "@/lib/api";

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
    if (personalMeetingId !== "— — —") {
      navigator.clipboard.writeText(personalMeetingId.replace(/\s/g, ""));
      setCopiedPMI(true);
      setTimeout(() => setCopiedPMI(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <Navbar />

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
        {/* Left Sidebar */}
        <Sidebar />

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 flex gap-5 min-h-full items-start">

            {/* ── Center Column ── */}
            <div className="flex-1 min-w-0 space-y-4">

              {/* User Profile Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-semibold flex-shrink-0"
                    style={{ backgroundColor: "#747487" }}
                  >
                    {initials}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 leading-tight">
                      {user?.name || "Default User"}
                    </h2>
                    <p className="text-sm font-medium mt-0.5" style={{ color: "#0B5CFF" }}>
                      Plan: Workplace Basic
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <button className="text-sm text-gray-700 border border-gray-300 rounded-md px-4 py-1.5 hover:bg-gray-50 transition-colors font-medium">
                    Manage Plan
                  </button>
                  <button
                    className="text-sm hover:underline font-medium"
                    style={{ color: "#0B5CFF" }}
                  >
                    View Plan Details
                  </button>
                </div>
              </div>

              {/* Meeting Action Buttons */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <ActionButtons />
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h3 className="text-base font-semibold text-gray-900 mb-4">
                  Recent activity
                </h3>
                <UpcomingMeetings defaultTab="recent" />
              </div>
            </div>

            {/* ── Right Panel ── */}
            <div className="w-72 flex-shrink-0 space-y-4">

              {/* Quick Icon Actions */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {/* Schedule */}
                  <button
                    onClick={() => router.push("/schedule")}
                    className="flex flex-col items-center gap-1.5 group"
                    aria-label="Schedule a meeting"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl group-hover:opacity-90 transition-all group-hover:scale-105 active:scale-95 shadow-sm"
                      style={{ backgroundColor: "#0B5CFF" }}
                    >
                      📅
                    </div>
                    <span className="text-xs text-gray-600 font-medium">Schedule</span>
                  </button>

                  {/* Join */}
                  <button
                    onClick={() => router.push("/join")}
                    className="flex flex-col items-center gap-1.5 group"
                    aria-label="Join a meeting"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl group-hover:opacity-90 transition-all group-hover:scale-105 active:scale-95 shadow-sm"
                      style={{ backgroundColor: "#0B5CFF" }}
                    >
                      🔗
                    </div>
                    <span className="text-xs text-gray-600 font-medium">Join</span>
                  </button>

                  {/* Host (New Meeting) */}
                  <button
                    onClick={() => {
                      // Trigger the New Meeting action via ActionButtons — 
                      // We dispatch a custom event that ActionButtons listens to
                      window.dispatchEvent(new CustomEvent("zoom:newmeeting"));
                    }}
                    className="flex flex-col items-center gap-1.5 group"
                    aria-label="Host a new meeting"
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl group-hover:opacity-90 transition-all group-hover:scale-105 active:scale-95 shadow-sm"
                      style={{ backgroundColor: "#E86C12" }}
                    >
                      🎥
                    </div>
                    <span className="text-xs text-gray-600 font-medium">Host</span>
                  </button>
                </div>

                {/* Personal Meeting ID */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm font-semibold text-gray-900 mb-1">
                    Personal Meeting ID
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 font-mono tracking-wide">
                      {personalMeetingId}
                    </span>
                    <button
                      onClick={handleCopyPMI}
                      className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                      title="Copy Meeting ID"
                      aria-label="Copy personal meeting ID"
                    >
                      {copiedPMI ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
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
