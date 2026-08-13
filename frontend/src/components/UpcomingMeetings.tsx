"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Calendar, Clock, Copy, Check, Video } from "lucide-react";
import { api, Meeting } from "@/lib/api";

export default function UpcomingMeetings() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "recent">("upcoming");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMeetings() {
      setLoading(true);
      try {
        const data = activeTab === "upcoming"
          ? await api.getUpcomingMeetings()
          : await api.getRecentMeetings();
        setMeetings(data);
      } catch (error) {
        console.error(`Failed to fetch ${activeTab} meetings:`, error);
      } finally {
        setLoading(false);
      }
    }
    fetchMeetings();
  }, [activeTab]);

  const handleCopyLink = (code: string) => {
    const link = `${window.location.origin}/meeting/${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="bg-zinc-900/60 rounded-3xl p-6 h-full border border-zinc-800 flex flex-col">
      {/* Tab Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
        <div className="flex space-x-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`px-4 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all ${
              activeTab === "upcoming"
                ? "bg-blue-600 text-white shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setActiveTab("recent")}
            className={`px-4 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all ${
              activeTab === "recent"
                ? "bg-blue-600 text-white shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Recent / History
          </button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[220px] text-zinc-500 space-y-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm">Loading meetings...</p>
        </div>
      ) : meetings.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[220px] text-zinc-500 space-y-2">
          <Calendar className="w-10 h-10 stroke-1 text-zinc-600 mb-1" />
          <p className="text-sm font-medium">No {activeTab} meetings found</p>
          <p className="text-xs text-zinc-600 text-center max-w-[200px]">
            {activeTab === "upcoming"
              ? "Schedule a meeting or start an instant meeting."
              : "Completed meetings will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-4 flex-1 overflow-y-auto max-h-[500px] pr-1">
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-zinc-100 font-semibold text-base">{meeting.title}</h3>
                  {meeting.description && (
                    <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">{meeting.description}</p>
                  )}
                </div>
                <span
                  className={`text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full ${
                    meeting.status === "scheduled"
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      : meeting.status === "ongoing"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {meeting.status}
                </span>
              </div>

              <div className="text-xs text-zinc-400 space-y-1 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/50">
                <div className="flex items-center space-x-2">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span>
                    {meeting.scheduled_at
                      ? format(new Date(meeting.scheduled_at), "MMM d, yyyy • h:mm a")
                      : meeting.started_at
                      ? format(new Date(meeting.started_at), "MMM d, yyyy • h:mm a")
                      : "No scheduled time"}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Video className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Meeting Code: <code className="text-blue-400 font-mono">{meeting.meeting_code}</code></span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                {activeTab === "upcoming" ? (
                  <button
                    onClick={() => window.location.href = `/meeting/${meeting.meeting_code}`}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 rounded-xl font-medium transition-colors"
                  >
                    Start / Join
                  </button>
                ) : (
                  <button
                    disabled
                    className="flex-1 bg-zinc-800 text-zinc-500 text-xs py-2 rounded-xl font-medium cursor-not-allowed"
                  >
                    Ended
                  </button>
                )}
                <button
                  onClick={() => handleCopyLink(meeting.meeting_code)}
                  className="px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-2 rounded-xl transition-colors flex items-center space-x-1.5"
                  title="Copy invite link"
                >
                  {copiedCode === meeting.meeting_code ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
