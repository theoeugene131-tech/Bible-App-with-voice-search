// Vercel serverless endpoint for AI Bible passage explanations.
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "Passage explanations are not configured. Add GEMINI_API_KEY to this Vercel project's Environment Variables, then redeploy." });
  }
  const body = req.body || {};
  const reference = String(body.reference || "").trim().slice(0, 100);
  const passage = String(body.passage || "").trim().slice(0, 7000);
  const style = String(body.style || "Simple explanation").trim().slice(0, 80);
  if (!reference || !passage) return res.status(400).json({ error: "A Bible passage is required." });
  if (passage.length > 7000) return res.status(413).json({ error: "Please explain a shorter passage, such as one chapter or a few verses." });

  const prompt = `Explain this Bible passage for a reader studying the King James Version.

REFERENCE: ${reference}
REQUESTED APPROACH: ${style}
KJV TEXT PROVIDED BY THE APP:
${passage}

INSTRUCTIONS
- Explain what the passage says in clear, accessible English.
- Respect the immediate context, the wider biblical context, and the original literary setting.
- Do not invent historical facts, Bible quotations, chapter numbers, or cross-references.
- Clearly distinguish what the text explicitly says from reasonable interpretation or application.
- If giving cross-references, provide references only when you are confident they are accurate, and briefly explain the connection.
- Avoid presenting disputed denominational interpretations as universally agreed facts; mention meaningful differences fairly where relevant.
- Do not claim that a particular outcome is guaranteed by God.
- Follow the requested approach. For a detailed study, include a short overview, verse-by-verse explanation, background, key themes, lessons, practical application, and carefully checked cross-references.
- End with a short reflection question.
- Use headings and readable paragraphs. Do not reproduce long copyrighted Bible translations. The supplied passage is KJV.
- Remind the reader that AI commentary is a study aid and should be checked against Scripture.
Return only the explanation.`;

  try {
    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "You are a careful Bible-study assistant. Be accurate, fair, context-aware, and transparent about interpretation. Never fabricate Scripture references or historical claims." }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.35, maxOutputTokens: 5000 }
      })
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = result.error && result.error.message ? result.error.message : "The AI service could not complete the explanation.";
      return res.status(upstream.status === 429 ? 429 : 502).json({ error: message });
    }
    const explanation = (result.candidates || [])
      .flatMap(candidate => candidate.content && candidate.content.parts ? candidate.content.parts : [])
      .map(part => part.text || "")
      .join("\n").trim();
    if (!explanation) return res.status(502).json({ error: "The AI returned no explanation. Please try again." });
    return res.status(200).json({ explanation });
  } catch (error) {
    return res.status(502).json({ error: "Could not contact the AI service. Check the connection and try again." });
  }
};
