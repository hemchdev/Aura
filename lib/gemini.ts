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
  "intent": "string (e.g., 'create_event', 'set_reminder', 'get_information', 'clarify', 'unsupported', 'general', 'create_reminder', 'get_events', 'get_reminders', 'update_event', 'delete_event', 'update_reminder', 'delete_reminder')",
  "entities": {
    "title": "string or null",
    "date": "YYYY-MM-DD or null",
    "time": "HH:mm or null",
    "reminderText": "string or null", 
    "relativeTime": "string or null (e.g., 'today', 'tomorrow', 'next week', 'this week', 'next 3 weeks', '1 month')",
    "description": "string or null",
    "location": "string or null",
    "reminderMinutes": "number or null",
    "limit": "string or null",
    "eventId": "string or null",
    "reminderId": "string or null",
    "searchQuery": "string or null",
    "duration": "number or null (in minutes)",
    "priority": "string or null ('low', 'medium', 'high')",
    "recurring": "string or null ('daily', 'weekly', 'monthly', 'yearly')",
    "endDate": "YYYY-MM-DD or null",
    "participants": "array of strings or null",
    "dateRange": "string or null (e.g., 'this_week', 'next_week', 'next_3_weeks', 'this_month', 'next_month')",
    "multiDay": "boolean or null (true for events spanning multiple days)"
  },
  "confidence": "number between 0 and 1",
  "responseText": "string - A natural language response to the user (Use markdown formatting: **bold**, *italic*, \`code\`)"
}

