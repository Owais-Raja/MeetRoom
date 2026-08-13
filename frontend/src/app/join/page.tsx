"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, LogIn } from "lucide-react";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";

export default function JoinPage() {
  const router = useRouter();

  const [inputCode, setInputCode] = useState("");
  const [displayName, setDisplayName] = useState("Default User");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clean raw meeting code from input or full invite link
  const extractCode = (input: string): string => {
    const trimmed = input.trim();
    if (trimmed.includes("/meeting/")) {
      const parts = trimmed.split("/meeting/");
      const codePart = parts[1].split("/")[0].split("?")[0];
      return codePart;
    }
    return trimmed;
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = extractCode(inputCode);

    if (!cleanCode) {
      setError("Please enter a valid meeting code or invite link.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Validate meeting code and register participant row
      await api.joinMeeting(cleanCode, displayName.trim() || "Guest");
      // Redirect to pre-join lobby
      router.push(`/meeting/${cleanCode}`);
    } catch (err: any) {
      console.error("Join validation error:", err);
      setError("Invalid meeting code or the meeting has ended.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <button
            onClick={() => router.push("/")}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-4 sm:mb-6 font-medium cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Card Header */}
            <div className="px-5 sm:px-8 py-5 sm:py-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#EBF2FF" }}
                >
                  <LogIn className="w-5 h-5" style={{ color: "#0B5CFF" }} />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                    Join a Meeting
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Enter a code or paste an invite link
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleJoin} className="px-5 sm:px-8 py-5 sm:py-6 space-y-4 sm:space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Meeting Code or Invite Link *
                </label>
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="e.g. abc-defg-hij or paste link"
                  required
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Your Display Name *
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name in the room"
                  required
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-white font-semibold rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
                style={{ backgroundColor: "#0B5CFF" }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Validating...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Join Meeting</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
