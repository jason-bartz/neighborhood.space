import React, { useState, useEffect } from 'react';
import CommunityShowcase from './components/CommunityShowcase';
import './App.css';

const StandaloneShowcasePage = () => {
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const dateString = now.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      setCurrentTime(timeString);
      setCurrentDate(dateString);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh',
      width: '100%',
      margin: 0,
      padding: 0,
      fontFamily: '"Comic Sans MS", "Chalkboard SE", "Comic Neue", sans-serif'
    }}>
      {/* Taskbar */}
      <div className="taskbar">
        <div className="taskbar-left">
          <img src="/favicon.png" alt="GNF icon" className="taskbar-icon" />
          <span>NeighborhoodOS</span>
        </div>
        <div className="taskbar-right">
          <span className="retro-clock">{currentTime} {currentDate} 2002</span>
        </div>
      </div>
      
      {/* Add padding to account for fixed taskbar */}
      <div style={{ paddingTop: '40px' }}>
        <CommunityShowcase />
      </div>
    </div>
  );
};

export default StandaloneShowcasePage;