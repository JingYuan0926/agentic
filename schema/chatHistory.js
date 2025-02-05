export const chatHistorySchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "array",
  items: {
    type: "object",
    properties: {
      _id: {
        type: "string",
        format: "uuid",
        coerce: true,
      },
      user_address: {
        type: "string",
      },
      chat_history: {
        type: "object",
        properties: {
          $share: {
            type: "string",
          },
        },
        required: ["$share"],
      },
      timestamp: {
        type: "string",
        format: "date-time",
        coerce: true,
      },
      title: {
        type: "string",
      },
    },
    required: ["_id", "user_address", "chat_history", "timestamp"],
    additionalProperties: false,
  },
};
