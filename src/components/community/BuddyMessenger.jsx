// BuddyMessenger.jsx
import React, { useState, useEffect, useRef } from "react";
import { collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { containsProfanity } from "../../data/profanityList";
import { isQuestion, BOT_USERNAME } from "../../data/chatBot";
import "./BuddyMessenger.css";

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
  const [botTyping, setBotTyping] = useState(false);
  const messageEndRef = useRef(null);
  const hasScrolledInitially = useRef(false);
  const botWaitDeadlineRef = useRef(0);
  const botTypingTimeoutRef = useRef(null);

  const CHARACTER_LIMIT = 140;

  useEffect(() => {
    let sessionUsername = sessionStorage.getItem("username");
    if (!sessionUsername) {
      sessionUsername = generateUsername();
      sessionStorage.setItem("username", sessionUsername);
    }
    setUsername(sessionUsername);

    const q = query(collection(db, "guestMessages"), orderBy("timestamp", "desc"), limit(50));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const messageList = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (!data.color && !data.isBot) {
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
          const ordered = messageList.reverse();
          // Hide the typing indicator as soon as a bot reply newer than the
          // user's submit lands in the snapshot.
          if (botWaitDeadlineRef.current > 0) {
            const fresh = ordered.find((m) => {
              if (!m.isBot) return false;
              const ts = m.timestamp && m.timestamp.toDate ? m.timestamp.toDate().getTime() : 0;
              return ts >= botWaitDeadlineRef.current - 60000; // small clock-skew buffer
            });
            if (fresh) {
              botWaitDeadlineRef.current = 0;
              setBotTyping(false);
              if (botTypingTimeoutRef.current) {
                clearTimeout(botTypingTimeoutRef.current);
                botTypingTimeoutRef.current = null;
              }
            }
          }
          setMessages(ordered);
        }
      },
      (error) => {
        console.error("Error subscribing to messages:", error);
        setMessages([
          { username: "bigdude09", text: "Lets goo!", color: "#3b5998", timestamp: new Date() },
          { username: "beachgurXX", text: "This is awesome 😎", color: "#2ecc71", timestamp: new Date() },
        ]);
      },
    );

    return () => {
      unsubscribe();
      if (botTypingTimeoutRef.current) clearTimeout(botTypingTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (messages.length === 0 && !botTyping) return;
    const behavior = hasScrolledInitially.current ? "smooth" : "auto";
    messageEndRef.current?.scrollIntoView({ behavior, block: "end" });
    hasScrolledInitially.current = true;
  }, [messages, botTyping]);

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
    setCharCount(e.target.value.length);
    setError("");
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

      await addDoc(collection(db, "guestMessages"), {
        text: message,
        username: username,
        timestamp: serverTimestamp(),
        color: messageColor
      });

      if (isQuestion(message)) {
        botWaitDeadlineRef.current = Date.now();
        setBotTyping(true);
        if (botTypingTimeoutRef.current) clearTimeout(botTypingTimeoutRef.current);
        botTypingTimeoutRef.current = setTimeout(() => {
          setBotTyping(false);
          botWaitDeadlineRef.current = 0;
          botTypingTimeoutRef.current = null;
        }, 20000);
      }

      const imSound = document.getElementById("im-sound");
      if (imSound) {
        imSound.volume = 0.5;
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
    return `${month}/${day}`;
  };

  return (
    <div onClick={handleWindowClick}>
      <div className="message-window">
        {messages.map((msg, index) => (
          <div key={msg.id || index} className={`message-item${msg.isBot ? " message-item--bot" : ""}`}>
            {msg.isBot && <span className="message-mod-tag">[MOD]</span>}
            <span
              className={`message-username${msg.isBot ? " message-username--bot" : ""}`}
              style={msg.isBot ? undefined : { color: msg.color || "var(--mb-ink)" }}
            >
              {msg.username}:
            </span>
            <span className="message-text">{" " + msg.text}</span>
            <span className="message-timestamp">
              [{formatTimestamp(msg.timestamp)}]
            </span>
          </div>
        ))}
        {botTyping && (
          <div className="message-item message-item--bot">
            <span className="message-mod-tag">[MOD]</span>
            <span className="message-username message-username--bot">
              {BOT_USERNAME}:
            </span>
            <span className="message-text typing-indicator">
              {" typing"}
              <span className="typing-dot">.</span>
              <span className="typing-dot">.</span>
              <span className="typing-dot">.</span>
            </span>
          </div>
        )}
        <div ref={messageEndRef} />
      </div>

      <audio id="im-sound" src="/sounds/im.mp3" preload="auto" />


      <div className="message-input-area">
        <textarea
          value={message}
          onChange={handleMessageChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Leave us a message, (PS These are public.)"
          maxLength={CHARACTER_LIMIT}
          aria-label="Chat message"
          className={`message-textarea ${charCount >= CHARACTER_LIMIT ? "char-limit" : charCount >= CHARACTER_LIMIT - 20 ? "char-warn" : ""}`}
        />
      </div>

      <div className="message-footer">
        <div
          className={`char-counter ${charCount >= CHARACTER_LIMIT ? "char-limit" : charCount >= CHARACTER_LIMIT - 20 ? "char-warn" : ""}`}
          aria-live="polite"
        >
          {CHARACTER_LIMIT - charCount} characters left
        </div>
        {error && <div className="error-message" role="alert">{error}</div>}
        <button
          type="button"
          onClick={handleSubmit}
          className="send-button win95-btn win95-btn-primary"
          disabled={!message.trim() || charCount > CHARACTER_LIMIT}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default BuddyMessenger;