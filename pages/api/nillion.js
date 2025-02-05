import { SecretVaultWrapper } from "nillion-sv-wrappers";
import { nilql } from "@nillion/nilql";

const cluster = {
  nodes: [
    {
      url: "https://nildb-zy8u.nillion.network",
      did: "did:nil:testnet:nillion1fnhettvcrsfu8zkd5zms4d820l0ct226c3zy8u",
      operations: ["store"],
    },
    {
      url: "https://nildb-rl5g.nillion.network",
      did: "did:nil:testnet:nillion14x47xx85de0rg9dqunsdxg8jh82nvkax3jrl5g",
      operations: ["store"],
    },
    {
      url: "https://nildb-lpjp.nillion.network",
      did: "did:nil:testnet:nillion167pglv9k7m4gj05rwj520a46tulkff332vlpjp",
      operations: ["store"],
    },
  ],
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action, address, data } = req.body;

  try {
    const collection = new SecretVaultWrapper(
      cluster.nodes,
      {
        secretKey: process.env.NEXT_PUBLIC_NILLION_SECRET_KEY,
        orgDid: process.env.NEXT_PUBLIC_NILLION_ORG_DID,
      },
      process.env.NEXT_PUBLIC_NILLION_SCHEMA_ID
    );

    await collection.init();

    switch (action) {
      case "read":
        const filter = { user_address: address };
        const result = await collection.readFromNodes(filter);
        return res.status(200).json(result);

      case "write":
        const writeResult = await collection.writeToNodes(data);
        return res.status(200).json(writeResult);

      default:
        return res.status(400).json({ error: "Invalid action" });
    }
  } catch (error) {
    console.error("Nillion API error:", error);
    return res.status(500).json({ error: error.message });
  }
}
