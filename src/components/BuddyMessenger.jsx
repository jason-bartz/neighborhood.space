// BuddyMessenger.jsx
import React, { useState, useEffect, useRef } from "react";
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import "./BuddyMessenger.css";

// Profanity filter
const PROFANITY_LIST = [
  "badword1", "badword2", "profanity", "offensive",
];

const COLORS = ["#3b5998", "#2ecc71", "#e74c3c", "#9b59b6", "#f1c40f", "#ff69b4"];

// Random username generator
const generateUsername = () => {
  const base = ["Bestie", "Sk8ter", "BFF", "Gurl", "Boi", "sk8trGurl", "bigBoi", "xxBlinkfan", "SeNsEsFaIl", "Queen", "King", "Rawr", "Xtreme", "Diva", "Angel", "Star", "Cutie",
    "xXPunk", "Scene", "Emo", "TruBlu", "Lil", "Big", "Mister", "Miss", "Mizz", "Hunni", "Snuggle", "Sugar", "Cherry",
    "Glitter", "Princess", "Bad", "HotTopic", "Dark", "Bright", "Cyber", "LoFi", "MallRat", "Dreamy", "iCandy", "HannaMontana", "b4ddie", "BADDIE",
    "Hype", "Krazy", "Funky", "Silent", "NoScope", "Drama", "krunk", "Sassy", "Jelly", "Neon", "Pixel", "Neko", "neo", "ne0petz", "uWu", "Kawaii",
    "Sleepy", "Happy", "SadBoi", "CryBaby", "xxScene", "disturbed", "Vamp", "Lolipop", "Nvrland", "SnowBunni", "Aesthetic",
    "Retro", "Myspace", "Livewire", "Blinkie", "MoodRing", "AwayMsg", "Napster", "LiveJ0urnal", "m4pl3Story", "brighteyes", "dashboard", "Dreamer", "MixTape",
    "PopRox", "HelloKitty", "Tamagotchi", "Furbz", "Slay", "Laggy", "Aimless", "Lurker", "WebcamQueen", "AltBoi"];
  const suffixes = ["4eva", "2kool", "2hot", "luv", "XOXO", "<3", "x3", "99", "hack3r", "01", "luvver", "bby", "666", "420", "1337",
    "_lol", "_omg", "OMGZ", "ROFLc0pter", "xx", "xo", "ily", "_rawr", "_grl", "zzz", "_AFK", "BRB", "IMissU", "T1m3", "xxX",
    "_roxx", "_g2g", "_ttyl", "_emo", "_cutie", "_gurl", "_punkz", "_dreamz", "_vibes", "PLZ", "OMG", "LOL",
    "_btw", "_asl", "_xo", "_jk", "_BRB", "n00b", "L8R", "_bffl", "_<333", "_v4mp", "_cringe",
    "_blinkz", "s0cute", "uWish", "justChillin", "lmao", "_squad", "_182", "_ftp", "_dialUp", "_away", "zzzZZZ", "_bored",];
  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
  return `${rand(base)}${rand(suffixes)}`;
};

const BuddyMessenger = ({ onClose, windowId, zIndex, bringToFront }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [error, setError] = useState("");
  const messageEndRef = useRef(null);

  const CHARACTER_LIMIT = 140;

  useEffect(() => {
    let sessionUsername = sessionStorage.getItem("username");
    if (!sessionUsername) {
      sessionUsername = generateUsername();
      sessionStorage.setItem("username", sessionUsername);
    }
    setUsername(sessionUsername);
    fetchMessages();
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const q = query(collection(db, "guestMessages"), orderBy("timestamp", "desc"), limit(50));
      const querySnapshot = await getDocs(q);
      const messageList = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.color) {
          data.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        }
        messageList.push({ id: doc.id, ...data });
      });

      if (messageList.length === 0) {
        setMessages([
          { username: "bigdude09", text: "Lets goo!", color: "#3b5998", timestamp: new Date() },
          { username: "beachgurXX", text: "This is awesome 😎", color: "#2ecc71", timestamp: new Date() },
        ]);
      } else {
        setMessages(messageList.reverse());
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      setMessages([
        { username: "bigdude09", text: "Lets goo!", color: "#3b5998", timestamp: new Date() },
        { username: "beachgurXX", text: "This is awesome 😎", color: "#2ecc71", timestamp: new Date() },
      ]);
    }
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
    setCharCount(e.target.value.length);
    setError("");
  };

  const containsProfanity = (text) => {
    const lowerText = text.toLowerCase();
    return PROFANITY_LIST.some(word => lowerText.includes(word));
  };

  const handleWindowClick = () => {
    if (windowId && bringToFront) {
      bringToFront(windowId);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim()) {
      setError("Please enter a message.");
      return;
    }
    if (message.length > CHARACTER_LIMIT) {
      setError(`Message too long. Please keep it under ${CHARACTER_LIMIT} characters.`);
      return;
    }
    if (containsProfanity(message)) {
      setError("Your message contains inappropriate language. Please revise it.");
      return;
    }

    try {
      // Reuse last color if same user
      const lastMessage = messages[messages.length - 1];
      const messageColor = (lastMessage && lastMessage.username === username)
        ? lastMessage.color
        : COLORS[Math.floor(Math.random() * COLORS.length)];

      const now = new Date();

      await addDoc(collection(db, "guestMessages"), {
        text: message,
        username: username,
        timestamp: serverTimestamp(),
        color: messageColor
      });

      setMessages([...messages, {
        text: message,
        username: username,
        timestamp: now,
        color: messageColor
      }]);

      const imSound = document.getElementById("im-sound");
      if (imSound) {
        imSound.currentTime = 0;
        imSound.play().catch((e) => console.error("Error playing IM send sound:", e));
      }

      setMessage("");
      setCharCount(0);
      setError("");
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Couldn't send your message. Please try again later.");
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : timestamp;
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${month}/${day}/02`;
  };

  return (
    <div onClick={handleWindowClick}>
      <div className="message-window">
        {messages.map((msg, index) => (
          <div key={index} className="message-item">
            <span className="message-username" style={{ color: msg.color || "#000" }}>
              {msg.username}:
            </span>
            <span className="message-text">{" " + msg.text}</span>
            <span className="message-timestamp" style={{ marginLeft: "8px", color: "#999", fontSize: "10px" }}>
              [{formatTimestamp(msg.timestamp)}]
            </span>
          </div>
        ))}
        <div ref={messageEndRef} />
      </div>

      <audio id="im-sound" src="/sounds/im.mp3" preload="auto" />


      <div className="message-input-area">
        <textarea
          value={message}
          onChange={handleMessageChange}
          placeholder="Leave a message, a tool rec, or your best idea! (These messages are public 😉)"
          maxLength={CHARACTER_LIMIT}
          className="message-textarea"
        />
      </div>

      <div className="message-footer">
        <div className="char-counter">
          {CHARACTER_LIMIT - charCount} characters left
        </div>
        {error && <div className="error-message">{error}</div>}
        <button type="button" onClick={handleSubmit} className="send-button">
          Send
        </button>
      </div>
    </div>
  );
};

export default BuddyMessenger;