import React, { useState } from "react";
import RetroWindow from "./RetroWindow";

export default function BrowserWindow({ onClose, onPitchClick }) {
const [history, setHistory] = useState(["home"]);
const [historyIndex, setHistoryIndex] = useState(0);

const currentPage = history[historyIndex];

const setPage = (page) => {
const newHistory = [...history.slice(0, historyIndex + 1), page];
setHistory(newHistory);
setHistoryIndex(newHistory.length - 1);
};

const goBack = () => {
if (historyIndex > 0) setHistoryIndex(historyIndex - 1);
};

const goForward = () => {
if (historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1);
};

const renderPage = () => {
switch (currentPage) {
case "home":
return <HomePage onPitchClick={onPitchClick} />;
case "chapters":
return <ChaptersPage setPage={setPage} />; // ✅ not setCurrentPage
case "wny":
return <WnyChapterPage />;
case "denver":
return <DenverChapterPage />;
case "donate":
return <DonatePage />;
default:
return <HomePage onPitchClick={onPitchClick} />;
}
};

return (
<RetroWindow
title={
  <div style={{ display: "flex", alignItems: "center" }}>
    <img 
      src="/assets/icon-browser.png" 
      alt="Browser Icon" 
      style={{ height: "16px", marginRight: "8px" }} 
    />
    Neighborhood Navigator
  </div>
}
onClose={onClose}
width="60%"
height="auto"
style={{
minWidth: "700px",
maxHeight: "calc(100vh - 120px)", // keeps space top and bottom
margin: "60px auto", // centers vertically with margin
display: "flex",
flexDirection: "column"
}}
>
<div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
{/* Menu Bar */}
<div style={{ display: "flex", gap: "16px", padding: "4px 12px", backgroundColor: "#e0e0e0", borderBottom: "1px solid #888", fontSize: "12px", fontFamily: "monospace" }}>
<span>File</span><span>Edit</span><span>View</span><span>Go</span><span>Window</span><span>Help</span>
</div>
{/* Browser Controls */}
<div style={{ background: "#c0c0c0", padding: "5px 10px", display: "flex", gap: "8px", alignItems: "center", borderBottom: "1px solid #888" }}>
<button onClick={goBack} disabled={historyIndex === 0}>⬅️</button>
<button onClick={goForward} disabled={historyIndex === history.length - 1}>➡️</button>
<button onClick={() => window.location.reload()}>🔄</button>
<button onClick={() => setPage("home")}>🏠</button>

</div>
{/* Address Bar */}
<div style={{ background: "#fff", padding: "4px 10px", borderBottom: "1px solid #ccc", fontSize: "12px", fontFamily: "monospace" }}>
Location: http://www.goodneighbor.fund/{currentPage === "home" ? "" : currentPage}
</div>
{/* Nav Buttons as Tabs */}
<div style={{ background: "#f8f8f8", padding: "6px 12px", display: "flex", borderBottom: "1px solid #ddd" }}>
<button 
  onClick={() => setPage("home")}
  style={{
    background: currentPage === "home" ? "#fff" : "#e0e0e0",
    border: "1px solid #ccc",
    borderBottom: currentPage === "home" ? "1px solid #fff" : "1px solid #ccc",
    borderRadius: "4px 4px 0 0",
    padding: "4px 12px",
    marginRight: "4px",
    position: "relative",
    top: "1px",
    fontWeight: currentPage === "home" ? "bold" : "normal"
  }}
>Home</button>
<button 
  onClick={() => setPage("chapters")}
  style={{
    background: currentPage === "chapters" || currentPage === "wny" || currentPage === "denver" ? "#fff" : "#e0e0e0",
    border: "1px solid #ccc",
    borderBottom: currentPage === "chapters" || currentPage === "wny" || currentPage === "denver" ? "1px solid #fff" : "1px solid #ccc",
    borderRadius: "4px 4px 0 0",
    padding: "4px 12px",
    marginRight: "4px",
    position: "relative",
    top: "1px",
    fontWeight: currentPage === "chapters" || currentPage === "wny" || currentPage === "denver" ? "bold" : "normal"
  }}
>Chapters</button>
<button 
  onClick={() => setPage("donate")}
  style={{
    background: currentPage === "donate" ? "#fff" : "#e0e0e0",
    border: "1px solid #ccc",
    borderBottom: currentPage === "donate" ? "1px solid #fff" : "1px solid #ccc",
    borderRadius: "4px 4px 0 0",
    padding: "4px 12px",
    marginRight: "4px",
    position: "relative",
    top: "1px",
    fontWeight: currentPage === "donate" ? "bold" : "normal"
  }}
>Donate</button>
</div>
{/* Main Content */}
<div style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#fff" }}>
{renderPage()}
</div>
</div>
</RetroWindow>
);
}