IMPORTANT RULES:
1. ONLY respond with valid JSON - no markdown, no code blocks, no additional text
2. Do not wrap your response in \`\`\`json or any other formatting
3. Always include all required fields
4. Use null for missing entity values
5. For relative dates like "tomorrow", "next week", "in 2 days", calculate the actual date and include both the calculated date and the relativeTime
6. For update/delete operations, extract the identifier from the request (e.g., "delete my meeting", "cancel lunch", "update my 3pm appointment")
7. For search/get operations, extract relevant filters (date, title keywords, etc.)
8. USE MARKDOWN in responseText for better mobile formatting - **bold**, *italic*, \`code\`
9. Be more flexible with natural language - understand context and variations
10. For recurring events, detect patterns like "every day", "weekly", "monthly"
11. Extract duration from phrases like "1 hour meeting", "30 minute call"
12. Understand priorities from words like "urgent", "important", "low priority"
13. For multi-day or date range requests, ALWAYS set multiDay: true and dateRange appropriately:
   - ANY request mentioning "week", "weeks", "month", "months" should be multiDay: true
   - "project deadline for next 3 weeks", "vacation this week", "busy next month" = multiDay: true
   - "meeting next week" (single event) = multiDay: false, but "block next week" = multiDay: true
14. Calculate proper date ranges:
   - "this week" → dateRange: "this_week", multiDay: true
   - "next week" → dateRange: "next_week", multiDay: true  
   - "next 3 weeks" → dateRange: "next_3_weeks", multiDay: true
   - "this month" → dateRange: "this_month", multiDay: true
   - "next month" → dateRange: "next_month", multiDay: true
15. For multi-day events, set endDate to the last day of the range
16. For action intents (create/get/update/delete events/reminders), keep responseText brief since the system will generate detailed responses
17. CRITICAL: For multi-day events with dateRange, do NOT set specific date values - leave date as null and let dateRange handle the calculation
18. EXAMPLES of multi-day detection:
   - "Create a project deadline for next 3 weeks" → multiDay: true, dateRange: "next_3_weeks", date: null
   - "Block time for vacation this week" → multiDay: true, dateRange: "this_week", date: null
   - "I'm busy next month" → multiDay: true, dateRange: "next_month", date: null

Intent Types:
- create_event: User wants to create a calendar event (meetings, appointments, events)
- set_reminder: User wants to set a reminder (tasks, notes to self, things to remember)
- create_reminder: Alternative for set_reminder
- get_information: General information requests
- get_events: User wants to see their calendar events ("show my events", "what's on my calendar")
- get_reminders: User wants to see their reminders ("show my reminders", "what do I need to do")
- update_event: User wants to modify an existing event ("change my meeting time", "move lunch to 2pm")
- update_reminder: User wants to modify an existing reminder ("change reminder time", "update my task")
- delete_event: User wants to delete an event ("cancel my meeting", "delete lunch", "remove my appointment")
- delete_reminder: User wants to delete a reminder ("delete my reminder", "remove task", "cancel reminder")
- clarify: The request is ambiguous and needs clarification
- unsupported: The request cannot be handled
- general: General conversation or greeting

Date Processing Examples:
- "tomorrow" = next day's date + "tomorrow" in relativeTime
- "next Monday" = calculate next Monday's date + "next Monday" in relativeTime
- "in 3 days" = calculate date 3 days from now + "in 3 days" in relativeTime

Examples:
For "Hello" respond with:
{"intent":"general","entities":{"title":null,"date":null,"time":null,"reminderText":null,"relativeTime":null,"description":null,"location":null,"reminderMinutes":null,"limit":null,"eventId":null,"reminderId":null,"searchQuery":null,"duration":null,"priority":null,"recurring":null,"endDate":null,"participants":null,"dateRange":null,"multiDay":null},"confidence":1.0,"responseText":"Hello! How can I help you today?"}

For "Set a reminder to call mom tomorrow at 3pm" respond with:
{"intent":"set_reminder","entities":{"title":"Call mom","date":"2025-07-08","time":"15:00","reminderText":"Call mom","relativeTime":"tomorrow","description":null,"location":null,"reminderMinutes":null,"limit":null,"eventId":null,"reminderId":null,"searchQuery":null,"duration":null,"priority":null,"recurring":null,"endDate":null,"participants":null,"dateRange":null,"multiDay":null},"confidence":0.9,"responseText":"Setting reminder to call mom..."}

For "Schedule a meeting with John next Monday at 10am" respond with:
{"intent":"create_event","entities":{"title":"Meeting with John","date":"2025-07-14","time":"10:00","reminderText":null,"relativeTime":"next Monday","description":"Meeting with John","location":null,"reminderMinutes":15,"limit":null,"eventId":null,"reminderId":null,"searchQuery":null,"duration":null,"priority":null,"recurring":null,"endDate":null,"participants":null,"dateRange":null,"multiDay":false},"confidence":0.9,"responseText":"Scheduling meeting with John..."}

For "Block time for vacation this week" respond with:
{"intent":"create_event","entities":{"title":"Vacation","date":null,"time":null,"reminderText":null,"relativeTime":"this week","description":"Vacation time","location":null,"reminderMinutes":null,"limit":null,"eventId":null,"reminderId":null,"searchQuery":null,"duration":null,"priority":null,"recurring":null,"endDate":null,"participants":null,"dateRange":"this_week","multiDay":true},"confidence":0.9,"responseText":"Blocking calendar for vacation..."}

For "Create a project deadline for next 3 weeks" respond with:
{"intent":"create_event","entities":{"title":"Project deadline","date":null,"time":null,"reminderText":null,"relativeTime":"next 3 weeks","description":"Project work period","location":null,"reminderMinutes":1440,"limit":null,"eventId":null,"reminderId":null,"searchQuery":null,"duration":null,"priority":"high","recurring":null,"endDate":null,"participants":null,"dateRange":"next_3_weeks","multiDay":true},"confidence":0.9,"responseText":"Creating project deadline..."}

For "Show me my events today" respond with:
{"intent":"get_events","entities":{"title":null,"date":"2025-07-07","time":null,"reminderText":null,"relativeTime":"today","description":null,"location":null,"reminderMinutes":null,"limit":null,"eventId":null,"reminderId":null,"searchQuery":"today","duration":null,"priority":null,"recurring":null,"endDate":null,"participants":null,"dateRange":null,"multiDay":null},"confidence":0.9,"responseText":"Looking up your events for today..."}

For "Cancel my lunch meeting" respond with:
{"intent":"delete_event","entities":{"title":"lunch","date":null,"time":null,"reminderText":null,"relativeTime":null,"description":null,"location":null,"reminderMinutes":null,"limit":null,"eventId":null,"reminderId":null,"searchQuery":"lunch","duration":null,"priority":null,"recurring":null,"endDate":null,"participants":null,"dateRange":null,"multiDay":null},"confidence":0.8,"responseText":"Finding and canceling your lunch meeting..."}

For "Change my 3pm meeting to 4pm" respond with:
{"intent":"update_event","entities":{"title":null,"date":null,"time":"16:00","reminderText":null,"relativeTime":null,"description":null,"location":null,"reminderMinutes":null,"limit":null,"eventId":null,"reminderId":null,"searchQuery":"3pm","duration":null,"priority":null,"recurring":null,"endDate":null,"participants":null,"dateRange":null,"multiDay":null},"confidence":0.8,"responseText":"Updating your 3pm meeting to 4pm..."}`;


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