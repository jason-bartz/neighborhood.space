import React, { useEffect, useState } from "react";
import { db, storage } from "./firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

export default function GrantWinnersTab({ user, isSuperAdmin }) {
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [selectedChapter, setSelectedChapter] = useState(user.chapter || "");

  const fetchWinners = async () => {
    setLoading(true);
    try {
      const q = isSuperAdmin
        ? query(
            collection(db, "pitches"),
            where("isWinner", "==", true),
            where("chapter", "==", selectedChapter)
          )
        : query(
            collection(db, "pitches"),
            where("isWinner", "==", true),
            where("chapter", "==", user.chapter)
          );
      const snap = await getDocs(q);
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setWinners(data);
    } catch (e) {
      console.error("Error loading winners:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWinners();
  }, [user, isSuperAdmin, selectedChapter]);

  const handleChange = (id, field, value) => {
    setWinners((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const handleSave = async (winner) => {
    setSaving(true);
    try {
      const docRef = doc(db, "pitches", winner.id);
      await updateDoc(docRef, {
        about: winner.about || "",
        latitude: winner.latitude ? parseFloat(winner.latitude) : null,
        longitude: winner.longitude ? parseFloat(winner.longitude) : null,
        founderPhotoUrl: winner.founderPhotoUrl || "",
        website: winner.website || "",
        zipCode: winner.zipCode || "",
      });
      setStatusMsg("✅ Saved!");
      setTimeout(() => setStatusMsg(""), 1500);
    } catch (e) {
      console.error("Save error:", e);
      setStatusMsg("❌ Error saving");
    }
    setSaving(false);
  };

  const handlePhotoUpload = async (id, file) => {
    const storageRef = ref(storage, `founders/${id}.jpg`);
    try {
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      handleChange(id, "founderPhotoUrl", url);
    } catch (e) {
      console.error("Upload failed:", e);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h3 style={{ marginBottom: 10 }}>Grant Winners Management 🏆</h3>

      {isSuperAdmin && (
        <div style={{ marginBottom: 20 }}>
          <label>
            Filter by Chapter:{" "}
            <select
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              style={{ padding: "4px", fontFamily: "inherit" }}
            >
              <option value="">-- Select Chapter --</option>
              <option value="Western New York">Western New York</option>
              <option value="Denver">Denver</option>
              {/* Add more as needed */}
            </select>
          </label>
        </div>
      )}

      {loading ? (
        <p>Loading winners...</p>
      ) : winners.length === 0 ? (
        <p>No grant winners found.</p>
      ) : (
        winners.map((f) => (
          <div
            key={f.id}
            style={{
              border: "1px solid #ccc",
              padding: 15,
              marginBottom: 15,
              borderRadius: 4,
              background: "#fdfdfd",
            }}
          >
            <strong>{f.businessName}</strong> by {f.founderName}
            <div
              style={{
                display: "flex",
                gap: 20,
                marginTop: 10,
                flexWrap: "wrap",
              }}
            >
              <div>
                {f.founderPhotoUrl && (
                  <img
                    src={f.founderPhotoUrl}
                    alt="Founder"
                    style={{
                      width: 120,
                      height: 120,
                      objectFit: "cover",
                      borderRadius: 4,
                      border: "1px solid #aaa",
                    }}
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handlePhotoUpload(f.id, e.target.files[0])
                  }
                  style={{ marginTop: 8 }}
                />
              </div>
              <div style={{ flexGrow: 1 }}>
                <label style={{ display: "block", fontWeight: "bold" }}>
                  About:
                </label>
                <textarea
                  value={f.about || ""}
                  onChange={(e) =>
                    handleChange(f.id, "about", e.target.value)
                  }
                  rows={4}
                  style={{
                    width: "100%",
                    padding: 8,
                    fontFamily: "inherit",
                    fontSize: "1em",
                  }}
                />

                <label style={{ display: "block", marginTop: 10 }}>
                  Website:
                </label>
                <input
                  type="text"
                  value={f.website || ""}
                  onChange={(e) =>
                    handleChange(f.id, "website", e.target.value)
                  }
                  style={{ width: "100%", padding: 6 }}
                />

                <label style={{ display: "block", marginTop: 10 }}>
                  Zip Code:
                </label>
                <input
                  type="text"
                  value={f.zipCode || ""}
                  onChange={(e) =>
                    handleChange(f.id, "zipCode", e.target.value)
                  }
                  style={{ width: "100%", padding: 6 }}
                />

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 10,
                  }}
                >
                  <div>
                    <label>Latitude:</label>
                    <input
                      type="text"
                      value={f.latitude || ""}
                      onChange={(e) =>
                        handleChange(f.id, "latitude", e.target.value)
                      }
                      style={{ width: 100 }}
                    />
                  </div>
                  <div>
                    <label>Longitude:</label>
                    <input
                      type="text"
                      value={f.longitude || ""}
                      onChange={(e) =>
                        handleChange(f.id, "longitude", e.target.value)
                      }
                      style={{ width: 100 }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleSave(f)}
                  disabled={saving}
                  style={{
                    marginTop: 10,
                    padding: "6px 12px",
                    fontWeight: "bold",
                  }}
                >
                  💾 Save
                </button>
                {statusMsg && (
                  <span style={{ marginLeft: 10 }}>{statusMsg}</span>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
