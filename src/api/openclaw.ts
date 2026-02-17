const DEFAULT_API_URL = 'http://localhost:18789';
const REQUEST_TIMEOUT_MS = 30_000;

interface OpenClawConfig {
  apiUrl: string;
  token: string;
  sessionKey: string;
}

let config: OpenClawConfig = {
  apiUrl: DEFAULT_API_URL,
  token: '',
  sessionKey: 'main',
};

export function configureOpenClaw(partial: Partial<OpenClawConfig>) {
  config = { ...config, ...partial };
}

export function getOpenClawConfig(): OpenClawConfig {
  return { ...config };
}

function extractTextFromResponse(result: unknown): string {
  if (typeof result === 'string') return result;
  if (result == null) return '';

  const obj = result as Record<string, unknown>;

  // Check common response shapes
  if (typeof obj.message === 'string' && obj.message.length > 0) return obj.message;
  if (typeof obj.response === 'string' && obj.response.length > 0) return obj.response;
  if (typeof obj.text === 'string' && obj.text.length > 0) return obj.text;
  if (typeof obj.content === 'string' && obj.content.length > 0) return obj.content;
  if (typeof obj.result === 'string' && obj.result.length > 0) return obj.result;

  // Check nested data.message
  if (obj.data && typeof obj.data === 'object') {
    const data = obj.data as Record<string, unknown>;
    if (typeof data.message === 'string') return data.message;
    if (typeof data.response === 'string') return data.response;
    if (typeof data.text === 'string') return data.text;
  }

  // Check for choices array (OpenAI-like format)
  if (Array.isArray(obj.choices) && obj.choices.length > 0) {
    const choice = obj.choices[0] as Record<string, unknown>;
    if (choice.message && typeof choice.message === 'object') {
      const msg = choice.message as Record<string, unknown>;
      if (typeof msg.content === 'string') return msg.content;
    }
    if (typeof choice.text === 'string') return choice.text;
  }

  // Fallback: stringify but warn
  const stringified = JSON.stringify(result, null, 2);
  if (stringified.length < 500) return stringified;
  return 'Received response but could not parse text content. Check Settings for API configuration.';
}

async function request(path: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${config.apiUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
        ...options.headers,
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(
        `OpenClaw API error (${res.status}): ${body || res.statusText}. ` +
        'Verify your API URL and token in Settings.'
      );
    }
    return res.json();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(
        `OpenClaw request timed out after ${REQUEST_TIMEOUT_MS / 1000}s. ` +
        'The AI may be processing a complex request, or the server may be unresponsive.'
      );
    }
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error(
        `Cannot connect to OpenClaw at ${config.apiUrl}. ` +
        'Make sure OpenClaw is running and the API URL is correct in Settings.'
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function sendMessage(message: string, sessionKey?: string) {
  return request('/api/sessions/send', {
    method: 'POST',
    body: JSON.stringify({
      sessionKey: sessionKey ?? config.sessionKey,
      message,
    }),
  });
}

export async function listSessions() {
  return request('/api/sessions/list');
}

export async function getSessionHistory(key: string) {
  return request(`/api/sessions/${encodeURIComponent(key)}/history`);
}

export async function suggestNextActions(context: {
  accountName: string;
  dealName: string;
  stage: string;
  lastAction: string;
  challenges: string[];
  recentInteractions: string[];
}): Promise<string> {
  const message = `Suggest next actions for this opportunity:

Account: ${context.accountName}
Deal: ${context.dealName}
Stage: ${context.stage}
Last Action: ${context.lastAction}
Challenges: ${context.challenges.join(', ') || 'None'}
Recent Interactions: ${context.recentInteractions.join('; ') || 'None'}

What should I do next? Please provide 3-5 specific, actionable recommendations.`;

  const result = await sendMessage(message);
  return extractTextFromResponse(result);
}

export interface CallAnalysisResult {
  nextActions: string[];
  followUpEmail: string;
  crmUpdate: string;
  risks: string[];
}

export async function analyzeCallAndSuggest(context: {
  accountName: string;
  dealName: string;
  stage: string;
  summary: string;
  transcript?: string;
  personalNotes?: string;
  participants: string[];
  outcomes: string[];
  currentChallenges: string[];
}): Promise<CallAnalysisResult> {
  const message = `You are analyzing a sales call for Tyler, an Adobe Account Executive.

OPPORTUNITY CONTEXT:
- Account: ${context.accountName}
- Deal: ${context.dealName}
- Stage: ${context.stage}
- Current Challenges: ${context.currentChallenges.join(', ') || 'None'}

CALL DETAILS:
- Participants: ${context.participants.join(', ') || 'N/A'}
- Summary: ${context.summary}
${context.transcript ? `- Transcript: ${context.transcript}` : ''}
${context.personalNotes ? `- Tyler's Private Notes: ${context.personalNotes}` : ''}
- Outcomes/Commitments: ${context.outcomes.join(', ') || 'None specified'}

TASKS:
1. Suggest 3-5 specific next actions Tyler should take
2. Draft a professional follow-up email to the customer
3. Generate the CRM update snippet in Adobe's format (Last Action, Challenges, Next Action, Risk)
4. Identify any risks or red flags from the call

Format your response as JSON with keys: nextActions (array of strings), followUpEmail (string), crmUpdate (string), risks (array of strings)`;

  const result = await sendMessage(message);
  const text = extractTextFromResponse(result);

  // Try to parse as JSON
  try {
    const jsonMatch = text.match(/\{[\s\S]*"nextActions"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        nextActions: Array.isArray(parsed.nextActions) ? parsed.nextActions : [],
        followUpEmail: typeof parsed.followUpEmail === 'string' ? parsed.followUpEmail : '',
        crmUpdate: typeof parsed.crmUpdate === 'string' ? parsed.crmUpdate : '',
        risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      };
    }
  } catch {
    // Fall through to plain text fallback
  }

  return {
    nextActions: [text],
    followUpEmail: '',
    crmUpdate: '',
    risks: [],
  };
}
