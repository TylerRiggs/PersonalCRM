import {
  View,
  Flex,
  Heading,
  TextField,
  Button,
  Text,
  StatusLight,
  ActionButton,
  Checkbox,
} from '@adobe/react-spectrum';
import { useState, useEffect } from 'react';
import { configureOpenClaw, getOpenClawConfig } from '../api/openclaw';
import { db } from '../db';

export default function SettingsPage() {
  const config = getOpenClawConfig();
  const [apiUrl, setApiUrl] = useState(config.apiUrl);
  const [token, setToken] = useState(config.token);
  const [agentId, setAgentId] = useState(config.agentId);
  const [saved, setSaved] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [connectionDetail, setConnectionDetail] = useState('');

  // Post-Call Follow-Up settings
  const [autoShowPostCall, setAutoShowPostCall] = useState(false);
  const [autoRunAi, setAutoRunAi] = useState(false);

  const handleSave = () => {
    configureOpenClaw({
      apiUrl: apiUrl.trim(),
      token: token.trim(),
      agentId: agentId.trim() || 'main',
    });
    localStorage.setItem('openclaw_config', JSON.stringify({
      apiUrl: apiUrl.trim(),
      token: token.trim(),
      agentId: agentId.trim() || 'main',
    }));
    localStorage.setItem('postcall_settings', JSON.stringify({
      autoShowPostCall,
      autoRunAi,
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTestConnection = async () => {
    setConnectionStatus('unknown');
    setConnectionDetail('');
    try {
      // Use the /v1/chat/completions endpoint with a minimal request.
      // If apiUrl is blank, use relative URL (Vite proxy).
      const base = apiUrl.trim() || '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token.trim()) {
        headers['Authorization'] = `Bearer ${token.trim()}`;
      }

      const res = await fetch(`${base}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: `openclaw:${agentId.trim() || 'main'}`,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });

      if (res.ok) {
        setConnectionStatus('connected');
        setConnectionDetail('Chat completions endpoint is working');
      } else if (res.status === 404) {
        setConnectionStatus('error');
        setConnectionDetail(
          'Endpoint not found. Run: openclaw config set gateway.http.endpoints.chatCompletions.enabled true'
        );
      } else if (res.status === 401 || res.status === 403) {
        setConnectionStatus('error');
        setConnectionDetail(
          `Auth failed (${res.status}). Check your Bearer token.`
        );
      } else {
        const body = await res.text().catch(() => '');
        setConnectionStatus('error');
        setConnectionDetail(`HTTP ${res.status}: ${body || res.statusText}`);
      }
    } catch {
      setConnectionStatus('error');
      setConnectionDetail(
        'Cannot reach OpenClaw. Make sure it is running and the URL is correct.'
      );
    }
  };

  // Load saved config on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('openclaw_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.apiUrl != null) setApiUrl(parsed.apiUrl);
        if (parsed.token != null) setToken(parsed.token);
        if (parsed.agentId != null) setAgentId(parsed.agentId);
        // Migrate legacy sessionKey → agentId
        if (parsed.sessionKey && !parsed.agentId) setAgentId(parsed.sessionKey);
        configureOpenClaw(parsed);
      } catch {
        // ignore
      }
    }
    const savedPostCall = localStorage.getItem('postcall_settings');
    if (savedPostCall) {
      try {
        const parsed = JSON.parse(savedPostCall);
        setAutoShowPostCall(parsed.autoShowPostCall ?? false);
        setAutoRunAi(parsed.autoRunAi ?? false);
      } catch {
        // ignore
      }
    }
  }, []);

  const handleClearData = async () => {
    await db.delete();
    await db.open();
    window.location.reload();
  };

  return (
    <View>
      <Heading level={1} marginBottom="size-300">Settings</Heading>

      {/* OpenClaw Configuration */}
      <View
        borderWidth="thin"
        borderColor="dark"
        borderRadius="medium"
        padding="size-300"
        marginBottom="size-300"
      >
        <Heading level={3} marginBottom="size-200">OpenClaw Connection</Heading>
        <Text marginBottom="size-200" UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
          Uses the OpenAI-compatible /v1/chat/completions endpoint on the OpenClaw Gateway.
          Leave API URL blank to use the Vite dev proxy (recommended for local development).
        </Text>
        <Flex direction="column" gap="size-200">
          <TextField
            label="API URL (optional)"
            value={apiUrl}
            onChange={setApiUrl}
            width="100%"
            description="Leave blank to use Vite proxy. Direct: http://127.0.0.1:18789"
          />
          <TextField
            label="Bearer Token"
            value={token}
            onChange={setToken}
            width="100%"
            type="password"
            description="Run: openclaw config get gateway.auth.token"
          />
          <TextField
            label="Agent ID"
            value={agentId}
            onChange={setAgentId}
            width="size-3000"
            description="Default: main"
          />
          <Flex gap="size-100" alignItems="center" wrap>
            <Button variant="accent" onPress={handleSave}>
              <Text>{saved ? 'Saved!' : 'Save Settings'}</Text>
            </Button>
            <Button variant="secondary" onPress={handleTestConnection}>
              <Text>Test Connection</Text>
            </Button>
            {connectionStatus === 'connected' && (
              <StatusLight variant="positive">Connected</StatusLight>
            )}
            {connectionStatus === 'error' && (
              <StatusLight variant="negative">Connection Failed</StatusLight>
            )}
          </Flex>
          {connectionDetail && (
            <Text UNSAFE_style={{
              color: connectionStatus === 'error'
                ? 'var(--spectrum-global-color-red-600)'
                : 'var(--spectrum-global-color-green-600)',
              fontSize: '0.85em',
            }}>
              {connectionDetail}
            </Text>
          )}
        </Flex>
      </View>

      {/* Setup Instructions */}
      <View
        borderWidth="thin"
        borderColor="dark"
        borderRadius="medium"
        padding="size-300"
        marginBottom="size-300"
        UNSAFE_style={{ backgroundColor: 'var(--spectrum-global-color-gray-75)' }}
      >
        <Heading level={3} marginBottom="size-200">Setup Checklist</Heading>
        <Flex direction="column" gap="size-100">
          <Text>1. Make sure OpenClaw is running (default port 18789)</Text>
          <Text UNSAFE_style={{ fontFamily: 'monospace', paddingLeft: '16px', fontSize: '0.85em' }}>
            openclaw
          </Text>
          <Text>2. Enable the HTTP chat completions endpoint:</Text>
          <Text UNSAFE_style={{ fontFamily: 'monospace', paddingLeft: '16px', fontSize: '0.85em' }}>
            openclaw config set gateway.http.endpoints.chatCompletions.enabled true
          </Text>
          <Text>3. Get your auth token (if auth is enabled):</Text>
          <Text UNSAFE_style={{ fontFamily: 'monospace', paddingLeft: '16px', fontSize: '0.85em' }}>
            openclaw config get gateway.auth.token
          </Text>
        </Flex>
      </View>

      {/* Post-Call Follow-Up Settings */}
      <View
        borderWidth="thin"
        borderColor="dark"
        borderRadius="medium"
        padding="size-300"
        marginBottom="size-300"
      >
        <Heading level={3} marginBottom="size-200">Post-Call Follow-Up</Heading>
        <Flex direction="column" gap="size-150">
          <Checkbox isSelected={autoShowPostCall} onChange={setAutoShowPostCall}>
            Always show Post-Call Follow-Up after logging interaction
          </Checkbox>
          <Checkbox isSelected={autoRunAi} onChange={setAutoRunAi}>
            Auto-run AI analysis on call follow-up
          </Checkbox>
        </Flex>
      </View>

      {/* Data Management */}
      <View
        borderWidth="thin"
        borderColor="dark"
        borderRadius="medium"
        padding="size-300"
        marginBottom="size-300"
      >
        <Heading level={3} marginBottom="size-200">Data Management</Heading>
        <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
          All data is stored locally in your browser using IndexedDB. Clearing data will
          permanently remove all opportunities, interactions, tasks, and dependencies.
        </Text>
        <Flex marginTop="size-200">
          <ActionButton
            onPress={handleClearData}
            UNSAFE_style={{ color: 'var(--spectrum-global-color-red-600)' }}
          >
            <Text>Clear All Data</Text>
          </ActionButton>
        </Flex>
      </View>

      {/* Keyboard Shortcuts */}
      <View
        borderWidth="thin"
        borderColor="dark"
        borderRadius="medium"
        padding="size-300"
      >
        <Heading level={3} marginBottom="size-200">Keyboard Shortcuts</Heading>
        <Flex direction="column" gap="size-100">
          <Flex gap="size-200">
            <Text UNSAFE_style={{ fontFamily: 'monospace', minWidth: '180px' }}>Cmd/Ctrl + K</Text>
            <Text>New Opportunity</Text>
          </Flex>
          <Flex gap="size-200">
            <Text UNSAFE_style={{ fontFamily: 'monospace', minWidth: '180px' }}>/</Text>
            <Text>Focus Search</Text>
          </Flex>
          <Flex gap="size-200">
            <Text UNSAFE_style={{ fontFamily: 'monospace', minWidth: '180px' }}>Esc</Text>
            <Text>Clear Search / Close</Text>
          </Flex>
          <Flex gap="size-200">
            <Text UNSAFE_style={{ fontFamily: 'monospace', minWidth: '180px' }}>Cmd/Ctrl + Enter</Text>
            <Text>Save form (when in Post-Call Follow-Up)</Text>
          </Flex>
          <Flex gap="size-200">
            <Text UNSAFE_style={{ fontFamily: 'monospace', minWidth: '180px' }}>Cmd/Ctrl + Shift + A</Text>
            <Text>Trigger AI analysis (in Post-Call Follow-Up)</Text>
          </Flex>
        </Flex>
      </View>
    </View>
  );
}
