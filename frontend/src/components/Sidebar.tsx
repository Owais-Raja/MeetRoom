"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Video,
  Film,
  FileText,
  Layout,
  StickyNote,
  Scissors,
  Calendar,
  ClipboardList,
} from "lucide-react";

import { showComingSoonToast } from "@/components/Toast";

const myProductsItems = [
  { label: "Meetings", icon: Video, href: "/" },
  { label: "Recordings", icon: Film, href: "#" },
  { label: "Summaries", icon: FileText, href: "#" },
  { label: "Whiteboards", icon: Layout, href: "#" },
  { label: "Notes", icon: StickyNote, href: "#" },
  { label: "Clips", icon: Scissors, href: "#" },
  { label: "Scheduler", icon: Calendar, href: "/schedule" },
  { label: "Tasks", icon: ClipboardList, href: "#" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isHome = pathname === "/";

  return (
    <aside className="w-52 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto min-h-0">
      <nav className="p-2 flex-1">
        {/* Home */}
        <button
          onClick={() => router.push("/")}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-1 ${
            isHome
              ? "text-blue-600 bg-blue-50"
              : "text-gray-700 hover:bg-gray-100"
          }`}
          style={isHome ? { color: "#0B5CFF", backgroundColor: "#EBF2FF" } : {}}
        >
          <Home className="w-4 h-4 flex-shrink-0" />
          <span>Home</span>
        </button>

        {/* My Products Section */}
        <div className="mt-3">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1.5">
            My Products
          </p>
          <div className="space-y-0.5">
            {myProductsItems.map((item) => {
              const isActive =
                item.href !== "#" && item.href !== "/" && pathname.startsWith(item.href);
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    if (item.href !== "#") {
                      router.push(item.href);
                    } else {
                      showComingSoonToast(item.label);
                    }
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                    isActive
                      ? "font-medium text-blue-600"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                  style={isActive ? { color: "#0B5CFF", backgroundColor: "#EBF2FF" } : {}}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                  {item.href === "#" && (
                    <span className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200/60">
                      Soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </aside>
  );
}
