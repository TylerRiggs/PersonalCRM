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
import { configureOpenClaw, getOpenClawConfig, checkHealth, listAgents } from '../api/openclaw';
import { db } from '../db';

export default function SettingsPage() {
  const config = getOpenClawConfig();
  const [agentId, setAgentId] = useState(config.agentId);
  const [saved, setSaved] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [connectionDetail, setConnectionDetail] = useState('');
  const [agentsOutput, setAgentsOutput] = useState('');

  // Post-Call Follow-Up settings
  const [autoShowPostCall, setAutoShowPostCall] = useState(false);
  const [autoRunAi, setAutoRunAi] = useState(false);

  const handleSave = () => {
    configureOpenClaw({
      agentId: agentId.trim() || 'main',
    });
    localStorage.setItem('openclaw_config', JSON.stringify({
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
    setConnectionDetail('Testing...');
    setAgentsOutput('');

    const [healthResult, agentsResult] = await Promise.all([
      checkHealth(),
      listAgents(),
    ]);

    if (healthResult.ok) {
      setConnectionStatus('connected');
      let detail = `OpenClaw ${healthResult.version} is available`;
      if (agentsResult.ok && agentsResult.output) {
        detail += ` — Agents detected (see below)`;
        setAgentsOutput(agentsResult.output);
      }
      setConnectionDetail(detail);
    } else {
      setConnectionStatus('error');
      setConnectionDetail(healthResult.error || 'OpenClaw CLI not found');
    }
  };

  // Load saved config on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('openclaw_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.agentId != null) setAgentId(parsed.agentId);
        // Migrate legacy values
        if (parsed.sessionKey && !parsed.agentId) setAgentId(parsed.sessionKey);
        // agentId 'main' is the standard default
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
          AI features use the OpenClaw CLI via the Vite dev server.
          No API URL or token needed — the CLI handles authentication with the Gateway automatically.
          Set the Agent ID to match one of your configured agents (run {'\u2018'}openclaw agents list{'\u2019'} to see them).
        </Text>
        <Flex direction="column" gap="size-200">
          <TextField
            label="Agent ID"
            value={agentId}
            onChange={setAgentId}
            width="size-3000"
            description={'The --agent name passed to the CLI. Use "openclaw agents list" to find yours.'}
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
              <StatusLight variant="negative">Not Available</StatusLight>
            )}
          </Flex>
          {connectionDetail && (
            <Text UNSAFE_style={{
              color: connectionStatus === 'error'
                ? 'var(--spectrum-global-color-red-600)'
                : connectionStatus === 'connected'
                  ? 'var(--spectrum-global-color-green-600)'
                  : 'var(--spectrum-global-color-gray-600)',
              fontSize: '0.85em',
            }}>
              {connectionDetail}
            </Text>
          )}
          {agentsOutput && (
            <View
              borderWidth="thin"
              borderColor="dark"
              borderRadius="small"
              padding="size-150"
              UNSAFE_style={{ backgroundColor: 'var(--spectrum-global-color-gray-75)', overflow: 'auto', maxHeight: '200px' }}
            >
              <Text UNSAFE_style={{ fontFamily: 'monospace', fontSize: '0.8em', whiteSpace: 'pre-wrap' }}>
                {agentsOutput}
              </Text>
            </View>
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
          <Text>1. Install OpenClaw globally:</Text>
          <Text UNSAFE_style={{ fontFamily: 'monospace', paddingLeft: '16px', fontSize: '0.85em' }}>
            npm install -g openclaw@latest
          </Text>
          <Text>2. Run the onboarding wizard:</Text>
          <Text UNSAFE_style={{ fontFamily: 'monospace', paddingLeft: '16px', fontSize: '0.85em' }}>
            openclaw setup
          </Text>
          <Text>3. Start the Gateway (runs in background):</Text>
          <Text UNSAFE_style={{ fontFamily: 'monospace', paddingLeft: '16px', fontSize: '0.85em' }}>
            openclaw gateway start
          </Text>
          <Text>4. List your agents and note the name:</Text>
          <Text UNSAFE_style={{ fontFamily: 'monospace', paddingLeft: '16px', fontSize: '0.85em' }}>
            openclaw agents list
          </Text>
          <Text>5. Verify it works (replace YOUR_AGENT with the name from step 4):</Text>
          <Text UNSAFE_style={{ fontFamily: 'monospace', paddingLeft: '16px', fontSize: '0.85em' }}>
            openclaw agent --agent YOUR_AGENT --message &quot;Hello&quot;
          </Text>
          <Text>6. Set the Agent ID above to match, then click Test Connection.</Text>
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
