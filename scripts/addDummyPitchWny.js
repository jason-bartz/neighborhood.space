// scripts/addDummyPitchWny.js
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebaseConfig.js";

async function addDummyPitchWny() {
  try {
    const docRef = await addDoc(collection(db, "pitches"), {
      bio: "I'm a passionate community builder with a background in music and retail. My dream is to launch a mobile coffee truck that pops up at underutilized parks across Buffalo.",
      businessModel: "We'll make money selling craft coffee, merch, and community sponsorships. Targeting a break-even point in month 6.",
      businessName: "PerkUp Buffalo",
      chapter: "Western New York",
      consentToShare: true,
      email: "fakefounder@example.com",
      founderName: "Alex Demo",
      grantUsePlan: "Buy a custom wrap for the truck and pay for city permit fees.",
      hasPayingCustomers: "No",
      heardAbout: "From the Buffalo Discord server",
      pitchVideoUrl: "https://youtu.be/dummy-pitch-video",
      problem: "Many Buffalo neighborhoods lack walkable access to good coffee and public gathering spots.",
      selfIdentification: ["BIPOC Owned/Led", "Current Full-Time Student Owned/Led"],
      solution: "We're creating a mobile café experience focused on underserved parks. High-quality drinks, great music, and local art.",
      valueProp: "Locally roasted beans, beautiful mobile setup, and community-first vibes. Think: if Third Wave Coffee met a pop-up concert.",
      website: "https://www.perkupbuffalo.fake",
      zipCode: "14201",
      createdAt: Timestamp.now()
    });

    console.log("✅ Dummy pitch added (WNY):", docRef.id);
  } catch (e) {
    console.error("❌ Error adding dummy WNY pitch:", e);
  }
}

export default addDummyPitchWny;
