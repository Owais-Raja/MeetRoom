"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Video, VideoOff, Settings, ShieldCheck } from "lucide-react";
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
        const savedName = typeof window !== "undefined" ? localStorage.getItem("meetroom_user_name") : null;
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
        console.warn("Camera/Microphone permission denied or device not found:", err);
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
    try {
      const p = await api.joinMeeting(code, displayName || "Guest");
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
      <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-zinc-400 font-medium">Validating meeting link...</p>
      </main>
    );
  }

  if (error || !meeting) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="bg-red-500/10 p-4 rounded-full border border-red-500/20 text-red-400">
            <ShieldCheck className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold">Invalid Meeting Link</h1>
          <p className="text-zinc-400 max-w-md">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12">
        {/* Left Column: Camera Preview Tile */}
        <div className="w-full lg:w-3/5 space-y-4">
          <div className="relative aspect-video bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl flex items-center justify-center">
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
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="text-zinc-400 text-sm font-medium">Camera is turned off</span>
              </div>
            )}

            {/* Bottom Controls Overlay */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-zinc-950/80 backdrop-blur-md px-6 py-3 rounded-full border border-zinc-800/80 shadow-lg">
              <button
                onClick={toggleAudio}
                className={`p-3 rounded-full transition-colors ${
                  isAudioMuted
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                }`}
                title={isAudioMuted ? "Unmute Microphone" : "Mute Microphone"}
              >
                {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full transition-colors ${
                  isVideoOff
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                }`}
                title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Pre-Join Form */}
        <div className="w-full lg:w-2/5 max-w-md bg-zinc-900/60 p-8 rounded-3xl border border-zinc-800 shadow-xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">{meeting.title}</h1>
            <p className="text-sm text-zinc-400">
              Meeting Code: <code className="text-blue-400 font-mono">{meeting.meeting_code}</code>
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Your Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors text-sm font-medium"
              />
            </div>

            <button
              onClick={handleJoinRoom}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-blue-600/25 transition-all text-base"
            >
              Join Meeting
            </button>
          </div>

          <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Encrypted P2P Media</span>
            </span>
            <span>Host: {meeting.host?.name || "Default Host"}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
