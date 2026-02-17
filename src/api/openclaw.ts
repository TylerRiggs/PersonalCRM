/**
 * OpenClaw API client
 *
 * Routes AI requests through a Vite dev server middleware at /api/chat.
 * The middleware shells out to `openclaw agent --message "..."` via CLI,
 * which uses the Gateway's WebSocket RPC — bypassing the known HTTP 405
 * bug (openclaw/openclaw#4417).
 *
 * The response is wrapped in OpenAI chat completion format so parsing is
 * consistent regardless of backend.
 */

const REQUEST_TIMEOUT_MS = 120_000; // CLI can be slow on first call

interface OpenClawConfig {
  /** Agent ID passed to `openclaw agent --agent <id>` */
  agentId: string;
}

let config: OpenClawConfig = {
  agentId: 'main',
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

/** Pull the assistant text out of the chat completion response. */
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

  // Fallback shapes
  if (typeof obj.message === 'string' && obj.message.length > 0) return obj.message;
  if (typeof obj.response === 'string' && obj.response.length > 0) return obj.response;
  if (typeof obj.text === 'string' && obj.text.length > 0) return obj.text;
  if (typeof obj.content === 'string' && obj.content.length > 0) return obj.content;
  if (typeof obj.result === 'string' && obj.result.length > 0) return obj.result;

  // Error from our middleware
  if (typeof obj.error === 'string') throw new Error(obj.error);

  const stringified = JSON.stringify(result, null, 2);
  if (stringified.length < 500) return stringified;
  return 'Received response but could not parse text content. Check Settings for API configuration.';
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
        'Cannot connect to the Vite dev server API middleware. ' +
          'Make sure the dev server is running (npm run dev).',
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------------------------------------------------------------------------
// Core: POST /api/chat
// ---------------------------------------------------------------------------

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Send a chat request through the Vite middleware → openclaw CLI.
 */
async function chatCompletion(messages: ChatMessage[]) {
  const res = await fetchWithTimeout('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      agentId: config.agentId,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText })) as Record<string, unknown>;
    const errorMsg = typeof body.error === 'string' ? body.error : `HTTP ${res.status}`;
    const stderr = typeof body.stderr === 'string' ? `\n${body.stderr}` : '';
    throw new Error(`OpenClaw error: ${errorMsg}${stderr}`);
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
 * Check if the OpenClaw CLI is available and the gateway is reachable.
 */
export async function checkHealth(): Promise<{ ok: boolean; version?: string; error?: string }> {
  try {
    const res = await fetch('/api/health');
    return await res.json();
  } catch {
    return { ok: false, error: 'Cannot reach the dev server health endpoint' };
  }
}

/**
 * List configured OpenClaw agents.
 */
export async function listAgents(): Promise<{ ok: boolean; output?: string; error?: string }> {
  try {
    const res = await fetch('/api/agents');
    return await res.json();
  } catch {
    return { ok: false, error: 'Cannot reach the dev server agents endpoint' };
  }
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
