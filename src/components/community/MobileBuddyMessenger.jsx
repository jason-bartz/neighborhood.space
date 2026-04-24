// MobileBuddyMessenger.jsx
import React, { useState, useEffect, useRef } from "react";
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig";

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

const MobileBuddyMessenger = ({ onClose }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [error, setError] = useState("");
  const messageEndRef = useRef(null);
  const hasScrolledInitially = useRef(false);

  const CHARACTER_LIMIT = 140;

  useEffect(() => {
    // No sound effects on mobile
    
    let sessionUsername = sessionStorage.getItem("username");
    if (!sessionUsername) {
      sessionUsername = generateUsername();
      sessionStorage.setItem("username", sessionUsername);
    }
    setUsername(sessionUsername);
    fetchMessages();
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    const behavior = hasScrolledInitially.current ? "smooth" : "auto";
    messageEndRef.current?.scrollIntoView({ behavior, block: "end" });
    hasScrolledInitially.current = true;
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

      // No sound effects on mobile

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
    <div 
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 2000
      }}
      onClick={onClose}
    >
      {/* No audio elements on mobile */}

      <div
        style={{
          width: "90%",
          maxWidth: "400px",
          background: "var(--mb-chalk)",
          overflow: "hidden",
          border: "2px solid var(--mb-ink)",
          boxShadow: "var(--shadow-hard-lg)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--font-content)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Chat title bar — ink + pixel font to match Navigator theme */}
        <div
          style={{
            background: "var(--mb-ink)",
            color: "var(--mb-chalk)",
            padding: "6px 10px",
            minHeight: "28px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "var(--font-pixel)",
            fontSize: "11px",
            letterSpacing: "0.04em",
            userSelect: "none",
            borderBottom: "1px solid rgba(255,255,255,0.1)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <img
              src="/assets/BuddyMessenger-icon.webp"
              alt=""
              aria-hidden="true"
              style={{ height: "14px", width: "14px" }}
            />
            <span>Buddy Messenger</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close window"
            style={{
              background: "var(--mb-magenta)",
              border: "1px solid var(--mb-chalk)",
              color: "var(--mb-chalk)",
              cursor: "pointer",
              padding: "0",
              fontSize: "12px",
              width: "20px",
              height: "20px",
              lineHeight: "1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-content)"
            }}
          >
            ✕
          </button>
        </div>

        {/* Message window */}
        <div
          style={{
            background: "var(--mb-paper)",
            border: "2px solid var(--mb-ink)",
            height: "250px",
            overflowY: "auto",
            overscrollBehavior: "contain",
            padding: "8px",
            fontSize: "12px",
            margin: "8px",
            color: "var(--mb-ink)"
          }}
        >
          {messages.map((msg, index) => (
            <div key={index} style={{ marginBottom: "6px", display: "flex", flexWrap: "wrap" }}>
              <span style={{ color: msg.color || "var(--mb-ink)", fontWeight: "bold" }}>
                {msg.username}:
              </span>
              <span style={{ marginLeft: "4px", wordBreak: "break-word", flex: "1" }}>
                {msg.text}
              </span>
              <span style={{ marginLeft: "8px", color: "var(--mb-ink-60)", fontSize: "10px" }}>
                [{formatTimestamp(msg.timestamp)}]
              </span>
            </div>
          ))}
          <div ref={messageEndRef} />
        </div>

        {/* Message input area */}
        <div style={{ padding: "0 8px 5px 8px" }}>
          <textarea
            value={message}
            onChange={handleMessageChange}
            placeholder="Leave us a message, (PS These are public.)"
            maxLength={CHARACTER_LIMIT}
            style={{
              width: "100%",
              height: "60px",
              border: "2px solid var(--mb-ink)",
              padding: "6px",
              fontSize: "12px",
              fontFamily: "var(--font-content)",
              resize: "none",
              boxSizing: "border-box",
              marginBottom: "5px",
              background: "var(--mb-chalk)",
              color: "var(--mb-ink)"
            }}
          />
        </div>

        {/* Message footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 8px 10px 8px",
            fontSize: "12px"
          }}
        >
          <div style={{ color: "var(--mb-ink-60)" }}>
            {CHARACTER_LIMIT - charCount} characters left
          </div>
          {error && (
            <div style={{ color: "var(--mb-magenta-deep)", textAlign: "center", flexGrow: 1, padding: "0 10px", fontWeight: "bold" }}>
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            style={{
              background: "var(--mb-magenta)",
              border: "2px solid var(--mb-ink)",
              boxShadow: "var(--shadow-hard-sm)",
              color: "var(--mb-chalk)",
              padding: "6px 16px",
              fontSize: "13px",
              fontWeight: "bold",
              cursor: "pointer",
              fontFamily: "var(--font-content)"
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileBuddyMessenger;