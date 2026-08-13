"use client";

import { useEffect, useState } from "react";
import { Video, Calendar, PlusSquare, MonitorUp, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { api, Meeting } from "@/lib/api";
import ShareMeetingModal from "@/components/ShareMeetingModal";

import { showComingSoonToast } from "@/components/Toast";

export default function ActionButtons() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [createdMeeting, setCreatedMeeting] = useState<Meeting | null>(null);

  const handleNewMeeting = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const newMeeting = await api.createInstantMeeting("Instant Meeting");
      if (newMeeting.host_token && typeof window !== "undefined") {
        localStorage.setItem(
          `meetroom_host_token_${newMeeting.meeting_code}`,
          newMeeting.host_token
        );
      }
      setCreatedMeeting(newMeeting);
    } catch (err: any) {
      console.error("Failed to create instant meeting:", err);
      alert(`Error starting instant meeting:\n${err?.message || err}`);
    } finally {
      setCreating(false);
    }
  };

  // Listen for the Host icon button in the right panel
  useEffect(() => {
    const handler = () => handleNewMeeting();
    window.addEventListener("zoom:newmeeting", handler);
    return () => window.removeEventListener("zoom:newmeeting", handler);
  }, [creating]);

  const actions = [
    {
      icon: creating ? Loader2 : Video,
      label: creating ? "Creating..." : "New Meeting",
      bgColor: "#E86C12",
      hoverBgColor: "#cf5f0f",
      onClick: handleNewMeeting,
      isLoading: creating,
    },
    {
      icon: PlusSquare,
      label: "Join",
      bgColor: "#0B5CFF",
      hoverBgColor: "#0948cc",
      onClick: () => router.push("/join"),
    },
    {
      icon: Calendar,
      label: "Schedule",
      bgColor: "#0B5CFF",
      hoverBgColor: "#0948cc",
      onClick: () => router.push("/schedule"),
    },
    {
      icon: MonitorUp,
      label: "Share Screen",
      bgColor: "#0B5CFF",
      hoverBgColor: "#0948cc",
      onClick: () =>
        showComingSoonToast("Share Screen (join a meeting room to share)"),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.onClick}
            disabled={action.isLoading}
            className="flex flex-col items-center gap-2 sm:gap-2.5 group disabled:opacity-60 cursor-pointer"
            aria-label={action.label}
          >
            <div
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-sm transition-all duration-150 group-hover:scale-105 group-active:scale-95"
              style={{ backgroundColor: action.bgColor }}
            >
              <action.icon
                className={`w-7 h-7 sm:w-8 sm:h-8 text-white ${action.isLoading ? "animate-spin" : ""}`}
                strokeWidth={1.8}
              />
            </div>
            <span className="text-xs sm:text-sm font-medium text-gray-700">{action.label}</span>
          </button>
        ))}
      </div>

      {createdMeeting && (
        <ShareMeetingModal
          isOpen={!!createdMeeting}
          onClose={() => setCreatedMeeting(null)}
          meetingCode={createdMeeting.meeting_code}
          meetingTitle={createdMeeting.title}
          autoRedirectOnJoin={true}
        />
      )}
    </>
  );
}
