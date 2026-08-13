"use client";

import { useEffect, useState } from "react";
import { Video, Settings } from "lucide-react";
import { api, User } from "@/lib/api";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const userData = await api.getCurrentUser();
        setUser(userData);
      } catch (err) {
        console.error("Failed to load user profile:", err);
      }
    }
    loadUser();
  }, []);

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800">
      <div className="flex items-center space-x-3">
        <div className="bg-blue-600 p-2 rounded-xl shadow-md">
          <Video className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">MeetRoom</span>
      </div>

      <div className="flex items-center space-x-4">
        <button
          aria-label="Settings"
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 bg-zinc-800/80 px-3 py-1.5 rounded-full border border-zinc-700/50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-sm font-semibold text-white shadow-sm">
            {user ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <span className="text-sm font-medium text-zinc-200 pr-1">
            {user ? user.name : "Default User"}
          </span>
        </div>
      </div>
    </nav>
  );
}
