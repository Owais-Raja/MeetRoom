"use client";

import { useState } from "react";
import { Video, PlusSquare, Calendar, MonitorUp, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function ActionButtons() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const handleNewMeeting = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const newMeeting = await api.createInstantMeeting("Instant Meeting");
      router.push(`/meeting/${newMeeting.meeting_code}`);
    } catch (err) {
      console.error("Failed to create instant meeting:", err);
      alert("Error starting instant meeting. Make sure FastAPI backend is running on port 8000.");
    } finally {
      setCreating(false);
    }
  };

  const actions = [
    {
      icon: creating ? Loader2 : Video,
      label: creating ? "Starting..." : "New Meeting",
      color: "bg-orange-500 hover:bg-orange-600",
      onClick: handleNewMeeting,
      isLoading: creating,
    },
    {
      icon: PlusSquare,
      label: "Join",
      color: "bg-blue-600 hover:bg-blue-700",
      onClick: () => router.push("/join"),
    },
    {
      icon: Calendar,
      label: "Schedule",
      color: "bg-blue-600 hover:bg-blue-700",
      onClick: () => router.push("/schedule"),
    },
    {
      icon: MonitorUp,
      label: "Share Screen",
      color: "bg-blue-600 hover:bg-blue-700",
      onClick: () => alert("Share Screen functionality is available during active calls."),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl mx-auto md:mx-0">
      {actions.map((action, idx) => (
        <div key={idx} className="flex flex-col items-center group cursor-pointer" onClick={action.onClick}>
          <div className={`${action.color} p-5 rounded-2xl md:rounded-3xl shadow-lg transform transition-transform group-hover:scale-105 group-active:scale-95 flex items-center justify-center mb-3`}>
            <action.icon className={`w-10 h-10 md:w-12 md:h-12 text-white ${action.isLoading ? "animate-spin" : ""}`} strokeWidth={1.5} />
          </div>
          <span className="text-zinc-300 font-medium text-sm">{action.label}</span>
        </div>
      ))}
    </div>
  );
}