const HomePage = ({ onPitchClick }) => (
<div style={{ fontFamily: "'Comic Sans MS', cursive", color: "#222" }}>
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", background: "linear-gradient(to right, #dfe9f3, #ffffff)", border: "2px ridge #999", padding: "20px", borderRadius: "10px" }}>
<div style={{ flex: 1 }}>
<h1 style={{ fontSize: "28px", color: "#004488", marginBottom: "10px", textShadow: "1px 1px 1px #aaa" }}>💫 $1,000 Micro-Grants for New Business Ideas</h1>
<div style={{ marginTop: "16px" }}>
<h2 style={{ marginTop: 0, color: "#990099" }}>Our Mission ✨</h2>
<p>Good Neighbor Fund is dedicated to leveling the playing field for entrepreneurship by providing $1,000 micro-grants to under-resourced and underrepresented founders, primarily at the ideation stage. Inspired by Buffalo's nickname "The City of Good Neighbors," we offer not just financial support, but belief capital and mentorship to empower new and diverse founders.</p>
</div>
</div>
<img src="/assets/gnf-fat-daddys.png" alt="Big Check Awardee" style={{ height: "220px", border: "3px groove #aaa", borderRadius: "6px", marginLeft: "30px" }} />
</div>

<div style={{ background: "#f0faff", padding: "20px", borderRadius: "8px", border: "2px inset #99ccff", marginBottom: "24px" }}>
<h2 style={{ color: "#0066aa" }}>Founded in 2023 -- Our Impact So Far:</h2>
<div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", textAlign: "center", fontSize: "16px", marginTop: "15px" }}>
<div><strong style={{ fontSize: "24px" }}>20</strong><br />New Business Ideas Funded</div>
<div><strong style={{ fontSize: "24px" }}>82%</strong><br />Women-Owned Businesses</div>
<div><strong style={{ fontSize: "24px" }}>65%</strong><br />BIPOC-Owned Businesses</div>
<div><strong style={{ fontSize: "24px" }}>70%</strong><br />Low-Income Zip Codes</div>
</div>
</div>

<div style={{ background: "#fffbe6", padding: "20px", border: "2px dotted #cccc99", borderRadius: "8px", marginBottom: "24px" }}>
<h2>Micro-Grants 💰</h2>
<p>Our micro-grant process is simple and 100% online. Complete a short form and record a 60-second pitch video. Our LP teams review all submissions and select new awardees at the end of each quarter.</p>
<p style={{ fontStyle: "italic", color: "#444" }}>This is not venture capital and we expect no return on investment. This is <strong>belief capital</strong>---an endorsement of your potential 🚀</p>
</div>

<div style={{ display: "flex", gap: "20px", marginBottom: "24px" }}>
<img src="/assets/gnf-ernies.png" alt="Ernie's Pop Shop" style={{ width: "48%", border: "2px dashed #ccc", borderRadius: "6px" }} />
<img src="/assets/gnf-kamil.png" alt="Kamil's Business" style={{ width: "48%", border: "2px dashed #ccc", borderRadius: "6px" }} />
</div>

<div style={{ background: "#eef9ee", padding: "20px", border: "2px solid #aaffaa", borderRadius: "10px", fontSize: "14px" }}>
<blockquote style={{ fontStyle: "italic", marginBottom: "10px" }}>
"The Good Neighbor Fund grant that I received in April 2023 was far more than a financial contribution to jump starting my business. It provided validation for an idea & passion that I have had for some time and support and encouragement to realize a dream of entrepreneurship after a 22 year teaching career. The grant money, resources and connections have been invaluable to help the seeds of my business grow and I feel blessed to be a part of this community of Good Neighbors. With much appreciation for what you do and the support you provide entrepreneurs."
</blockquote>
<strong>-- Tracy Csavina, Founder @ Sustainably Rooted LLC</strong>
</div>
</div>
);

// -- ChaptersPage --
const ChaptersPage = ({ setPage }) => (
<div style={{ fontFamily: "'Comic Sans MS', cursive", color: "#222" }}>
<h1>GNF Chapters</h1>
<p>Good Neighbor Fund operates through local chapters, each with their own community of LP neighbors who review applications and select quarterly awardees.</p>
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
<div style={{ background: "#fff", padding: "15px", borderRadius: "8px", border: "1px solid #ddd" }}>
<h2>Western New York</h2>
<p><strong>Founded:</strong> 2023</p>
<p>Our original chapter, serving Buffalo and surrounding areas.</p>
<div style={{ display: "flex", gap: "10px" }}>
<button onClick={() => setPage("wny")} style={chapterBtnStyle}>Meet the LPs</button>
<button onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLScKxNP8Kf1bSzl1uay3G1ewyOgRUKpLRDkiGMuSyJns_cBksQ/viewform', '_blank')} style={chapterBtnStyle}>Join Chapter</button>
</div>
</div>
<div style={{ background: "#fff", padding: "15px", borderRadius: "8px", border: "1px solid #ddd" }}>
<h2>Denver</h2>
<p><strong>Founded:</strong> 2023</p>
<p>Serving the greater Denver metropolitan area.</p>
<div style={{ display: "flex", gap: "10px" }}>
<button onClick={() => setPage("denver")} style={chapterBtnStyle}>Meet the LPs</button>
<button onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLScKxNP8Kf1bSzl1uay3G1ewyOgRUKpLRDkiGMuSyJns_cBksQ/viewform', '_blank')} style={chapterBtnStyle}>Join Chapter</button>
</div>
</div>
</div>
<div style={{ background: "#e6f7ff", padding: "20px", border: "2px dashed #88ccff", borderRadius: "10px", marginTop: "30px" }}>
<h2 style={{ color: "#004488" }}>How It Works</h2>
<p>GNF is a collective giving organization: a diverse group of founders, business executives, and creators that share a passion for entrepreneurship and community. Our LPs pool their own resources, knowledge, and networks. We meet quarterly to select new micro-grant award winners.</p>
</div>
<div style={{ background: "#fff0f5", padding: "20px", border: "2px groove #cc88aa", borderRadius: "10px", marginTop: "30px", textAlign: "center" }}>
<h2 style={{ color: "#cc3366" }}>Start a Chapter in Your City</h2>
<p>Interested in launching a GNF chapter in your own community? We're always looking for passionate good neighbors to help spread the belief capital.</p>
<button onClick={() => window.location.href = "mailto:jason@goodneighbor.fund"} style={{ background: "#ffccee", border: "2px outset #ff99cc", borderRadius: "6px", padding: "10px 20px", fontWeight: "bold", fontSize: "14px", cursor: "pointer", marginTop: "10px" }}>✉️ Contact Us to Start a Chapter</button>
</div>
</div>
);

const chapterBtnStyle = {
background: "#dceeff",
border: "2px outset #88bbdd",
borderRadius: "6px",
padding: "8px 12px",
fontWeight: "bold",
fontSize: "14px",
cursor: "pointer",
fontFamily: "Comic Sans MS"
};

const LpGrid = ({ lps }) => (
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
{lps.map(({ name, title, bio, linkedin }) => (
<div key={name} style={{ background: "#f8f8ff", padding: "15px", borderRadius: "8px", border: "1px solid #ccc" }}>

<img
src={`/assets/lps/${name.toLowerCase().replace(/\s+/g, "-")}.png`}
alt={name}
style={{
width: "120px",
height: "120px",
objectFit: "cover",
borderRadius: "50%",
border: "2px solid #ccc",
display: "block",
margin: "0 auto 10px auto"
}}
/>

<h3 style={{ marginBottom: "5px" }}>{name}</h3>
<p style={{ fontWeight: "bold", marginBottom: "6px" }}>{title}</p>
<p style={{ fontSize: "14px" }}>{bio}</p>
{linkedin && <a href={linkedin} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: "6px", fontSize: "12px", color: "#3366cc" }}>LinkedIn</a>}
</div>
))}
</div>
);

