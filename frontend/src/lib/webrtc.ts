/**
 * WebRTC Configuration using public STUN servers for NAT Traversal.
 * STUN servers assist peers in discovering public IP addresses across home, mobile, and office networks.
 */
export const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" },
  ],
  iceCandidatePoolSize: 10,
};

/**
 * Creates and configures a new RTCPeerConnection instance for a remote peer.
 * 
 * @param peerId Unique participant ID of the remote peer.
 * @param localStream Local MediaStream containing camera and microphone tracks.
 * @param onIceCandidate Callback fired when local ICE candidates are discovered.
 * @param onRemoteStream Callback fired when remote audio/video tracks arrive.
 */
export function createPeerConnection(
  peerId: string,
  localStream: MediaStream | null,
  onIceCandidate: (candidate: RTCIceCandidate) => void,
  onRemoteStream: (stream: MediaStream) => void
): RTCPeerConnection {
  const pc = new RTCPeerConnection(RTC_CONFIGURATION);
  const remoteMediaStream = new MediaStream();

  // 1. Add all active local media tracks (Audio + Video) to the Peer Connection
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });
  }

  // 2. Handle local ICE candidate discovery -> send via signaling server
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      onIceCandidate(event.candidate);
    }
  };

  // 3. Handle incoming remote media tracks -> attach to remote video/audio elements
  pc.ontrack = (event) => {
    console.log(`[WebRTC] Received remote track '${event.track.kind}' from peer '${peerId}'`);
    
    // Add incoming track to the dedicated remote MediaStream
    if (event.streams && event.streams[0]) {
      event.streams[0].getTracks().forEach((track) => {
        if (!remoteMediaStream.getTracks().some((t) => t.id === track.id)) {
          remoteMediaStream.addTrack(track);
        }
      });
    } else if (event.track) {
      if (!remoteMediaStream.getTracks().some((t) => t.id === event.track.id)) {
        remoteMediaStream.addTrack(event.track);
      }
    }

    // Pass a fresh MediaStream instance wrapping all tracks so React detects state update
    onRemoteStream(new MediaStream(remoteMediaStream.getTracks()));
  };

  return pc;
}
