"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Calendar, Clock, Copy, Check, Video, X, ArrowRight } from "lucide-react";
import { api, Meeting } from "@/lib/api";

import { showComingSoonToast } from "@/components/Toast";

/**
 * Parse a datetime string as LOCAL time, ignoring any UTC offset/Z suffix.
 * scheduled_at is stored as the user's local time on the server — we must
 * never let the browser re-convert it from UTC to local (that would add +5:30).
 */
function parseLocalDatetime(value: string): Date {
  const normalized = value.replace(/Z$/, "").replace(/[+-]\d{2}:\d{2}$/, "");
  return new Date(normalized);
}

interface UpcomingMeetingsProps {
  defaultTab?: "upcoming" | "recent";
}

export default function UpcomingMeetings({ defaultTab = "upcoming" }: UpcomingMeetingsProps) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "recent">(defaultTab);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [cancellingCode, setCancellingCode] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMeetings() {
      setLoading(true);
      try {
        const data =
          activeTab === "upcoming"
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

  const handleCancel = async (code: string) => {
    if (!confirm("Are you sure you want to cancel this meeting?")) return;
    setCancellingCode(code);
    try {
      await api.cancelMeeting(code);
      setMeetings((prev) => prev.filter((m) => m.meeting_code !== code));
    } catch (err: any) {
      alert(`Failed to cancel meeting: ${err?.message || err}`);
    } finally {
      setCancellingCode(null);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Tab Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "upcoming"
                ? "text-white"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
            style={activeTab === "upcoming" ? { backgroundColor: "#0B5CFF" } : {}}
          >
            Upcoming
          </button>
          <button
            onClick={() => setActiveTab("recent")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              activeTab === "recent"
                ? "text-white"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
            style={activeTab === "recent" ? { backgroundColor: "#0B5CFF" } : {}}
          >
            Recent
          </button>
        </div>
        <button
          onClick={() => showComingSoonToast("Meetings Directory")}
          className="text-xs font-medium flex items-center gap-0.5 hover:underline transition-colors cursor-pointer"
          style={{ color: "#0B5CFF" }}
        >
          Visit Meetings
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
            <div
              className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "#0B5CFF", borderTopColor: "transparent" }}
            />
            <p className="text-xs">Loading meetings...</p>
          </div>
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
            <Calendar className="w-8 h-8 stroke-1 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">
              No{" "}
              {activeTab === "upcoming" ? "upcoming" : "recent"} meetings
            </p>
            {activeTab === "upcoming" && (
              <p className="text-xs text-gray-400 text-center max-w-[180px]">
                Schedule or start a new meeting to get started.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-0.5">
            {meetings.map((meeting) => (
              <div
                key={meeting.id}
                className="border border-gray-200 rounded-xl p-3 hover:border-gray-300 transition-colors bg-white"
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">
                      {meeting.title}
                    </h4>
                    {meeting.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {meeting.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${
                      meeting.status === "scheduled"
                        ? "bg-blue-50 text-blue-600"
                        : meeting.status === "ongoing"
                        ? "bg-green-50 text-green-600"
                        : meeting.status === "cancelled"
                        ? "bg-red-50 text-red-500"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {meeting.status}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2.5 bg-gray-50 rounded-lg px-2.5 py-1.5">
                  <Clock className="w-3 h-3 flex-shrink-0 text-gray-400" />
                  <span>
                    {meeting.scheduled_at
                      ? format(
                          parseLocalDatetime(meeting.scheduled_at),
                          "MMM d, yyyy • h:mm a"
                        )
                      : meeting.started_at
                      ? format(new Date(meeting.started_at), "MMM d, yyyy • h:mm a")
                      : "No scheduled time"}
                  </span>
                </div>

                <div className="flex gap-1.5">
                  {activeTab === "upcoming" ? (
                    <>
                      <button
                        onClick={() =>
                          (window.location.href = `/meeting/${meeting.meeting_code}`)
                        }
                        className="flex-1 text-xs py-1.5 rounded-lg font-semibold text-white transition-colors"
                        style={{ backgroundColor: "#0B5CFF" }}
                      >
                        Start / Join
                      </button>
                      <button
                        onClick={() => handleCancel(meeting.meeting_code)}
                        disabled={cancellingCode === meeting.meeting_code}
                        className="px-2.5 bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-500 text-xs py-1.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                        title="Cancel meeting"
                        aria-label="Cancel meeting"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>
                          {cancellingCode === meeting.meeting_code
                            ? "..."
                            : "Cancel"}
                        </span>
                      </button>
                    </>
                  ) : (
                    <button
                      disabled
                      className="flex-1 bg-gray-100 text-gray-400 text-xs py-1.5 rounded-lg font-medium cursor-not-allowed"
                    >
                      Ended
                    </button>
                  )}
                  <button
                    onClick={() => handleCopyLink(meeting.meeting_code)}
                    className="px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs py-1.5 rounded-lg transition-colors flex items-center gap-1"
                    title="Copy invite link"
                    aria-label="Copy invite link"
                  >
                    {copiedCode === meeting.meeting_code ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-green-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
