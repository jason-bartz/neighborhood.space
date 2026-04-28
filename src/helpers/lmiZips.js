// Bundled lookup for "low-to-moderate income" ZIPs (HUD's 80%-of-median rule
// applied at the national level using ACS 5-Year ZCTA median household
// income). The JSON is built by functions/scripts/buildLmiZips.js — see that
// script's header for methodology and how to refresh against a newer ACS.

import lmiData from "../data/lmiZips.json";

const LMI_SET = new Set(lmiData.zips);

export function isLMIZip(zip) {
  if (!zip) return false;
  const match = String(zip).trim().match(/^(\d{5})/);
  return match ? LMI_SET.has(match[1]) : false;
}

export const LMI_THRESHOLD = lmiData.threshold;
export const LMI_ACS_YEAR = lmiData.acsYear;
