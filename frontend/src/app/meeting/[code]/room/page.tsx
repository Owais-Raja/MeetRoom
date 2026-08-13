"use client";

import { use, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  ShieldCheck,
  MessageSquare,
  VolumeX,
  UserX,
  X,
  Crown,
} from "lucide-react";
import { api, Meeting } from "@/lib/api";
import { SignalingClient, SignalingMessage } from "@/lib/signaling";
import { createPeerConnection } from "@/lib/webrtc";

interface RemotePeer {
  peerId: string;
  displayName: string;
  stream: MediaStream;
}

interface RoomProps {
  params: Promise<{ code: string }>;
}

/**
 * Sub-component for rendering individual remote participant video tiles in the mesh grid.
 */
function RemoteVideoTile({ peer }: { peer: RemotePeer }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
    }
  }, [peer.stream]);

  return (
    <div className="relative w-full h-full min-h-[260px] bg-zinc-900 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden flex items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-4 left-4 bg-zinc-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-zinc-800 text-xs font-medium flex items-center space-x-2">
        <span>{peer.displayName || "Participant"}</span>
        <Mic className="w-3.5 h-3.5 text-emerald-400" />
      </div>
    </div>
  );
}

export default function MeetingRoomPage({ params }: RoomProps) {
  const { code } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Participant metadata & server-assigned role
  const name = searchParams.get("name") || "Participant";
  const role = searchParams.get("role") || "participant";
  const initialMic = searchParams.get("mic") !== "false";
  const initialCam = searchParams.get("cam") !== "false";
  // Session participant ID
  const [participantId] = useState(() => `peer_${Math.random().toString(36).substring(2, 9)}`);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isMuted, setIsMuted] = useState(!initialMic);
  const [isVideoOff, setIsVideoOff] = useState(!initialCam);

  // Participant panel state
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);

  // Local media stream & video ref
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Mesh Topology: Map of active PeerConnections & Remote Peers state
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);

  const signalingClientRef = useRef<SignalingClient | null>(null);

  // Check if current user is the host (validated via server-assigned role)
  const isHost = role === "host";

  // 1. Fetch meeting metadata
  useEffect(() => {
    async function loadMeeting() {
      try {
        const m = await api.getMeetingByCode(code);
        setMeeting(m);
      } catch (err) {
        console.error("Failed to load meeting room details:", err);
      }
    }
    loadMeeting();
  }, [code]);

  // 2. Initialize Local Stream & WebSocket Signaling
  useEffect(() => {
    let streamInstance: MediaStream | null = null;

    async function setupCall() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        stream.getAudioTracks().forEach((t) => (t.enabled = initialMic));
        stream.getVideoTracks().forEach((t) => (t.enabled = initialCam));

        streamInstance = stream;
        setLocalStream(stream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const signaling = new SignalingClient(
          code,
          participantId,
          (message: SignalingMessage) => handleSignalingMessage(message, stream)
        );
        signalingClientRef.current = signaling;
        signaling.connect();
      } catch (err) {
        console.error("Failed to access camera/mic for mesh call:", err);
      }
    }

    setupCall();

    return () => {
      if (streamInstance) {
        streamInstance.getTracks().forEach((t) => t.stop());
      }
      pcsRef.current.forEach((pc) => pc.close());
      pcsRef.current.clear();
      if (signalingClientRef.current) {
        signalingClientRef.current.close();
      }
    };
  }, [code, participantId]);

  // Helper: Get existing or create new RTCPeerConnection for a remote peer
  const getOrCreatePeerConnection = (
    targetPeerId: string,
    targetDisplayName: string,
    currentLocalStream: MediaStream | null
  ): RTCPeerConnection => {
    if (pcsRef.current.has(targetPeerId)) {
      return pcsRef.current.get(targetPeerId)!;
    }

    const pc = createPeerConnection(
      targetPeerId,
      currentLocalStream,
      (candidate) => {
        signalingClientRef.current?.send("ice-candidate", targetPeerId, { candidate });
      },
      (incomingStream) => {
        setRemotePeers((prev) => {
          const filtered = prev.filter((p) => p.peerId !== targetPeerId);
          return [
            ...filtered,
            {
              peerId: targetPeerId,
              displayName: targetDisplayName || "Participant",
              stream: incomingStream,
            },
          ];
        });
      }
    );

    pcsRef.current.set(targetPeerId, pc);
    return pc;
  };

  // 3. WebRTC Signaling Message Handler (including Host Controls)
  const handleSignalingMessage = async (msg: SignalingMessage, currentLocalStream: MediaStream | null) => {
    const { type, from, to, payload } = msg;

    if (from === participantId) return;

    const peerName = payload?.displayName || "Participant";

    switch (type) {
      case "join": {
        console.log(`[Mesh WebRTC] Peer '${from}' (${peerName}) joined room. Creating offer...`);
        const pc = getOrCreatePeerConnection(from, peerName, currentLocalStream);

        // Only create offer if we are in stable state
        if (pc.signalingState === "stable") {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          signalingClientRef.current?.send("offer", from, {
            sdp: offer,
            displayName: name,
          });
        }
        break;
      }

      case "offer": {
        console.log(`[Mesh WebRTC] Received offer from '${from}' (${peerName}). Creating answer...`);
        const pc = getOrCreatePeerConnection(from, peerName, currentLocalStream);

        // Guard against SDP glare / wrong signaling state
        if (pc.signalingState === "stable" || pc.signalingState === "have-local-offer") {
          if (pc.signalingState === "have-local-offer") {
            // Rollback local offer if we have an offer collision
            await pc.setLocalDescription({ type: "rollback" });
          }
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          signalingClientRef.current?.send("answer", from, {
            sdp: answer,
            displayName: name,
          });
        }
        break;
      }

      case "answer": {
        const pc = pcsRef.current.get(from);
        if (pc && pc.signalingState === "have-local-offer") {
          console.log(`[Mesh WebRTC] Received answer from '${from}'. Setting remote description...`);
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        }
        break;
      }

      case "ice-candidate": {
        const pc = pcsRef.current.get(from);
        if (pc && payload.candidate) {
          try {
            if (pc.remoteDescription && pc.remoteDescription.type) {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            }
          } catch (e) {
            console.error("Error adding ICE candidate:", e);
          }
        }
        break;
      }

      case "leave": {
        console.log(`[Mesh WebRTC] Peer '${from}' left room.`);
        const pc = pcsRef.current.get(from);
        if (pc) {
          pc.close();
          pcsRef.current.delete(from);
        }
        setRemotePeers((prev) => prev.filter((p) => p.peerId !== from));
        break;
      }

      // -----------------------------------------------------------------------
      // HOST CONTROL SIGNAL HANDLERS
      // -----------------------------------------------------------------------
      case "mute-all": {
        console.log("[Host Control] Host requested Mute All.");
        if (currentLocalStream) {
          currentLocalStream.getAudioTracks().forEach((t) => (t.enabled = false));
        }
        setIsMuted(true);
        alert("The meeting host has muted all participants.");
        break;
      }

      case "kick-participant": {
        if (to === participantId) {
          alert("You have been removed from the meeting by the host.");
          handleLeaveCall();
        }
        break;
      }

      case "end-meeting": {
        alert("The host has ended the meeting for all participants.");
        handleLeaveCall();
        break;
      }
    }
  };

  // Toggle Audio
  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
    }
    setIsMuted(!isMuted);
  };

  // Toggle Video
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOff;
      });
    }
    setIsVideoOff(!isVideoOff);
  };

  // Host Action: Mute All Participants
  const handleMuteAll = () => {
    if (!isHost) return;
    signalingClientRef.current?.send("mute-all", null);
  };

  // Host Action: Remove Specific Participant
  const handleRemoveParticipant = async (peerId: string) => {
    if (!isHost) return;
    try {
      signalingClientRef.current?.send("kick-participant", peerId);
      const pc = pcsRef.current.get(peerId);
      if (pc) {
        pc.close();
        pcsRef.current.delete(peerId);
      }
      setRemotePeers((prev) => prev.filter((p) => p.peerId !== peerId));
    } catch (err) {
      console.error("Failed to remove participant:", err);
    }
  };

  // Host Action: End Meeting for All
  const handleEndMeetingForAll = async () => {
    if (!isHost) return;
    try {
      await api.endMeeting(code);
      signalingClientRef.current?.send("end-meeting", null);
      handleLeaveCall();
    } catch (err) {
      console.error("Error ending meeting:", err);
      handleLeaveCall();
    }
  };

  // Leave Call
  const handleLeaveCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    pcsRef.current.forEach((pc) => pc.close());
    pcsRef.current.clear();
    if (signalingClientRef.current) {
      signalingClientRef.current.close();
    }
    router.push("/");
  };

  const totalCount = 1 + remotePeers.length;
  const gridColsClass =
    totalCount === 1
      ? "grid-cols-1 max-w-4xl"
      : totalCount === 2
      ? "grid-cols-1 md:grid-cols-2 max-w-6xl"
      : totalCount <= 4
      ? "grid-cols-1 md:grid-cols-2 max-w-6xl"
      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-7xl";

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col h-screen overflow-hidden relative">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-zinc-900 border-b border-zinc-800 z-10">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-sm">{meeting ? meeting.title : "Meeting Room"}</h1>
            <p className="text-xs text-zinc-400">
              Code: <code className="text-blue-400 font-mono">{code}</code>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isHost && (
            <span className="text-xs px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full font-medium border border-amber-500/20 flex items-center space-x-1">
              <Crown className="w-3.5 h-3.5" />
              <span>Host</span>
            </span>
          )}
          <span className="text-xs px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full font-medium border border-emerald-500/20">
            Mesh Call ({totalCount} Active)
          </span>
        </div>
      </header>

      {/* Main Grid Area & Slide-over Participants Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 p-6 flex items-center justify-center bg-zinc-950 overflow-y-auto">
          <div className={`grid ${gridColsClass} gap-6 w-full items-center justify-center`}>
            {/* Local Video Tile */}
            <div className="relative w-full h-full min-h-[260px] bg-zinc-900 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden flex items-center justify-center">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transform -scale-x-100 ${
                  isVideoOff ? "hidden" : "block"
                }`}
              />

              {isVideoOff && (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold text-white shadow-xl">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-zinc-400 text-xs font-medium">Camera turned off</span>
                </div>
              )}

              <div className="absolute bottom-4 left-4 bg-zinc-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-zinc-800 text-xs font-medium flex items-center space-x-2">
                <span>{name} (You)</span>
                {isMuted ? (
                  <MicOff className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </div>
            </div>

            {/* Remote Peer Video Tiles */}
            {remotePeers.map((peer) => (
              <RemoteVideoTile key={peer.peerId} peer={peer} />
            ))}
          </div>
        </div>

        {/* Slide-Over Participants Drawer */}
        {isParticipantsOpen && (
          <aside className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col z-20 shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h2 className="font-semibold text-sm">Participants ({totalCount})</h2>
              </div>
              <button
                onClick={() => setIsParticipantsOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Host Global Controls */}
            {isHost && (
              <div className="p-4 border-b border-zinc-800/80 bg-zinc-950/50 space-y-2">
                <button
                  onClick={handleMuteAll}
                  className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-xl transition-colors flex items-center justify-center space-x-2"
                >
                  <VolumeX className="w-4 h-4 text-amber-400" />
                  <span>Mute All Participants</span>
                </button>
              </div>
            )}

            {/* Participant List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* You (Local) */}
              <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-xs font-medium text-white">{name} (Me)</span>
                    {isHost && <span className="text-[10px] block text-amber-400 font-semibold">Host</span>}
                  </div>
                </div>
                {isMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
              </div>

              {/* Remote Peers */}
              {remotePeers.map((peer) => (
                <div
                  key={peer.peerId}
                  className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                      {peer.displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-white">{peer.displayName}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Mic className="w-4 h-4 text-emerald-400" />
                    {isHost && (
                      <button
                        onClick={() => handleRemoveParticipant(peer.peerId)}
                        className="p-1 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Remove participant"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* Control Bar */}
      <footer className="px-6 py-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleAudio}
            className={`p-3.5 rounded-2xl transition-all flex items-center space-x-2 ${
              isMuted
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span className="text-xs font-medium hidden sm:inline">
              {isMuted ? "Unmute" : "Mute"}
            </span>
          </button>

          <button
            onClick={toggleVideo}
            className={`p-3.5 rounded-2xl transition-all flex items-center space-x-2 ${
              isVideoOff
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            }`}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            <span className="text-xs font-medium hidden sm:inline">
              {isVideoOff ? "Start Video" : "Stop Video"}
            </span>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsParticipantsOpen(!isParticipantsOpen)}
            className={`p-3.5 rounded-2xl transition-colors flex items-center space-x-1.5 ${
              isParticipantsOpen
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-xs font-medium">{totalCount}</span>
          </button>

          <button className="p-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl transition-colors">
            <MessageSquare className="w-5 h-5" />
          </button>

          {isHost ? (
            <button
              onClick={handleEndMeetingForAll}
              className="px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-2xl shadow-lg transition-all flex items-center space-x-2"
            >
              <PhoneOff className="w-5 h-5" />
              <span className="text-sm font-medium">End Meeting for All</span>
            </button>
          ) : (
            <button
              onClick={handleLeaveCall}
              className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-2xl shadow-lg transition-all flex items-center space-x-2"
            >
              <PhoneOff className="w-5 h-5" />
              <span className="text-sm font-medium">Leave</span>
            </button>
          )}
        </div>
      </footer>
    </main>
  );
}
