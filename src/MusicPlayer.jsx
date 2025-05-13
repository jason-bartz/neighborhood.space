import React, { useState, useRef, useEffect } from "react";
import Draggable from "react-draggable";
import "./App.css"; 

// Add CSS for the scrolling text animation
const scrollingTextStyle = `
@keyframes scroll-text {
  0% { transform: translateX(0); }
  100% { transform: translateX(-100%); }
}

.scrolling-text {
  will-change: transform;
  transform: translateX(0);
}
`;

const playlist = [
  { title: "Neighbors", artist: "Fluidaw", url: "/music/Neighbors.mp3", artwork: "/assets/album-covers/Neighbors.webp" },
  { title: "Lofi Good Neighbor", artist: "Honshu Lo fi Studio", url: "/music/Lofi-Good-Neighbor.mp3", artwork: "/assets/album-covers/Lofi-Good-Neighbor.webp" },
  { title: "Neighborhood Street", artist: "Chillin Lofi", url: "/music/Neighborhood-Street.mp3", artwork: "/assets/album-covers/Neighborhood-Street.webp" },
  { title: "Best Neighbors", artist: "yourneighborsclassicbeats & Mike Beating", url: "/music/BestNeighbors.mp3", artwork: "/assets/album-covers/BestNeighbors.webp" },
  { title: "Meeting the New Neighbors", artist: "LoFi Robot", url: "/music/MeetingTheNewNeighbors.mp3", artwork: "/assets/album-covers/MeetingTheNewNeighbors.webp" }
];

export default function MusicPlayer({ onClose, zIndex = 999, windowId, bringToFront }) {
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const audioRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      const playerWidth = 280; // Updated to match our new width
      const playerHeight = 240; // Approximate height with larger album art
      
      // CUSTOMIZE THESE VALUES TO CHANGE POSITION:
      // For bottom-right (current):
      const paddingRight = 200;
      const paddingBottom = 120;
      const x = window.innerWidth - playerWidth - paddingRight;
      const y = window.innerHeight - playerHeight - paddingBottom;
      
      // For center of screen, uncomment these:
      // const x = (window.innerWidth - playerWidth) / 2;
      // const y = (window.innerHeight - playerHeight) / 2;
      
      // For top-left, uncomment these:
      // const x = 50; // 50px from left
      // const y = 80; // 80px from top (below taskbar)
      
      setPosition({ x: Math.max(0, x), y: Math.max(0, y) });
    });
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => playNext();

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentTrack]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.load();
    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    }
  }, [currentTrack, isPlaying]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const playNext = () => setCurrentTrack((prev) => (prev + 1) % playlist.length);
  const playPrev = () => setCurrentTrack((prev) => (prev - 1 + playlist.length) % playlist.length);
  const formatTime = (seconds) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const handleClick = () => {
    if (bringToFront && windowId) {
      bringToFront(windowId);
    }
  };

  return (
    <div style={{ position: "absolute", left: position.x, top: position.y, zIndex: zIndex }}onClick={handleClick}>
      {/* Add the style tag for scrolling animation */}
      <style>{scrollingTextStyle}</style>
      <Draggable handle=".music-title-bar">
        <div className="music-window" style={{ width: "280px" }}>
          <div className="music-title-bar">
            <span>💿 GNF Mixtape</span>
            <button onClick={onClose} title="Close Player">✖</button>
          </div>
          <div className="music-body" style={{ padding: "15px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* Album artwork centered */}
            <div style={{ 
              marginBottom: "12px",
              width: "120px", 
              height: "120px"
            }}>
              <img 
                src={playlist[currentTrack].artwork} 
                alt="Album Cover" 
                style={{ 
                  width: "100%", 
                  height: "100%", 
                  objectFit: "cover",
                  borderRadius: "6px",
                  border: "1px solid #c56dcb",
                  boxShadow: "0 3px 6px rgba(0,0,0,0.1)"
                }} 
              />
            </div>
            
            {/* Track info centered below artwork */}
            <div className="track-info" style={{ 
              textAlign: "center",
              marginBottom: "12px",
              width: "90%"
            }}>
              <div style={{ 
                fontWeight: "bold", 
                fontSize: "14px",
                marginBottom: "4px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                position: "relative",
                height: "20px" // Fixed height to contain scrolling text
              }}>
                <div className={playlist[currentTrack].title.length > 20 ? "scrolling-text" : ""}
                     style={{ 
                       display: "inline-block",
                       paddingLeft: playlist[currentTrack].title.length > 20 ? "100%" : "0",
                       paddingRight: playlist[currentTrack].title.length > 20 ? "100%" : "0",
                       animation: playlist[currentTrack].title.length > 20 ? 
                                  "scroll-text 15s linear infinite" : "none"
                     }}>
                  {playlist[currentTrack].title}
                </div>
              </div>
              <div style={{ 
                fontSize: "13px",
                color: "#6c2c6c",
                whiteSpace: "nowrap",
                overflow: "hidden",
                position: "relative",
                height: "18px" // Fixed height to contain scrolling text
              }}>
                <div className={playlist[currentTrack].artist.length > 20 ? "scrolling-text" : ""}
                     style={{ 
                       display: "inline-block",
                       paddingLeft: playlist[currentTrack].artist.length > 20 ? "100%" : "0",
                       paddingRight: playlist[currentTrack].artist.length > 20 ? "100%" : "0",
                       animation: playlist[currentTrack].artist.length > 20 ? 
                                  "scroll-text 15s linear infinite" : "none"
                     }}>
                  {playlist[currentTrack].artist}
                </div>
              </div>
            </div>
            <div className="controls">
              <button onClick={playPrev}>⏮</button>
              <button onClick={togglePlay}>{isPlaying ? "⏸" : "▶"}</button>
              <button onClick={playNext}>⏭</button>
            </div>
            <div className="time-display">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
          <audio ref={audioRef} src={playlist[currentTrack].url} preload="metadata" />
        </div>
      </Draggable>
    </div>
  );
}