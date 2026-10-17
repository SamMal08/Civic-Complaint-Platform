const Issue = require("../models/Issue");

// Candidates: open issues within 500 m (Closed ones are skipped)
async function findCandidates(latitude, longitude) {
  return Issue.find({
    status: { $ne: "Closed" },
    location: {
      $nearSphere: {
        $geometry: { type: "Point", coordinates: [longitude, latitude] },
        $maxDistance: 500
      }
    }
  }).limit(10);
}

async function askGemini(newIssue, candidates) {
  const list = candidates.map((c) => ({
    issueId: c.issueId,
    title: c.title,
    description: c.description,
    category: c.category
  }));

  const prompt =
    "You compare civic complaints. The complaint may be in any Indian language. " +
    "Decide whether the NEW complaint describes the same real-world problem as any EXISTING complaint. " +
    "Different wording or language does not matter; the same problem at the same place does.\n" +
    "Reply ONLY with JSON: {\"matches\":[{\"issueId\":number,\"confidence\":number between 0 and 1,\"reason\":\"short English reason\"}]}. " +
    "Use an empty list if none match.\n\n" +
    "NEW: " + JSON.stringify(newIssue) + "\nEXISTING: " + JSON.stringify(list);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.AI_MODEL}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.AI_API_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0 }
    }),
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates[0].content.parts[0].text;
  return JSON.parse(text.replace(/```json|```/g, "").trim()).matches || [];
}

// Backup if Gemini fails: simple word overlap (same-language only)
function keywordMatches(newIssue, candidates) {
  const tokens = (s) => new Set(String(s).toLowerCase().split(/\W+/).filter((w) => w.length > 2));
  const a = tokens(newIssue.title + " " + newIssue.description);
  return candidates
    .map((c) => {
      const b = tokens(c.title + " " + c.description);
      const common = [...a].filter((w) => b.has(w)).length;
      const score = common / (new Set([...a, ...b]).size || 1);
      return { issueId: c.issueId, confidence: Number(score.toFixed(2)), reason: "Similar wording" };
    })
    .filter((m) => m.confidence >= 0.5);
}

async function detectDuplicates({ title, description, category, latitude, longitude }) {
  const candidates = await findCandidates(latitude, longitude);
  if (candidates.length === 0) {
    return { isDuplicate: false, matches: [], provider: "none-nearby" };
  }

  const newIssue = { title, description, category };
  let raw, provider;
  try {
    if (!process.env.AI_API_KEY || !process.env.AI_MODEL) throw new Error("AI_API_KEY or AI_MODEL not set");
    raw = await askGemini(newIssue, candidates);
    provider = "gemini";
  } catch (err) {
    console.warn("[Duplicates] Gemini failed, using fallback:", err.message);
    raw = keywordMatches(newIssue, candidates);
    provider = "fallback-keyword";
  }

  const byId = new Map(candidates.map((c) => [c.issueId, c]));
  const matches = raw
    .filter((m) => byId.has(m.issueId) && m.confidence >= 0.6)
    .map((m) => {
      const c = byId.get(m.issueId);
      return {
        issueId: c.issueId,
        title: c.title,
        status: c.status,
        upvotes: c.upvotes,
        confidence: m.confidence,
        reason: m.reason
      };
    })
    .sort((x, y) => y.confidence - x.confidence);

  return { isDuplicate: matches.length > 0, matches, provider };
}

module.exports = { detectDuplicates };