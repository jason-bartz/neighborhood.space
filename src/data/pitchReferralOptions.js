// Canonical acquisition channels offered in the pitch application form.
// Shared by PitchPage.jsx and GrantApplicationForm.jsx so the two submission
// surfaces stay in sync. Submitted to Firestore as the `heardAbout` string;
// when "Other" is selected the user's freeform text is stored instead.
export const PITCH_REFERRAL_OPTIONS = [
  "Instagram",
  "LinkedIn",
  "Facebook",
  "School",
  "LP Referral",
  "SBDC",
  "Prior Grant Awardee",
  "Other",
];

export const PITCH_REFERRAL_OTHER = "Other";

// Resolve the final `heardAbout` string from form state. Empty when the user
// skipped the field, or picked "Other" without typing anything.
export function resolvePitchReferral(selection, otherText) {
  if (!selection) return "";
  if (selection === PITCH_REFERRAL_OTHER) {
    return (otherText || "").trim();
  }
  return selection;
}
