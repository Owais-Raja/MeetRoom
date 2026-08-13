import { api } from "./api";

// STUN can establish a direct call on permissive networks. TURN credentials
// fetched from the backend are added for networks where direct media is blocked.
const STUN_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
];

export async function getIceConfiguration(): Promise<RTCConfiguration> {
  try {
    const { iceServers } = await api.getTurnIceServers();
    console.info("[WebRTC] Loaded temporary TURN credentials.");
    return {
      iceServers: [...STUN_SERVERS, ...iceServers],
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
    };
  } catch (error) {
    // The call can still work on a LAN, but the explicit error makes a missing
    // production TURN configuration diagnosable instead of silently failing.
    console.error("[WebRTC] TURN credentials unavailable; cross-network calls cannot connect.", error);
    return { iceServers: STUN_SERVERS, bundlePolicy: "max-bundle", rtcpMuxPolicy: "require" };
  }
}

/** Creates one media connection to a remote meeting participant. */
export function createPeerConnection(
  peerId: string,
  localStream: MediaStream | null,
  configuration: RTCConfiguration,
  onIceCandidate: (candidate: RTCIceCandidate) => void,
  onRemoteStream: (stream: MediaStream) => void
): RTCPeerConnection {
  const pc = new RTCPeerConnection(configuration);
  const remoteStream = new MediaStream();

  localStream?.getTracks().forEach((track) => pc.addTrack(track, localStream));

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.debug(`[WebRTC ICE] ${peerId}: ${event.candidate.type}/${event.candidate.protocol}`);
      onIceCandidate(event.candidate);
    }
  };

  pc.onicecandidateerror = (event) => {
    console.warn(`[WebRTC ICE] Server ${event.url} failed (${event.errorCode}).`);
  };

  pc.oniceconnectionstatechange = () => {
    console.log(`[WebRTC ICE State] Peer '${peerId}': ${pc.iceConnectionState}`);
  };

  pc.ontrack = (event) => {
    const tracks = event.streams[0]?.getTracks() || [event.track];
    tracks.forEach((track) => {
      if (!remoteStream.getTracks().some((existing) => existing.id === track.id)) {
        remoteStream.addTrack(track);
      }
    });
    onRemoteStream(new MediaStream(remoteStream.getTracks()));
  };

  return pc;
}
