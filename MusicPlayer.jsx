// MusicPlayer.jsx (with autoplay logging)
import React, { useState, useRef, useEffect } from "react";
import Draggable from "react-draggable";
import "./App.css"; // Assuming your styles are here

const playlist = [
  { title: "Neighbors", artist: "Fluidaw", url: "/music/Neighbors.mp3" },
  { title: "Lofi Mononoke", artist: "Honshu Lo fi Studio", url: "/music/Lofi-Good-Neighbor.mp3" },
  { title: "Neighborhood Street", artist: "Chillen Loft", url: "/music/Neighborhood-Street.mp3" }
];

export default function MusicPlayer({ onClose }) {
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hasAttemptedAutoPlay, setHasAttemptedAutoPlay] = useState(false);
  const audioRef = useRef(null);

  // Set initial window position
  useEffect(() => {
    requestAnimationFrame(() => {
      const playerWidth = 260; const playerHeight = 210;
      const paddingRight = 200; const paddingBottom = 60;
      const x = window.innerWidth - playerWidth - paddingRight;
      const y = window.innerHeight - playerHeight - paddingBottom;
      setPosition({ x: Math.max(0, x), y: Math.max(0, y) }); // Ensure not off-screen initially
    });
  }, []);

  // One-time autoplay after first user interaction anywhere
  useEffect(() => {
    const handleFirstClick = () => {
      if (hasAttemptedAutoPlay || !audioRef.current) return;
      console.log("MusicPlayer: First click detected, attempting autoplay...");
      setHasAttemptedAutoPlay(true); // Attempt only once

      const audio = audioRef.current;
      audio.play()
        .then(() => {
            console.log("MusicPlayer: Autoplay successful!");
            setIsPlaying(true);
        })
        .catch((error) => {
            // Very common for this to fail due to browser restrictions
            console.warn("MusicPlayer: Autoplay failed (likely browser policy):", error);
            setIsPlaying(false); // Ensure state reflects reality
        });

      // Clean up listener immediately after first attempt
      window.removeEventListener("click", handleFirstClick);
    };

    // Only add listener if we haven't tried autoplay yet
    if (!hasAttemptedAutoPlay) {
        console.log("MusicPlayer: Adding first click listener for autoplay attempt.");
        window.addEventListener("click", handleFirstClick);
    }

    // Cleanup function
    return () => {
        // console.log("MusicPlayer: Cleaning up first click listener.");
        window.removeEventListener("click", handleFirstClick);
    }
  }, [hasAttemptedAutoPlay]); // Depend only on hasAttemptedAutoPlay

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => playNext(); // Auto-play next track

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack]); // Re-attach if track changes

  // Load new track source when currentTrack changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.load(); // Reload source
    if (isPlaying) {
      // Attempt to play new track if player was already playing
      audio.play().catch((error) => {
          console.warn("MusicPlayer: Failed to play after track change:", error);
          setIsPlaying(false); // Update state if play fails
      });
    }
  }, [currentTrack, isPlaying]); // Also depend on isPlaying

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch((error) => {
            console.warn("MusicPlayer: Play failed on toggle:", error);
            setIsPlaying(false);
        });
    }
  };

  const playNext = () => setCurrentTrack((prev) => (prev + 1) % playlist.length);
  const playPrev = () => setCurrentTrack((prev) => (prev - 1 + playlist.length) % playlist.length);

  const formatTime = (seconds) => { /* ... (no change) ... */ if (isNaN(seconds)) return "0:00"; const mins = Math.floor(seconds / 60); const secs = Math.floor(seconds % 60).toString().padStart(2, "0"); return `${mins}:${secs}`; };

  return (
    // Position is handled by the wrapper div + state
    <div style={{ position: "absolute", left: position.x, top: position.y, zIndex: 999 }}>
      <Draggable handle=".music-title-bar">
        <div className="music-window">
          <div className="music-title-bar">
            <span>🎵 Neighborhood Radio FM</span>
            <button onClick={onClose} title="Close Player">✖</button>
          </div>
          <div className="music-body">
            <div className="track-info"> <strong>{playlist[currentTrack].title}</strong> <div>{playlist[currentTrack].artist}</div> </div>
            <div className="waveform-container"> <div className={`waveform ${isPlaying ? "active" : ""}`}> {[...Array(14)].map((_, i) => ( <div key={i} className={`bar bar${(i % 4) + 1}`} /> ))} </div> </div>
            <div className="controls"> <button onClick={playPrev}>⏮</button> <button onClick={togglePlay}>{isPlaying ? "⏸" : "▶️"}</button> <button onClick={playNext}>⏭</button> </div>
            <div className="time-display"> {formatTime(currentTime)} / {formatTime(duration)} </div>
          </div>
          <audio ref={audioRef} src={playlist[currentTrack].url} preload="metadata" />
        </div>
      </Draggable>
    </div>
  );
}