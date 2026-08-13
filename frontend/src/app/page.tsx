"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import ActionButtons from "@/components/ActionButtons";
import UpcomingMeetings from "@/components/UpcomingMeetings";

export default function Home() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-white selection:bg-blue-600 selection:text-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
          {/* Left Column - Hero Banner & Action Grid */}
          <div className="lg:col-span-2 space-y-10">
            {/* Live Clock & Date Banner */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-8 shadow-2xl flex items-end min-h-[220px] md:min-h-[260px] relative overflow-hidden border border-blue-500/20">
              <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]"></div>
              <div className="relative z-10 w-full flex justify-between items-end">
                <div>
                  <h1
                    suppressHydrationWarning
                    className="text-5xl md:text-7xl font-light tracking-tight mb-2 font-mono"
                  >
                    {time
                      ? time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                      : "--:--:--"}
                  </h1>
                  <p suppressHydrationWarning className="text-blue-100 text-base md:text-lg font-medium">
                    {time
                      ? time.toLocaleDateString([], {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })
                      : "Loading date..."}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action Cards Grid */}
            <div className="bg-zinc-900/40 p-6 md:p-8 rounded-3xl border border-zinc-800/80 shadow-xl">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-6">
                Meeting Actions
              </h2>
              <ActionButtons />
            </div>
          </div>

          {/* Right Column - Upcoming & Recent Meetings */}
          <div className="lg:col-span-1 h-full">
            <UpcomingMeetings />
          </div>
        </div>
      </div>
    </main>
  );
}
