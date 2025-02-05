export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    // Make request to OpenAI API
    const aiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content }],
          model: "gpt-4",
          temperature: 0.7,
          max_tokens: 500,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json();
      throw new Error(errorData.error?.message || "Failed to get AI response");
    }

    const data = await aiResponse.json();
    const response = data.choices[0].message.content;

    // Clean and return response
    res.status(200).json({ response });
  } catch (error) {
    console.error("AI Response Error:", error);
    res.status(500).json({
      error: "Failed to get AI response",
      details: error.message || "Unknown error occurred",
      code: error.code || "UNKNOWN_ERROR",
    });
  }
}
