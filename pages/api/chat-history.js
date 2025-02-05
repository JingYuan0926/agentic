import nillionService from "../../services/nillionService";

export default async function handler(req, res) {
  if (!req.method === "GET" && !req.method === "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (req.method === "GET") {
      const { address } = req.query;
      if (!address) {
        return res.status(400).json({ error: "Address is required" });
      }

      const chatHistory = await nillionService.getChatHistory(address);
      return res.status(200).json({ chatHistory });
    }

    if (req.method === "POST") {
      const { address, messages, title } = req.body;
      if (!address || !messages) {
        return res
          .status(400)
          .json({ error: "Address and messages are required" });
      }

      const result = await nillionService.storeChatHistory(
        address,
        messages,
        title
      );
      return res.status(200).json({ result });
    }
  } catch (error) {
    console.error("Chat History Error:", error);
    return res.status(500).json({
      error: "Failed to process chat history",
      details: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
}
