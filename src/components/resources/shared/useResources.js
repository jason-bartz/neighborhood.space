import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../../firebaseConfig";

// Normalizes a single Firestore resource doc into the shape the navigator
// uses everywhere. Mirrors the legacy mapping in NeighborhoodResources.jsx —
// Firestore has both camelCase and "Title Case" field variants in the wild.
function normalizeResource(item) {
  return {
    id: item.id,
    Resource: item.Resource || item.resource || "",
    Type: item.Type || item.type || "",
    "Focus Area": item.FocusArea || item["Focus Area"] || item.focusArea || "",
    "Business Stage": item.Stage || item["Business Stage"] || item.businessStage || "",
    "Counties Served": item.CountiesServed || item["Counties Served"] || item.countiesServed || "",
    Chapter: item.Chapter || item.chapter || "",
    URL: item.Website || item.URL || item.url || "",
    "Expanded Details": item.About || item["Expanded Details"] || item.expandedDetails || "",
    "Average Check Size": item.AverageCheckSize || item["Average Check Size"] || item.averageCheckSize || "",
    "Relocation Required?": item.RelocationRequired || item["Relocation Required?"] || item.relocationRequired || "",
  };
}

export default function useResources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const q = query(collection(db, "resources"), orderBy("Resource"));
        const snap = await getDocs(q);
        const rows = [];
        snap.forEach((doc) => {
          rows.push(normalizeResource({ id: doc.id, ...doc.data() }));
        });
        if (!cancelled) {
          setResources(rows);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { resources, loading, error };
}
