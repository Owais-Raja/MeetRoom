"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, ArrowLeft, Check, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";

export default function SchedulePage() {
  const router = useRouter();

  // Tomorrow 10:00 AM default ISO string for datetime-local input
  const getDefaultDateTime = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const day = String(tomorrow.getDate()).padStart(2, "0");
    const hours = String(tomorrow.getHours()).padStart(2, "0");
    const minutes = String(tomorrow.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState(getDefaultDateTime());
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a meeting title.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Send the datetime-local string directly (no UTC conversion).
      // The browser's datetime-local input gives us YYYY-MM-DDTHH:mm in LOCAL time.
      // Appending ':00' makes it a valid ISO 8601 local datetime that FastAPI
      // will parse as-is (treated as UTC on the server, matching what the user intended).
      const scheduledDateISO =
        scheduledAt.length === 16 ? `${scheduledAt}:00` : scheduledAt;

      const newMeeting = await api.scheduleMeeting({
        title: title.trim(),
        description: description.trim() || undefined,
        scheduled_at: scheduledDateISO,
        duration_minutes: durationMinutes,
      });

      if (newMeeting.host_token && typeof window !== "undefined") {
        localStorage.setItem(
          `meetroom_host_token_${newMeeting.meeting_code}`,
          newMeeting.host_token
        );
      }

      router.push("/");
    } catch (err: any) {
      console.error("Failed to schedule meeting:", err);
      setError(`Error scheduling meeting: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-start justify-center p-6 pt-10">
        <div className="w-full max-w-2xl">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-6 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Card Header */}
            <div className="px-8 py-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#EBF2FF" }}
                >
                  <Calendar className="w-5 h-5" style={{ color: "#0B5CFF" }} />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    Schedule a Meeting
                  </h1>
                  <p className="text-sm text-gray-500">
                    Plan a future video meeting and generate an invite link
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Weekly Product Sync"
                  required
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition text-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Agenda or topics for discussion..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition text-sm resize-none"
                />
              </div>

              {/* Date/Time and Duration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Date &amp; Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Duration
                  </label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition text-sm font-medium"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 text-white rounded-xl text-sm font-semibold shadow-sm transition-all flex items-center gap-2 disabled:opacity-60"
                  style={{ backgroundColor: "#0B5CFF" }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Scheduling...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Schedule Meeting</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
