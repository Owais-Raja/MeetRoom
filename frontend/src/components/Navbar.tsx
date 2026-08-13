"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { api, User } from "@/lib/api";
import SettingsModal from "@/components/SettingsModal";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try {
        const userData = await api.getCurrentUser();
        const localName =
          typeof window !== "undefined"
            ? localStorage.getItem("meetroom_user_name")
            : null;
        if (localName) userData.name = localName;
        setUser(userData);
      } catch (err) {
        console.error("Failed to load user profile:", err);
      }
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

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 h-14 flex items-center px-6">
        {/* Logo */}
        <div
          className="flex items-center cursor-pointer mr-8 flex-shrink-0"
          onClick={() => router.push("/")}
        >
          <span
            className="font-bold text-2xl tracking-tight select-none"
            style={{ color: "#0B5CFF", letterSpacing: "-0.5px" }}
          >
            zoom
          </span>
        </div>

        {/* Center Nav Links */}
        <div className="hidden md:flex items-center space-x-0.5 flex-1">
          {["Products", "Solutions", "Resources", "Plans & Pricing"].map((item) => (
            <button
              key={item}
              className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors font-medium"
            >
              {item}
            </button>
          ))}
        </div>

        {/* Right Action Links */}
        <div className="flex items-center space-x-0.5 ml-auto">
          <button
            onClick={() => router.push("/schedule")}
            className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors font-medium"
          >
            Schedule
          </button>
          <button
            onClick={() => router.push("/join")}
            className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors font-medium"
          >
            Join
          </button>
          <button className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors font-medium flex items-center gap-1">
            <span>Host</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors font-medium flex items-center gap-1">
            <span>Web App</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* User Avatar */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="ml-2 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold hover:opacity-90 transition-opacity flex-shrink-0"
            style={{ backgroundColor: "#747487" }}
            title={user?.name || "Profile Settings"}
            aria-label="Open profile settings"
          >
            {initials}
          </button>
        </div>
      </nav>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={user}
        onUserUpdated={(updatedUser) => setUser(updatedUser)}
      />
    </>
  );
}
