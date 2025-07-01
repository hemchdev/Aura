interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
}

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY!;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are Aura, a helpful personal assistant. Today's date is ${new Date().toISOString().split('T')[0]}. Your task is to analyze the user's request and respond with ONLY a JSON object that conforms to this exact schema:

{
  "intent": "string (e.g., 'create_event', 'set_reminder', 'get_information', 'clarify', 'unsupported', 'general')",
  "entities": {
    "title": "string or null",
    "date": "YYYY-MM-DD or null",
    "time": "HH:mm or null",
    "reminderText": "string or null", 
    "relativeTime": "string or null (e.g., 'today', 'tomorrow', 'next week')",
    "description": "string or null",
    "location": "string or null"
  },
  "confidence": "number between 0 and 1",
  "responseText": "string - A natural language response to the user"
}

IMPORTANT RULES:
1. ONLY respond with valid JSON - no markdown, no code blocks, no additional text
2. Do not wrap your response in \`\`\`json or any other formatting
3. Always include all required fields
4. Use null for missing entity values
5. For relative dates like "tomorrow", "next week", "in 2 days", calculate the actual date and include both the calculated date and the relativeTime

Intent Types:
- create_event: User wants to create a calendar event (meetings, appointments, events)
- set_reminder: User wants to set a reminder (tasks, notes to self, things to remember)
- get_information: User is asking for information about their schedule/reminders
- clarify: The request is ambiguous and needs clarification
- unsupported: The request cannot be handled
- general: General conversation or greeting

Date Processing Examples:
- "tomorrow" = next day's date + "tomorrow" in relativeTime
- "next Monday" = calculate next Monday's date + "next Monday" in relativeTime
- "in 3 days" = calculate date 3 days from now + "in 3 days" in relativeTime

Examples:
For "Hello" respond with:
{"intent":"general","entities":{"title":null,"date":null,"time":null,"reminderText":null,"relativeTime":null,"description":null,"location":null},"confidence":1.0,"responseText":"Hello! How can I help you today?"}

For "Set a reminder to call mom tomorrow at 3pm" respond with:
{"intent":"set_reminder","entities":{"title":"Call mom","date":"2025-07-02","time":"15:00","reminderText":"Call mom","relativeTime":"tomorrow","description":null,"location":null},"confidence":0.9,"responseText":"I'll set a reminder for you to call mom tomorrow at 3pm."}

For "Schedule a meeting with John next Monday at 10am" respond with:
{"intent":"create_event","entities":{"title":"Meeting with John","date":"2025-07-07","time":"10:00","reminderText":null,"relativeTime":"next Monday","description":"Meeting with John","location":null},"confidence":0.9,"responseText":"I'll schedule a meeting with John for next Monday at 10am."}`;


export class GeminiService {
  private async makeRequest(messages: GeminiMessage[]): Promise<string> {
    try {
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: messages,
          generationConfig: {
            temperature: 0.3,
            topK: 32,
            topP: 1,
            maxOutputTokens: 1024,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json() as GeminiResponse;
      return data.candidates[0]?.content?.parts[0]?.text || '';
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw new Error('Failed to get AI response');
    }
  }

  async processUserMessage(userMessage: string, conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []) {
    try {
      const messages: GeminiMessage[] = [
        {
          role: 'user',
          parts: [{ text: SYSTEM_PROMPT }],
        },
      ];

      // Add conversation history
      conversationHistory.slice(-10).forEach((msg) => {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        });
      });

      // Add current user message
      messages.push({
        role: 'user',
        parts: [{ text: userMessage }],
      });

      const response = await this.makeRequest(messages);
      
      // Parse JSON response
      try {
        // Clean the response by removing markdown code blocks if present
        let cleanResponse = response.trim();
        
        // Remove ```json and ``` if present
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        const parsed = JSON.parse(cleanResponse);
        return parsed;
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', response);
        return {
          intent: 'general',
          entities: {},
          confidence: 0.5,
          responseText: response || "I'm sorry, I couldn't process that request properly. Could you try rephrasing it?",
        };
      }
    } catch (error) {
      console.error('Gemini processing error:', error);
      return {
        intent: 'unsupported',
        entities: {},
        confidence: 0,
        responseText: "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
      };
    }
  }
}

export const geminiService = new GeminiService();