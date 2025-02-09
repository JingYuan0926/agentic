export const getAIConfig = (selectedModel) => {
    const configs = {
        openai: {
            model: "gpt-4o",
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: "https://api.openai.com/v1",
        },
        hyperbolic: {
            model: "meta-llama/Llama-3.3-70B-Instruct",
            apiKey: process.env.HYPERBOLIC_API_KEY,
            baseURL: "https://api.hyperbolic.xyz/v1",
        }
    };

    return configs[selectedModel];
};

export const createChatCompletion = async (selectedModel, messages, options = {}) => {
    const config = getAIConfig(selectedModel);
    
    if (selectedModel === 'openai') {
        const openai = new OpenAI({
            apiKey: config.apiKey,
        });

        const response = await openai.chat.completions.create({
            model: config.model,
            messages,
            ...options,
        });

        return response;
    } else {
        // Hyperbolic API call
        const response = await fetch(`${config.baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.model,
                messages,
                max_tokens: options.max_tokens || 512,
                temperature: options.temperature || 0.1,
                top_p: options.top_p || 0.9,
                stream: false,
            }),
        });

        return await response.json();
    }
}; 