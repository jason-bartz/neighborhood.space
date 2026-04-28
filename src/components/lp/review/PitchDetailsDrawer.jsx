import React, { useEffect } from "react";
import { RetroButton } from "../../ui/retro";

/**
 * Slide-in side drawer with the full submission detail for a pitch.
 * Reference material — the live discussion happens in the main detail pane;
 * this is what the director opens when someone in the room asks
 * "wait, what was their plan for the grant funds?"
 *
 * Closes on Escape, backdrop click, or the close button.
 */
function PitchDetailsDrawer({ pitch, open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open || !pitch) return null;

  return (
    <>
      <div
        className="win95-live-review-drawer__backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="win95-live-review-drawer"
        role="dialog"
        aria-label={`Full pitch details for ${pitch.businessName || "pitch"}`}
      >
        <div className="win95-live-review-drawer__head">
          <h3 className="win95-live-review-drawer__title">
            Full Pitch Details
          </h3>
          <RetroButton size="sm" onClick={onClose}>
            Close
          </RetroButton>
        </div>

        <InlineField label="Founder" value={pitch.founderName} />
        <InlineField label="Email" value={pitch.email} />
        <InlineField label="Website" value={pitch.website} />
        <InlineField
          label="Paying Customers"
          value={pitch.hasPayingCustomers ? "Yes" : "No"}
        />
        <InlineField label="Heard About" value={pitch.heardAbout} />

        <hr className="win95-live-review-drawer__divider" />

        <BlockField label="Value Proposition" value={pitch.valueProp} />
        <BlockField label="Problem" value={pitch.problem} />
        <BlockField label="Solution" value={pitch.solution} />
        <BlockField label="Business Model" value={pitch.businessModel} />
        <BlockField label="Grant Fund Use" value={pitch.grantUsePlan} />
        <BlockField label="Founder Bio" value={pitch.bio} />

        <hr className="win95-live-review-drawer__divider" />

        <InlineField label="Zip Code" value={pitch.zipCode} />
        <InlineField label="Video URL" value={pitch.pitchVideoUrl} />
        <BlockField
          label="Self Identification Tags"
          value={pitch.selfIdentification?.join(", ")}
        />
        <InlineField
          label="Terms & Privacy Agreed"
          value={pitch.consentToShare ? "Yes" : "No"}
        />
        <InlineField
          label="In-Person Meetup Agreed"
          value={pitch.consentToMeetup ? "Yes" : "No"}
        />
      </aside>
    </>
  );
}

function InlineField({ label, value }) {
  return (
    <div className="win95-live-review-drawer__field">
      <span className="win95-live-review-drawer__field-label">{label}</span>
      <span className="win95-live-review-drawer__field-value">
        {value || "N/A"}
      </span>
    </div>
  );
}

function BlockField({ label, value }) {
  return (
    <div className="win95-live-review-drawer__field">
      <span className="win95-live-review-drawer__field-label">{label}</span>
      <div className="win95-live-review-drawer__field-value">
        {value || "N/A"}
      </div>
    </div>
  );
}

export default PitchDetailsDrawer;
