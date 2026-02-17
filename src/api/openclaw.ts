/**
 * OpenClaw Gateway API client
 *
 * Uses the OpenAI-compatible /v1/chat/completions endpoint.
 * In dev, Vite proxies /v1/* to the Gateway (default http://127.0.0.1:18789)
 * so the browser never makes a cross-origin request.
 *
 * Prerequisites – run once in a terminal:
 *   openclaw config set gateway.http.endpoints.chatCompletions.enabled true
 */

const REQUEST_TIMEOUT_MS = 30_000;

interface OpenClawConfig {
  /** Base URL for direct calls (empty = use Vite proxy via relative URLs) */
  apiUrl: string;
  /** Bearer token for gateway auth */
  token: string;
  /** Agent ID routed via x-openclaw-agent-id header */
  agentId: string;
  /**
   * Stable user string so the Gateway derives a persistent session key
   * for multi-turn conversations.
   */
  user: string;
}

let config: OpenClawConfig = {
  apiUrl: '', // empty = relative (goes through Vite proxy)
  token: '',
  agentId: 'main',
  user: 'sales-workload-manager',
};

export function configureOpenClaw(partial: Partial<OpenClawConfig>) {
  config = { ...config, ...partial };
}

export function getOpenClawConfig(): OpenClawConfig {
  return { ...config };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Pull the assistant text out of an OpenAI-style chat completion response. */
function extractAssistantContent(result: unknown): string {
  if (typeof result === 'string') return result;
  if (result == null) return '';

  const obj = result as Record<string, unknown>;

  // Standard OpenAI chat completion: choices[0].message.content
  if (Array.isArray(obj.choices) && obj.choices.length > 0) {
    const choice = obj.choices[0] as Record<string, unknown>;
    if (choice.message && typeof choice.message === 'object') {
      const msg = choice.message as Record<string, unknown>;
      if (typeof msg.content === 'string') return msg.content;
    }
    if (typeof choice.text === 'string') return choice.text;
  }

  // Fallback: common shapes from other providers
  if (typeof obj.message === 'string' && obj.message.length > 0) return obj.message;
  if (typeof obj.response === 'string' && obj.response.length > 0) return obj.response;
  if (typeof obj.text === 'string' && obj.text.length > 0) return obj.text;
  if (typeof obj.content === 'string' && obj.content.length > 0) return obj.content;
  if (typeof obj.result === 'string' && obj.result.length > 0) return obj.result;

  // Nested data.*
  if (obj.data && typeof obj.data === 'object') {
    const data = obj.data as Record<string, unknown>;
    if (typeof data.message === 'string') return data.message;
    if (typeof data.response === 'string') return data.response;
    if (typeof data.text === 'string') return data.text;
  }

  const stringified = JSON.stringify(result, null, 2);
  if (stringified.length < 500) return stringified;
  return 'Received response but could not parse text content. Check Settings for API configuration.';
}

function baseUrl(): string {
  return config.apiUrl || ''; // relative when empty
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`;
  }
  if (config.agentId) {
    headers['x-openclaw-agent-id'] = config.agentId;
  }
  return headers;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(
        `OpenClaw request timed out after ${REQUEST_TIMEOUT_MS / 1000}s. ` +
          'The AI may be processing a complex request, or the server may be unresponsive.',
      );
    }
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error(
        `Cannot connect to OpenClaw at ${baseUrl() || 'localhost (via proxy)'}. ` +
          'Make sure OpenClaw is running and the API URL is correct in Settings.',
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Chat Completions  (POST /v1/chat/completions)
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Send a chat completion request to the OpenClaw gateway.
 * Returns the raw JSON response.
 */
async function chatCompletion(messages: ChatMessage[]) {
  const url = `${baseUrl()}/v1/chat/completions`;

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      model: `openclaw:${config.agentId}`,
      messages,
      user: config.user,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 404) {
      throw new Error(
        'OpenClaw returned 404 for /v1/chat/completions. ' +
          'Enable the endpoint: openclaw config set gateway.http.endpoints.chatCompletions.enabled true',
      );
    }
    throw new Error(
      `OpenClaw API error (${res.status}): ${body || res.statusText}. ` +
        'Verify your API URL and token in Settings.',
    );
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a single user message and get the assistant's text reply.
 */
export async function sendMessage(message: string): Promise<string> {
  const result = await chatCompletion([{ role: 'user', content: message }]);
  return extractAssistantContent(result);
}

/**
 * Send a message with a system prompt and get the assistant's text reply.
 */
export async function sendMessageWithSystem(
  system: string,
  message: string,
): Promise<string> {
  const result = await chatCompletion([
    { role: 'system', content: system },
    { role: 'user', content: message },
  ]);
  return extractAssistantContent(result);
}

/**
 * List sessions via the /tools/invoke endpoint.
 */
export async function listSessions() {
  const url = `${baseUrl()}/tools/invoke`;
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      tool: 'sessions_list',
      action: 'json',
      args: {},
      sessionKey: 'main',
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to list sessions (${res.status}): ${body || res.statusText}`);
  }
  return res.json();
}

/**
 * Get session history via the /tools/invoke endpoint.
 */
export async function getSessionHistory(key: string) {
  const url = `${baseUrl()}/tools/invoke`;
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      tool: 'sessions_history',
      action: 'json',
      args: { sessionKey: key },
      sessionKey: key,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to get session history (${res.status}): ${body || res.statusText}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Higher-level helpers
// ---------------------------------------------------------------------------

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

  return sendMessage(message);
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
  const userMessage = `OPPORTUNITY CONTEXT:
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

  const system =
    'You are analyzing a sales call for Tyler, an Adobe Account Executive. ' +
    'Always respond with valid JSON matching the requested schema.';

  const text = await sendMessageWithSystem(system, userMessage);

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
