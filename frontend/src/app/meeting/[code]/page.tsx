"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Video, VideoOff, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import { api, Meeting } from "@/lib/api";

interface PageProps {
  params: Promise<{ code: string }>;
}

export default function MeetingLobbyPage({ params }: PageProps) {
  // Unwrap Next.js 15+ dynamic route parameter
  const { code } = use(params);
  const router = useRouter();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User input & device states
  const [displayName, setDisplayName] = useState("Default User");
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Local media stream reference for preview
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // 1. Fetch meeting metadata to validate code
  useEffect(() => {
    async function fetchMeetingDetails() {
      try {
        const data = await api.getMeetingByCode(code);
        setMeeting(data);
      } catch (err: any) {
        console.error("Meeting validation error:", err);
        setError("Meeting not found or link has expired.");
      } finally {
        setLoading(false);
      }
    }

    // Prefill display name from default logged in user if available
    async function fetchUser() {
      try {
        const savedName =
          typeof window !== "undefined"
            ? localStorage.getItem("meetroom_user_name")
            : null;
        if (savedName) {
          setDisplayName(savedName);
          return;
        }
        const u = await api.getCurrentUser();
        if (u?.name) setDisplayName(u.name);
      } catch {}
    }

    fetchMeetingDetails();
    fetchUser();
  }, [code]);

  // 2. Initialize local camera & microphone preview
  useEffect(() => {
    let streamInstance: MediaStream | null = null;

    async function initLocalStream() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        streamInstance = stream;
        setMediaStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn(
          "Camera/Microphone permission denied or device not found:",
          err
        );
        setIsVideoOff(true);
      }
    }

    initLocalStream();

    // Cleanup: Stop media tracks when leaving the pre-join lobby
    return () => {
      if (streamInstance) {
        streamInstance.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Toggle microphone track
  const toggleAudio = () => {
    if (mediaStream) {
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isAudioMuted;
      }
    }
    setIsAudioMuted(!isAudioMuted);
  };

  // Toggle camera track
  const toggleVideo = () => {
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isVideoOff;
      }
    }
    setIsVideoOff(!isVideoOff);
  };

  // Proceed to actual meeting room with server-assigned role
  const handleJoinRoom = async () => {
    const hostToken =
      typeof window !== "undefined"
        ? localStorage.getItem(`meetroom_host_token_${code}`) || undefined
        : undefined;

    try {
      const p = await api.joinMeeting(code, displayName || "Guest", hostToken);
      const queryParams = new URLSearchParams({
        name: displayName || "Guest",
        role: p.role || "participant",
        mic: (!isAudioMuted).toString(),
        cam: (!isVideoOff).toString(),
      });
      router.push(`/meeting/${code}/room?${queryParams.toString()}`);
    } catch (err) {
      console.error("Failed to join meeting:", err);
      const queryParams = new URLSearchParams({
        name: displayName || "Guest",
        role: "participant",
        mic: (!isAudioMuted).toString(),
        cam: (!isVideoOff).toString(),
      });
      router.push(`/meeting/${code}/room?${queryParams.toString()}`);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center gap-3">
        <div
          className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin"
          style={{ border: "3px solid #0B5CFF", borderTopColor: "transparent" }}
        />
        <p className="text-gray-500 font-medium text-sm">
          Validating meeting link...
        </p>
      </main>
    );
  }

  if (error || !meeting) {
    return (
      <main className="min-h-screen bg-[#F5F5F5] flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
          <div className="w-16 h-16 bg-red-50 rounded-full border border-red-200 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Invalid Meeting Link
          </h1>
          <p className="text-gray-500 max-w-sm">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-2 px-6 py-2.5 text-white font-semibold rounded-xl transition-colors shadow-sm"
            style={{ backgroundColor: "#0B5CFF" }}
          >
            Return to Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12">
        {/* Left: Camera Preview */}
        <div className="w-full lg:w-3/5">
          <div className="relative aspect-video bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 shadow-lg flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 ${
                isVideoOff ? "hidden" : "block"
              }`}
            />

            {/* Video Off Fallback Avatar */}
            {isVideoOff && (
              <div className="flex flex-col items-center justify-center gap-3">
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold text-white shadow-lg"
                  style={{ backgroundColor: "#747487" }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="text-gray-400 text-xs sm:text-sm">Camera is off</span>
              </div>
            )}

            {/* Bottom Controls Overlay */}
            <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-sm px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border border-white/10">
              <button
                onClick={toggleAudio}
                className={`p-2 sm:p-2.5 rounded-full transition-colors ${
                  isAudioMuted
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
                title={isAudioMuted ? "Unmute Microphone" : "Mute Microphone"}
                aria-label={isAudioMuted ? "Unmute" : "Mute"}
              >
                {isAudioMuted ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={toggleVideo}
                className={`p-2.5 rounded-full transition-colors ${
                  isVideoOff
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
                title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
                aria-label={isVideoOff ? "Turn camera on" : "Turn camera off"}
              >
                {isVideoOff ? (
                  <VideoOff className="w-4 h-4" />
                ) : (
                  <Video className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Pre-Join Form */}
        <div className="w-full lg:w-2/5 max-w-md lg:max-w-sm">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-7 space-y-4 sm:space-y-5">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">
                {meeting.title}
              </h1>
              <p className="text-sm text-gray-500">
                Code:{" "}
                <code className="font-mono font-semibold" style={{ color: "#0B5CFF" }}>
                  {meeting.meeting_code}
                </code>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Your Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition text-sm"
              />
            </div>

            <button
              onClick={handleJoinRoom}
              className="w-full py-3 text-white font-semibold rounded-xl shadow-sm transition-all text-sm hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: "#0B5CFF" }}
            >
              Join Meeting
            </button>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                <span>Encrypted P2P Media</span>
              </span>
              <span>Host: {meeting.host?.name || "Default Host"}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
