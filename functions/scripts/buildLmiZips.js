// One-off importer that builds src/data/lmiZips.json — the bundled list of
// "low-to-moderate income" ZIPs the Statistics tab uses to flag rows in
// Geographic Reach and compute the LMI applicant share.
//
// Methodology
// -----------
// HUD's official LMI determination is "household income ≤ 80% of Area
// Median Income (AMI)". HUD only publishes LMI summary data at block-group,
// tract, place, and county levels — not ZIP. Rolling tract data up to ZIP
// would need the HUD ZIP-tract crosswalk (which sits behind a HUD USER
// login) and weighted aggregation. Rather than build that pipeline, we apply
// HUD's "80% of median" rule directly at the **national** level using ACS
// 5-Year ZCTA median household income. Concretely:
//
//   ZIP is LMI  ⇔  ZCTA median household income ≤ 0.80 × US median
//
// The 2022 ACS 5-Year US median household income is ~$75,149, so the cutoff
// rounds to $60,000. This is coarser than per-metro AMI but is transparent,
// stable, and uses an authoritative free data source.
//
// To re-run when a new ACS vintage drops, bump ACS_YEAR and re-run.
// Re-fetching with no other code changes is safe — output is sorted and
// deterministic.
//
// Usage:
//   node functions/scripts/buildLmiZips.js

const fs = require("fs");
const path = require("path");
const https = require("https");

const ACS_YEAR = 2022;
// Per HUD's 80%-of-median LMI rule applied to the national US median.
// 2022 ACS 5-Year US median household income ≈ $75,149.
// 80% of that = $60,119, rounded to $60,000 for a clean threshold.
const LMI_INCOME_THRESHOLD = 60000;
const US_MEDIAN_HOUSEHOLD_INCOME_REFERENCE = 75149;
const ACS_VARIABLE = "B19013_001E"; // Median household income, past 12 months
const OUTPUT_PATH = path.resolve(__dirname, "../../src/data/lmiZips.json");

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} from ${url}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });
}

(async () => {
  const url = `https://api.census.gov/data/${ACS_YEAR}/acs/acs5?get=NAME,${ACS_VARIABLE}&for=zip%20code%20tabulation%20area:*`;
  console.log(`Fetching ${url}`);
  const rows = await fetchJson(url);

  // First row is the header: ["NAME","B19013_001E","zip code tabulation area"]
  const header = rows[0];
  const zipIdx = header.indexOf("zip code tabulation area");
  const incIdx = header.indexOf(ACS_VARIABLE);
  if (zipIdx < 0 || incIdx < 0) {
    throw new Error(`Unexpected header from Census API: ${JSON.stringify(header)}`);
  }

  const lmi = [];
  let totalWithIncome = 0;
  let suppressed = 0;

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const zip = row[zipIdx];
    const incomeRaw = row[incIdx];
    const income = Number(incomeRaw);

    // ACS suppresses small-sample ZCTAs with sentinels like -666666666.
    // Any non-positive value means "no estimate available" — exclude rather
    // than treating a sentinel as $0.
    if (!Number.isFinite(income) || income <= 0) {
      suppressed += 1;
      continue;
    }
    totalWithIncome += 1;
    if (income <= LMI_INCOME_THRESHOLD) {
      lmi.push(zip);
    }
  }

  lmi.sort();

  const output = {
    generatedAt: new Date().toISOString(),
    methodology:
      "ACS 5-Year ZCTA median household income ≤ 80% of US national median (HUD LMI rule applied at national level)",
    acsYear: ACS_YEAR,
    acsVariable: ACS_VARIABLE,
    threshold: LMI_INCOME_THRESHOLD,
    usMedianReference: US_MEDIAN_HOUSEHOLD_INCOME_REFERENCE,
    zctaCountWithIncome: totalWithIncome,
    zctaCountSuppressed: suppressed,
    lmiZipCount: lmi.length,
    zips: lmi,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");
  console.log(
    `Wrote ${OUTPUT_PATH}\n` +
      `  ZCTAs with income data: ${totalWithIncome}\n` +
      `  ZCTAs suppressed:       ${suppressed}\n` +
      `  LMI ZIPs (≤ $${LMI_INCOME_THRESHOLD}): ${lmi.length}\n` +
      `  Share: ${((lmi.length / totalWithIncome) * 100).toFixed(1)}%`
  );
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
