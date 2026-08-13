"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Menu, X, Calendar, PlusSquare, Video, User as UserIcon } from "lucide-react";
import { api, User } from "@/lib/api";
import SettingsModal from "@/components/SettingsModal";
import ToastContainer, { showComingSoonToast } from "@/components/Toast";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
      <ToastContainer />
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 h-14 flex items-center justify-between px-4 sm:px-6">
        {/* Left: Logo */}
        <div className="flex items-center gap-4">
          <div
            className="flex items-center cursor-pointer flex-shrink-0"
            onClick={() => router.push("/")}
          >
            <span
              className="font-bold text-xl sm:text-2xl tracking-tight select-none"
              style={{ color: "#0B5CFF", letterSpacing: "-0.5px" }}
            >
              MeetRoom
            </span>
          </div>

          {/* Desktop Center Nav Links */}
          <div className="hidden lg:flex items-center space-x-0.5 ml-4">
            {["Products", "Solutions", "Resources", "Plans & Pricing"].map((item) => (
              <button
                key={item}
                onClick={() => showComingSoonToast(item)}
                className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors font-medium cursor-pointer"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Desktop Action Links & Mobile Controls */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Desktop Links */}
          <div className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => router.push("/schedule")}
              className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors font-medium cursor-pointer"
            >
              Schedule
            </button>
            <button
              onClick={() => router.push("/join")}
              className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors font-medium cursor-pointer"
            >
              Join
            </button>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent("zoom:newmeeting"));
              }}
              className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>Host</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => showComingSoonToast("Web App Settings")}
              className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>Web App</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Join button on mobile */}
          <button
            onClick={() => router.push("/join")}
            className="md:hidden px-2.5 py-1 text-xs font-semibold text-white rounded-md transition-colors"
            style={{ backgroundColor: "#0B5CFF" }}
          >
            Join
          </button>

          {/* User Avatar */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold hover:opacity-90 transition-opacity flex-shrink-0 cursor-pointer"
            style={{ backgroundColor: "#747487" }}
            title={user?.name || "Profile Settings"}
            aria-label="Open profile settings"
          >
            {initials}
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-150 sticky top-14 z-30">
          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-gray-100">
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                window.dispatchEvent(new CustomEvent("zoom:newmeeting"));
              }}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl text-white font-medium text-xs shadow-sm"
              style={{ backgroundColor: "#E86C12" }}
            >
              <Video className="w-4 h-4" />
              <span>New Meeting</span>
            </button>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                router.push("/schedule");
              }}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl text-white font-medium text-xs shadow-sm"
              style={{ backgroundColor: "#0B5CFF" }}
            >
              <Calendar className="w-4 h-4" />
              <span>Schedule</span>
            </button>
          </div>

          <div className="space-y-1 pt-1">
            <p className="text-[10px] font-semibold uppercase text-gray-400 px-2 tracking-wider">
              Navigation
            </p>
            {["Products", "Solutions", "Resources", "Plans & Pricing"].map((item) => (
              <button
                key={item}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  showComingSoonToast(item);
                }}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium flex items-center justify-between"
              >
                <span>{item}</span>
                <span className="text-[9px] text-amber-600 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded font-semibold">Soon</span>
              </button>
            ))}
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsSettingsOpen(true);
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium flex items-center gap-2"
            >
              <UserIcon className="w-4 h-4 text-gray-500" />
              <span>Profile Settings ({user?.name || "User"})</span>
            </button>
          </div>
        </div>
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={user}
        onUserUpdated={(updatedUser) => setUser(updatedUser)}
      />
    </>
  );
}
