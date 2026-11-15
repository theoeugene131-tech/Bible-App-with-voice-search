// Vercel serverless endpoint for AI sermon generation.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "Sermon generation is not configured yet. Add GEMINI_API_KEY to this Vercel project's Environment Variables, then redeploy." });
  }

  const body = req.body || {};
  const topic = String(body.topic || "").trim().slice(0, 180);
  const passage = String(body.passage || "").trim().slice(0, 100);
  const style = String(body.style || "Expository").slice(0, 40);
  const audience = String(body.audience || "General congregation").slice(0, 60);
  const length = String(body.length || "20–25 minutes").slice(0, 40);

  if (!topic && !passage) {
    return res.status(400).json({ error: "Enter a sermon topic or Bible passage." });
  }

  const prompt = `Prepare a complete, detailed Christian sermon using the King James Version (KJV) as the requested Bible translation.

SERMON REQUEST
Topic: ${topic || "Develop the sermon from the supplied passage"}
Main passage: ${passage || "Choose the most relevant primary KJV passage"}
Style: ${style}
Audience: ${audience}
Target delivery time: ${length}

REQUIREMENTS
1. Write a genuinely developed sermon manuscript, not a brief outline. Include a compelling title, central truth, clear purpose, introduction, historical and literary context, explanation of the main passage, and a logical progression of major points.
2. Under every major point, provide detailed explanation, relevant supporting KJV references, practical applications, and appropriate illustrations or examples. Explain how each supporting reference relates to the message.
3. Include transitions between sections, a meaningful conclusion, a specific response or reflection invitation, and a closing prayer.
4. Keep the teaching faithful to the biblical context. Distinguish direct Bible quotations from explanation. Do not invent quotations, verse wording, chapter numbers, or references. If uncertain about exact wording or a reference, give the reference only and tell the preacher to verify it in a KJV Bible.
5. Avoid fabricated historical claims, manipulative promises, and claims that a particular outcome is guaranteed by God. Treat denominationally disputed interpretations carefully and acknowledge alternatives when relevant.
6. Use clear, natural spoken English suitable for preaching aloud. Do not pad the sermon with repetition. Make the content substantial enough for the requested delivery time.
7. Finish with a short list of all primary and supporting Bible references for the preacher to check.

Use Markdown headings and readable paragraphs. Return only the sermon manuscript.`;

  try {
    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "You are a careful Bible-study and sermon-preparation assistant. You must not fabricate Scripture quotations or references. Help preachers prepare material that they must review and verify." }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.65, maxOutputTokens: 7000 }
      })
    });

    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = result.error && result.error.message ? result.error.message : "The AI service could not complete the request.";
      return res.status(upstream.status === 429 ? 429 : 502).json({ error: message });
    }

    const sermon = (result.candidates || [])
      .flatMap(candidate => candidate.content && candidate.content.parts ? candidate.content.parts : [])
      .map(part => part.text || "")
      .join("\n")
      .trim();

    if (!sermon) return res.status(502).json({ error: "The AI returned no sermon text. Please try again." });
    return res.status(200).json({ sermon });
  } catch (error) {
    return res.status(502).json({ error: "Could not contact the AI service. Check the connection and try again." });
  }
}
