const { calculateDistanceKm } = require("./geohashService");

const AI_PROVIDER = process.env.AI_PROVIDER || "mock";
const AI_API_KEY = process.env.AI_API_KEY || "";

/**
 * Deterministic Mock AI Provider (Zero external keys required, realistic civic AI insights)
 */
class MockAiProvider {
  async validateComplaint({ title, description, category }) {
    const text = `${title} ${description}`.toLowerCase();
    
    // Quick heuristic for spam / gibberish detection
    const isTooShort = text.length < 15;
    const spamWords = ["crypto giveaway", "free money", "buy now", "discount"];
    const isSpam = spamWords.some((w) => text.includes(w));

    if (isTooShort) {
      return {
        isValid: false,
        confidence: 0.95,
        reason: "Complaint description is too brief to identify civic issue accurately."
      };
    }

    if (isSpam) {
      return {
        isValid: false,
        confidence: 0.99,
        reason: "Content flagged as promotional spam."
      };
    }

    return {
      isValid: true,
      confidence: 0.96,
      reason: "Verified legitimate civic complaint related to public municipal infrastructure."
    };
  }

  async analyzeImage({ imageCidOrUrl, description, category }) {
    const text = (description || "").toLowerCase();
    let detectedFeatures = ["public urban infrastructure"];

    if (text.includes("pothole") || text.includes("road")) {
      detectedFeatures = ["asphalt surface deterioration", "bitumen road crater", "traffic lane obstruction"];
    } else if (text.includes("water") || text.includes("pipe") || text.includes("leak")) {
      detectedFeatures = ["pressurized water leakage", "sub-surface main crack", "pavement puddling"];
    } else if (text.includes("garbage") || text.includes("dump") || text.includes("waste")) {
      detectedFeatures = ["solid municipal waste accumulation", "pedestrian sidewalk blockage"];
    } else if (text.includes("light") || text.includes("wire") || text.includes("electric")) {
      detectedFeatures = ["overhead luminaire failure", "electrical wiring enclosure"];
    }

    return {
      matchesDescription: true,
      authenticityScore: 0.94,
      imageHashValid: true,
      detectedFeatures,
      analysisSummary: "Image visual analysis matches the described civic infrastructure issue with high confidence."
    };
  }

  async assessSeverity({ title, description, category }) {
    const text = `${title} ${description}`.toLowerCase();
    let recommendedSeverity = 3;
    let urgencyLevel = "Medium";
    let impactJustification = "Standard municipal maintenance requirement.";

    if (text.includes("danger") || text.includes("accident") || text.includes("burst") || text.includes("crater") || text.includes("fire")) {
      recommendedSeverity = 5;
      urgencyLevel = "Critical Emergency";
      impactJustification = "High accident hazard posing direct risk to commuters or public safety.";
    } else if (text.includes("hazard") || text.includes("flood") || text.includes("deep") || text.includes("blackout")) {
      recommendedSeverity = 4;
      urgencyLevel = "High Urgency";
      impactJustification = "Impacting major transit corridor or essential public services.";
    } else if (text.includes("small") || text.includes("minor") || text.includes("cosmetic")) {
      recommendedSeverity = 2;
      urgencyLevel = "Low";
      impactJustification = "Non-hazardous issue suitable for scheduled cyclical repair.";
    }

    return {
      recommendedSeverity,
      urgencyLevel,
      impactJustification
    };
  }

  async detectDuplicates({ title, description, latitude, longitude, nearbyIssues = [] }) {
    const searchTerms = title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);

    for (const issue of nearbyIssues) {
      const distance = calculateDistanceKm(latitude, longitude, issue.latitude, issue.longitude);
      
      // If within 150m and similar category
      if (distance <= 0.15) {
        const issueTitle = (issue.title || "").toLowerCase();
        const matches = searchTerms.filter((term) => issueTitle.includes(term));
        const similarityScore = matches.length / Math.max(searchTerms.length, 1);

        if (similarityScore >= 0.4) {
          return {
            isDuplicate: true,
            duplicateOfIssueId: issue.issueId,
            distanceMeters: Math.round(distance * 1000),
            similarityScore: parseFloat(similarityScore.toFixed(2)),
            matchingFactors: ["Proximity < 150m", "Shared infrastructure category", "Matching keywords"]
          };
        }
      }
    }

