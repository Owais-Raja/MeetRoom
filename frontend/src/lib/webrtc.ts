/**
 * WebRTC Configuration using public STUN servers for NAT Traversal.
 * Note: STUN works for standard home/office networks; production setups for strict NATs use TURN servers.
 */
export const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
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

  // 1. Add local media tracks (Audio + Video) to the Peer Connection
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
    const stream = event.streams[0] || new MediaStream([event.track]);
    onRemoteStream(stream);
  };

  return pc;
}