const WnyChapterPage = () => {
const lps = [
{
name: "Jason Bartz",
title: "Co-Founder",
bio: "Jason serves as VP of Business Development & Partner Success at Vero Technologies and Co-Founder of Refraction.",
},
{
name: "Andy Rose",
title: "Brand / Creative Strategist",
bio: "Andy is a strategist who's led activation for global brands like Alibaba, BMW, and Xerox. Passionate about Buffalo's startup scene.",
},
{
name: "Bobbie Armstrong",
title: "Director of Impact Ecosystems",
bio: "Focused on clean energy and greentech, with a background in policy making at Uptake Alliance.",
},
{
name: "Brian Cleary",
title: "Partner, Interlace Digital",
bio: "Empowering brands with innovative digital solutions.",
},
{
name: "Celine Krzan",
title: "Professor & Program Director",
bio: "Entrepreneurship faculty at UB. Runs M&T Minority and Women Emerging Entrepreneur Program.",
},
{
name: "Cindy Sideris",
title: "Director of Operations, UVC",
bio: "Connects and empowers Upstate NY founders. Passionate about VC + entertainment creators.",
},
{
name: "Danielle Blount",
title: "Partner at BOLD Ventures",
bio: "Also leads Buffalo's Awesome Foundation. Invests in wild, weird, and wonderful ideas.",
},
{
name: "David Brenner",
title: "Startup Community Organizer",
bio: "BootSector volunteer and Buffalo Startup Weekend lead.",
},
{
name: "Flossie Hall",
title: "CEO, Stella",
bio: "Veteran Navy spouse and serial entrepreneur. Featured in Forbes, Inc., and Entrepreneur.",
},
{
name: "Jon Pancerman",
title: "Sr. Director, ACV Auctions",
bio: "Ops leader with a TEDxBuffalo organizing past.",
},
{
name: "Jordan Walbesser",
title: "Director, Mattel Legal",
bio: "Exec Director of BootSector. Building Buffalo's next-gen startup leaders.",
},
{
name: "Najja Boulden",
title: "Founder, Phoenix Innovation Group",
bio: "Trainer and developer of inclusive innovation ecosystems.",
},
{
name: "Shannon McCabe",
title: "Market Research Analyst, Moog",
bio: "Background in VC and 43North. GenZ VC mentor.",
},
{
name: "Sonya Tarake",
title: "COO, Team Real Talk",
bio: "Facilitator for Kauffman FastTrac and EiR at UB's Inclusive Launch Foundry.",
},
];

return (
<div style={{ fontFamily: "'Comic Sans MS', cursive", color: "#222" }}>
<h1>Western New York Chapter LPs</h1>
<LpGrid lps={lps} />
</div>
);
};

