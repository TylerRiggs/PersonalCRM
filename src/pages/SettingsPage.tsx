import {
  View,
  Flex,
  Heading,
  TextField,
  Button,
  Text,
  Well,
  Divider,
  StatusLight,
  ActionButton,
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

  const handleSave = () => {
    configureOpenClaw({
      apiUrl: apiUrl.trim(),
      token: token.trim(),
      sessionKey: sessionKey.trim() || 'main',
    });
    // Persist to localStorage
    localStorage.setItem('openclaw_config', JSON.stringify({
      apiUrl: apiUrl.trim(),
      token: token.trim(),
      sessionKey: sessionKey.trim() || 'main',
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
    const saved = localStorage.getItem('openclaw_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setApiUrl(parsed.apiUrl ?? apiUrl);
        setToken(parsed.token ?? token);
        setSessionKey(parsed.sessionKey ?? sessionKey);
        configureOpenClaw(parsed);
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

      {/* Data Management */}
      <View
        borderWidth="thin"
        borderColor="dark"
        borderRadius="medium"
        padding="size-300"
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
        marginTop="size-300"
      >
        <Heading level={3} marginBottom="size-200">Keyboard Shortcuts</Heading>
        <Flex direction="column" gap="size-100">
          <Flex gap="size-200">
            <Text UNSAFE_style={{ fontFamily: 'monospace', minWidth: '120px' }}>Cmd/Ctrl + K</Text>
            <Text>New Opportunity</Text>
          </Flex>
          <Flex gap="size-200">
            <Text UNSAFE_style={{ fontFamily: 'monospace', minWidth: '120px' }}>/</Text>
            <Text>Focus Search</Text>
          </Flex>
        </Flex>
      </View>
    </View>
  );
}
