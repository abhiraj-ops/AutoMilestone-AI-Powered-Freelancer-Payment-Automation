const { GoogleGenerativeAI } = require('@google/generative-ai');

async function verifyMilestone(milestone, projectDescription) {
  const fallbackUnavailable = {
    approved: false,
    score: 0,
    feedback: 'AI service temporarily unavailable. Please retry in a moment.',
    missing: [],
  };

  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error('[Gemini] Missing GEMINI_API_KEY');
      return fallbackUnavailable;
    }

    let brief = projectDescription;
    if (projectDescription && typeof projectDescription === 'object') {
      brief = projectDescription.description || JSON.stringify(projectDescription);
    }
    if (!brief) brief = '';

    const deliverable = milestone.deliverable_text || '';
    const milestoneTitle = milestone.title || 'Milestone';

    const prompt = `You are AutoMilestone's AI verifier for a freelancer platform.

You must review a freelancer's deliverable against the original project brief and milestone title.
Score it 0-100 based on completeness, relevance, and quality. Score >= 75 means approved.

Project Brief:
${brief}

Milestone Title:
${milestoneTitle}

Freelancer Deliverable:
${deliverable}

Respond ONLY in raw JSON (no markdown fences, no code blocks, no extra text). Use exactly this shape:
{"approved": boolean, "score": number (0-100), "feedback": string, "missing": string[]}

Rules:
- approved must be true if score >= 75, otherwise false.
- score must be an integer 0-100.
- feedback must be 1-3 sentences explaining the score.
- missing must be an array of specific missing items (empty if score >= 75).
- Return raw JSON only.`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawText = typeof response.text === 'function' ? response.text() : response.text;

    if (!rawText) {
      console.error('[Gemini] Empty response');
      return fallbackUnavailable;
    }

    const cleaned = rawText.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('[Gemini] JSON parse error:', rawText);
      return { approved: false, score: 0, feedback: 'AI parse error', missing: [] };
    }

    const score = typeof parsed.score === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.score))) : 0;
    const approved = score >= 75 ? true : Boolean(parsed.approved && score >= 75);
    const finalApproved = score >= 75;

    return {
      approved: finalApproved,
      score,
      feedback: parsed.feedback || '',
      missing: Array.isArray(parsed.missing) ? parsed.missing.map(String) : [],
    };
  } catch (err) {
    const msg = err.message || String(err);
    const isQuota =
      err.status === 429 ||
      /quota|rate limit|resource exhausted|overloaded|temporarily unavailable/i.test(msg) ||
      (err.response && (err.response.status === 429 || err.response.status === 503));

    console.error('[Gemini] verifyMilestone error:', msg);
    if (isQuota) return fallbackUnavailable;
    return fallbackUnavailable;
  }
}

module.exports = { verifyMilestone };