const DenverChapterPage = () => {
const lps = [
{
name: "Susan O'Rourke",
title: "Co-Founder",
bio: "VP of Sales at Plug. Former early employee at ACV Auctions.",
},
{
name: "Allie Reitz",
title: "Founder, Meep",
bio: "UX designer, founder coach, and no-code studio builder for impact startups.",
},
{
name: "Jared McHenry",
title: "Launch Lead, SkySquad",
bio: "Scaling ops + sales teams with startup DNA from ACV Auctions.",
},
{
name: "Jeff Dougherty",
title: "Director, QuidelOrtho",
bio: "Ops wizard with experience integrating complex orgs post-merger.",
},
{
name: "Nicole Hunter",
title: "Professor of Finance, UB",
bio: "Spreads intercultural awareness through business education.",
},
{
name: "Scott Romano",
title: "Interim CEO, Energize Colorado",
bio: "Top 25 Colorado innovator. Brings tech to public-interest causes.",
},
];

return (
<div style={{ fontFamily: "'Comic Sans MS', cursive", color: "#222" }}>
<h1>Denver Chapter LPs</h1>
<LpGrid lps={lps} />
</div>
);
};

// -- DonatePage --
const DonatePage = () => (
<div style={{ fontFamily: "'Comic Sans MS', cursive", color: "#222" }}>
<h1>Donate to GNF</h1>
<p>Your support empowers new founders to build their dreams.</p>
<div style={{ background: "#f4fff4", padding: "15px", borderRadius: "8px", marginBottom: "20px", border: "1px solid #aaddaa" }}>
<p>We are a 100% volunteer-led organization. Your donation directly supports our Micro-Grant program and our chapter communities.</p>
<p><strong>Make a one-time donation today:</strong></p>
<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
<button onClick={() => window.open("https://www.paypal.com/donate/?hosted_button_id=5GLWEV6YNWSZY", "_blank")} style={donateBtnStyle}>💳️ Donate via PayPal</button>
<button onClick={() => window.open("http://cash.app/$JoinBootSector", "_blank")} style={donateBtnStyle}>💵 Donate via CashApp</button>
<button onClick={() => window.open("https://account.venmo.com/u/GiveBootSector", "_blank")} style={donateBtnStyle}>💸 Donate via Venmo</button>
<button onClick={() => window.open("https://drive.google.com/file/d/1KElR7W3j2gnR493Q9NL61r2JA4OtInAu/view?usp=share_link", "_blank")} style={donateBtnStyle}>🏦 Donate via ACH/Wire</button>
<p>All transactions are processed through our fiscal sponsor, BootSector, a registered 501(c)3 non-profit (EIN: 85-4082950)</p>
</div>
</div>
<div style={{ background: "#fcf4ff", padding: "15px", borderRadius: "8px", marginBottom: "20px", border: "1px dashed #ccaadd" }}>
<h2 style={{ color: "#663399", marginTop: 0 }}>Become a GNF Club Member</h2>
<p>Join a community of like-minded individuals who are passionate about entrepreneurship and giving back. Your recurring donation funds our micro-grant program and supports the next generation of founders.</p>
<ul>
<li>Free access to all GNF-hosted events</li>
<li>Limited edition GNF Club T-shirt</li>
<li>Invitation to a private GNF Slack community</li>
<li>GNF Club stickers</li>
<li>Social media shoutout</li>
<li>Invitation to future exclusive GNF LP and Founder events</li>
</ul>
<a href="https://buy.stripe.com/bIY6qO6DzbKq2EU4gi" target="_blank" rel="noreferrer" style={{ background: "#ff9999", border: "2px outset #ff6666", borderRadius: "5px", padding: "8px 16px", fontWeight: "bold", cursor: "pointer", fontSize: "14px", display: "inline-block", marginTop: "10px" }}>Join GNF Club</a>
</div>
</div>
);

const donateBtnStyle = {
background: "#f5f5f5",
border: "2px outset #ddd",
borderRadius: "5px",
padding: "10px",
fontWeight: "bold",
cursor: "pointer",
fontSize: "14px",
display: "flex",
alignItems: "center",
justifyContent: "center",
gap: "10px"
};