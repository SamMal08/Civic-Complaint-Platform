const DAY = 24 * 60 * 60 * 1000;

// Prep time by category
const EFFORT = {
  Electricity: { effortClass: "light", prepDays: 1 },
  Sanitation: { effortClass: "light", prepDays: 1 },
  Water: { effortClass: "medium", prepDays: 5 },
  Traffic: { effortClass: "medium", prepDays: 5 },
  Roads: { effortClass: "heavy", prepDays: 20 },
  Infrastructure: { effortClass: "heavy", prepDays: 20 }
};

// Target days to resolve, by severity
const DEADLINE = { 5: 2, 4: 7, 3: 14, 2: 30, 1: 60 };

function computePriority(issue, now = new Date()) {
  const sev = Number(issue.severity) || 3;
  const netVotes = Math.max(0, (issue.upvotes || 0) - (issue.downvotes || 0));
  const daysOpen = Math.max(0, (now - new Date(issue.createdAt || now)) / DAY);

  let score =
    40 * (sev / 5) +
    30 * Math.min(Math.log10(1 + netVotes) / 2, 1) +
    30 * Math.min(daysOpen / 14, 1);

  if (sev === 5) score = Math.max(score, 90); // safety floor
  return Math.round(score * 10) / 10;
}

function getPrepInfo(issue, now = new Date()) {
  const { effortClass, prepDays } = EFFORT[issue.category] || { effortClass: "medium", prepDays: 5 };
  const deadlineDays = DEADLINE[Number(issue.severity)] || 14;
  const startBy = new Date(new Date(issue.createdAt || now).getTime() + (deadlineDays - prepDays) * DAY);
  const daysUntilStart = Math.round(((startBy - now) / DAY) * 10) / 10;
  return { effortClass, prepDays, startBy, daysUntilStart, inPrepQueue: daysUntilStart <= 2 };
}

module.exports = { computePriority, getPrepInfo };