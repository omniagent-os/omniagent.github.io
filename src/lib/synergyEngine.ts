import { type Provider, type ModelResponse, type Message } from './types';

// Mock responses for demo mode
const mockResponses: Record<string, string> = {
  openai: "Here's a comprehensive overview from my perspective. I've analyzed the core components and structured them logically for better understanding.",
  anthropic: "I've thought deeply about this. Let's break this down from first principles, focusing on safety, alignment, and robust reasoning.",
  google: "Based on my vast knowledge graph, here are the factual details and interconnected concepts that relate to your query.",
  mistral: "Direct and efficient answer. Here are the key technical points without unnecessary fluff, optimized for performance.",
  deepseek: "Analyzing the code and logical structures. Here is a precise, mathematically sound breakdown of the problem.",
  groq: "Fastest response generated. I've processed the context rapidly to provide immediate, actionable insights."
};

const mockSynthesis = "By synthesizing the diverse perspectives of multiple leading AI models, we arrive at a robust conclusion: The most effective approach combines structural logic, first-principles reasoning, and factual grounding. This synergy eliminates individual model biases and produces a mathematically sound, actionable insight that outperforms any single AI's response.";

// Helper to delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function processSynergy(
  message: string,
  providers: Provider[],
  history: Message[] = [],
  onProgress?: (partial: ModelResponse) => void
): Promise<{ modelResponses: ModelResponse[], synthesis: string }> {
  
  // Check if we're in demo mode (no API keys)
  const isDemoMode = providers.every(p => !p.apiKey);
  
  if (isDemoMode) {
    return runDemoSynergy(providers, onProgress);
  }

  // Real mode
  const enabledProviders = providers.filter(p => p.enabled && p.apiKey);
  
  if (enabledProviders.length === 0) {
    throw new Error("No enabled providers with API keys found.");
  }

  const startTime = Date.now();
  
  // Create pending responses
  const pendingResponses: ModelResponse[] = enabledProviders.map(p => ({
    providerId: p.id,
    model: p.model,
    content: "",
    responseTimeMs: 0,
    tokensUsed: 0,
    status: 'pending'
  }));

  // Fire all requests in parallel
  const promises = enabledProviders.map(async (provider) => {
    const pStart = Date.now();
    try {
      if (onProgress) {
        onProgress({
          providerId: provider.id,
          model: provider.model,
          content: "",
          responseTimeMs: 0,
          tokensUsed: 0,
          status: 'streaming'
        });
      }

      const response = await fetchFromProvider(provider, message, history);
      
      const result: ModelResponse = {
        providerId: provider.id,
        model: provider.model,
        content: response,
        responseTimeMs: Date.now() - pStart,
        tokensUsed: Math.round(response.length / 4), // rough estimate
        status: 'done'
      };

      if (onProgress) onProgress(result);
      return result;
    } catch (error: any) {
      console.error(`Error from ${provider.id}:`, error);
      const errResult: ModelResponse = {
        providerId: provider.id,
        model: provider.model,
        content: "",
        responseTimeMs: Date.now() - pStart,
        tokensUsed: 0,
        status: 'error',
        error: error.message || "Failed to fetch response"
      };
      if (onProgress) onProgress(errResult);
      return errResult;
    }
  });

  const modelResponses = await Promise.all(promises);
  
  // Synthesis step
  // In a real app we'd use the best model for this, but for now we'll just pick the first successful one
  // or use a mock synthesis if all failed
  const successfulResponses = modelResponses.filter(r => r.status === 'done');
  let synthesis = "Failed to synthesize response.";
  
  if (successfulResponses.length > 0) {
    const synthesisProvider = enabledProviders.find(p => p.id === successfulResponses[0].providerId) || enabledProviders[0];
    
    try {
      const synthesisPrompt = `
You are the Synthesis Agent. Below are responses from various AI models to a user query.
Synthesize them into one superior, cohesive answer.
Do not mention the names of the models or that you are synthesizing them.
Just provide the best possible answer by combining their insights.

User Query: ${message}

Responses:
${successfulResponses.map(r => `--- Model ${r.providerId} ---\n${r.content}`).join('\n\n')}
`;
      
      synthesis = await fetchFromProvider(synthesisProvider, synthesisPrompt, []);
    } catch (e) {
      console.error("Synthesis failed:", e);
      synthesis = "Synthesis failed. Please see individual model responses.";
    }
  }

  return {
    modelResponses,
    synthesis
  };
}

async function runDemoSynergy(providers: Provider[], onProgress?: (partial: ModelResponse) => void) {
  const enabledProviders = providers.filter(p => p.enabled);
  
  const promises = enabledProviders.map(async (provider) => {
    const jitter = Math.random() * 2000 + 1000; // 1-3s delay
    
    if (onProgress) {
      onProgress({
        providerId: provider.id,
        model: provider.model,
        content: "",
        responseTimeMs: 0,
        tokensUsed: 0,
        status: 'streaming'
      });
    }
    
    await delay(jitter);
    
    const result: ModelResponse = {
      providerId: provider.id,
      model: provider.model,
      content: mockResponses[provider.id] || "Demo response.",
      responseTimeMs: jitter,
      tokensUsed: 42,
      status: 'done'
    };
    
    if (onProgress) onProgress(result);
    return result;
  });

  const modelResponses = await Promise.all(promises);
  
  // Fake synthesis delay
  await delay(1500);
  
  return {
    modelResponses,
    synthesis: mockSynthesis
  };
}

async function fetchFromProvider(provider: Provider, message: string, history: Message[]): Promise<string> {
  const messages = [
    ...history.map(h => ({
      role: h.role,
      content: h.content
    })),
    { role: 'user', content: message }
  ];

  switch (provider.id) {
    case 'openai':
    case 'mistral':
    case 'deepseek':
    case 'groq': {
      let endpoint = '';
      if (provider.id === 'openai') endpoint = 'https://api.openai.com/v1/chat/completions';
      if (provider.id === 'mistral') endpoint = 'https://api.mistral.ai/v1/chat/completions';
      if (provider.id === 'deepseek') endpoint = 'https://api.deepseek.com/chat/completions';
      if (provider.id === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`
        },
        body: JSON.stringify({
          model: provider.model,
          messages: messages
        })
      });
      
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      return data.choices[0].message.content;
    }
    
    case 'google': {
      // Convert history format to Gemini format
      const geminiMessages = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));
      
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${provider.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: geminiMessages
        })
      });
      
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      return data.candidates[0].content.parts[0].text;
    }

    case 'anthropic': {
      // Anthropic blocks browser CORS. Throw a clear error.
      throw new Error("Anthropic API blocks browser requests (CORS). Consider using a proxy or try another provider.");
    }
      
    default:
      throw new Error(`Unsupported provider: ${provider.id}`);
  }
}
