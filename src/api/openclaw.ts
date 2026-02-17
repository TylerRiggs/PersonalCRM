const DEFAULT_API_URL = 'http://localhost:18789';

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

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${config.apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`OpenClaw API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
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
  return result?.message ?? result?.response ?? JSON.stringify(result);
}
