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
  const [sessionKey, setSessionKey] = useState(config.sessionKey);
  const [saved, setSaved] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');

  // Post-Call Follow-Up settings
  const [autoShowPostCall, setAutoShowPostCall] = useState(false);
  const [autoRunAi, setAutoRunAi] = useState(false);

  const handleSave = () => {
    configureOpenClaw({
      apiUrl: apiUrl.trim(),
      token: token.trim(),
      sessionKey: sessionKey.trim() || 'main',
    });
    localStorage.setItem('openclaw_config', JSON.stringify({
      apiUrl: apiUrl.trim(),
      token: token.trim(),
      sessionKey: sessionKey.trim() || 'main',
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
    try {
      const res = await fetch(`${apiUrl.trim()}/api/sessions/list`, {
        headers: token.trim() ? { Authorization: `Bearer ${token.trim()}` } : {},
      });
      if (res.ok) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
      }
    } catch {
      setConnectionStatus('error');
    }
  };

  // Load saved config on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('openclaw_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setApiUrl(parsed.apiUrl ?? apiUrl);
        setToken(parsed.token ?? token);
        setSessionKey(parsed.sessionKey ?? sessionKey);
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
        <Flex direction="column" gap="size-200">
          <TextField
            label="API URL"
            value={apiUrl}
            onChange={setApiUrl}
            width="100%"
            description="Default: http://localhost:18789"
          />
          <TextField
            label="Bearer Token"
            value={token}
            onChange={setToken}
            width="100%"
            type="password"
            description="Found in ~/.openclaw/gateway.json (token field)"
          />
          <TextField
            label="Session Key"
            value={sessionKey}
            onChange={setSessionKey}
            width="size-3000"
            description="Default: main"
          />
          <Flex gap="size-100" alignItems="center">
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