    return {
      isDuplicate: false,
      similarityScore: 0.1,
      duplicateOfIssueId: null,
      matchingFactors: []
    };
  }

  async suggestCategory({ title, description }) {
    const text = `${title} ${description}`.toLowerCase();

    if (text.includes("pothole") || text.includes("road") || text.includes("asphalt") || text.includes("tar")) {
      return { suggestedCategory: "Roads", confidence: 0.98 };
    }
    if (text.includes("water") || text.includes("pipe") || text.includes("leak") || text.includes("drain")) {
      return { suggestedCategory: "Water", confidence: 0.96 };
    }
    if (text.includes("light") || text.includes("wire") || text.includes("power") || text.includes("electric")) {
      return { suggestedCategory: "Electricity", confidence: 0.95 };
    }
    if (text.includes("garbage") || text.includes("waste") || text.includes("dump") || text.includes("trash")) {
      return { suggestedCategory: "Sanitation", confidence: 0.97 };
    }
    if (text.includes("signal") || text.includes("traffic") || text.includes("jam")) {
      return { suggestedCategory: "Traffic", confidence: 0.94 };
    }

    return { suggestedCategory: "Infrastructure", confidence: 0.85 };
  }
}

/**
 * Optional Google Gemini Provider (used when AI_PROVIDER === 'gemini')
 */
class GeminiAiProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.mockFallback = new MockAiProvider();
  }

  async validateComplaint(params) {
    if (!this.apiKey) return this.mockFallback.validateComplaint(params);
    try {
      const prompt = `Analyze this civic complaint. Is it a legitimate public civic complaint? Title: "${params.title}", Description: "${params.description}". Return JSON: { isValid: boolean, confidence: number, reason: string }`;
      return await this._callGeminiJson(prompt, () => this.mockFallback.validateComplaint(params));
    } catch {
      return this.mockFallback.validateComplaint(params);
    }
  }

  async analyzeImage(params) {
    return this.mockFallback.analyzeImage(params);
  }

  async assessSeverity(params) {
    if (!this.apiKey) return this.mockFallback.assessSeverity(params);
    try {
      const prompt = `Rate civic severity (1 to 5) for: "${params.title} - ${params.description}". Return JSON: { recommendedSeverity: number, urgencyLevel: string, impactJustification: string }`;
      return await this._callGeminiJson(prompt, () => this.mockFallback.assessSeverity(params));
    } catch {
      return this.mockFallback.assessSeverity(params);
    }
  }

  async detectDuplicates(params) {
    return this.mockFallback.detectDuplicates(params);
  }

  async suggestCategory(params) {
    if (!this.apiKey) return this.mockFallback.suggestCategory(params);
    try {
      const prompt = `Categorize this civic complaint into one of [Roads, Water, Electricity, Sanitation, Traffic, Infrastructure]: "${params.title}". Return JSON: { suggestedCategory: string, confidence: number }`;
      return await this._callGeminiJson(prompt, () => this.mockFallback.suggestCategory(params));
    } catch {
      return this.mockFallback.suggestCategory(params);
    }
  }

  async _callGeminiJson(prompt, fallback) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${process.env.AI_MODEL}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${prompt}. Answer ONLY valid JSON without markdown fences.` }] }]
      })
    });
    const data = await res.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (candidate) {
      const clean = candidate.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(clean);
    }
    return fallback();
  }
}

// Instantiate active provider adapter
const activeProvider =
  AI_PROVIDER.toLowerCase() === "gemini" && AI_API_KEY
    ? new GeminiAiProvider(AI_API_KEY)
    : new MockAiProvider();

module.exports = {
  aiService: activeProvider,
  MockAiProvider,
  GeminiAiProvider,
  providerName: AI_PROVIDER.toLowerCase() === "gemini" && AI_API_KEY ? "Google Gemini" : "Deterministic Mock Provider"
};
