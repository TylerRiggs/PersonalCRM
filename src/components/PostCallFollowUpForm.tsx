import {
  View,
  Flex,
  Heading,
  TextField,
  TextArea,
  Picker,
  Item,
  Button,
  ActionButton,
  Text,
  Badge,
  Well,
  Divider,
} from '@adobe/react-spectrum';
import Close from '@spectrum-icons/workflow/Close';
import Add from '@spectrum-icons/workflow/Add';
import Chat from '@spectrum-icons/workflow/Chat';
import LockClosed from '@spectrum-icons/workflow/LockClosed';
import { useState, useEffect, useCallback, type KeyboardEvent } from 'react';
import { createInteraction } from '../hooks/useInteractions';
import { updateOpportunity } from '../hooks/useOpportunities';
import { createTodo } from '../hooks/useTodos';
import { analyzeCallAndSuggest, type CallAnalysisResult } from '../api/openclaw';
import type { Opportunity, InteractionType, Priority } from '../types';

const CALL_TYPES: { key: InteractionType; label: string }[] = [
  { key: 'customer_call', label: 'Customer Call' },
  { key: 'internal_call', label: 'Internal Call' },
  { key: 'demo', label: 'Demo' },
  { key: 'discovery_call', label: 'Discovery Call' },
  { key: 'executive_briefing', label: 'Executive Briefing' },
  { key: 'meeting', label: 'Meeting' },
];

interface ActionItem {
  task: string;
  dueDate: string;
  priority: Priority;
}

interface Props {
  opportunity: Opportunity;
  onClose: () => void;
}

const DRAFT_KEY_PREFIX = 'postcall_draft_';

export default function PostCallFollowUpForm({ opportunity, onClose }: Props) {
  const draftKey = `${DRAFT_KEY_PREFIX}${opportunity.id}`;

  const [type, setType] = useState<InteractionType>('customer_call');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState('');
  const [transcript, setTranscript] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const [personalNotes, setPersonalNotes] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [newParticipant, setNewParticipant] = useState('');
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [newOutcome, setNewOutcome] = useState('');
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [newTask, setNewTask] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('Medium');

  // Opportunity status updates
  const [updateLastAction, setUpdateLastAction] = useState('');
  const [updateNextAction, setUpdateNextAction] = useState('');
  const [updateRisk, setUpdateRisk] = useState(opportunity.risk);

  // AI
  const [aiResult, setAiResult] = useState<CallAnalysisResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  // Auto-save draft to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      const draft = {
        type, date, summary, transcript, personalNotes,
        participants, outcomes, updateLastAction, updateNextAction, updateRisk,
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    }, 500);
    return () => clearTimeout(timer);
  }, [type, date, summary, transcript, personalNotes, participants, outcomes, updateLastAction, updateNextAction, updateRisk, draftKey]);

  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const d = JSON.parse(saved);
        if (d.type) setType(d.type);
        if (d.date) setDate(d.date);
        if (d.summary) setSummary(d.summary);
        if (d.transcript) { setTranscript(d.transcript); setShowTranscript(true); }
        if (d.personalNotes) setPersonalNotes(d.personalNotes);
        if (d.participants) setParticipants(d.participants);
        if (d.outcomes) setOutcomes(d.outcomes);
        if (d.updateLastAction) setUpdateLastAction(d.updateLastAction);
        if (d.updateNextAction) setUpdateNextAction(d.updateNextAction);
        if (d.updateRisk) setUpdateRisk(d.updateRisk);
      } catch { /* ignore */ }
    }
  }, [draftKey]);

  // Keyboard shortcuts: Cmd+Enter to save, Cmd+Shift+A for AI analysis
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (summary.trim()) handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        if (summary.trim() && !aiLoading) handleAiAnalysis();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [summary, aiLoading]);

  const addParticipant = () => {
    const t = newParticipant.trim();
    if (t && !participants.includes(t)) {
      setParticipants([...participants, t]);
      setNewParticipant('');
    }
  };

  const addOutcome = () => {
    const t = newOutcome.trim();
    if (t) {
      setOutcomes([...outcomes, t]);
      setNewOutcome('');
    }
  };

  const addActionItem = () => {
    if (!newTask.trim()) return;
    setActionItems([...actionItems, {
      task: newTask.trim(),
      dueDate: newTaskDue || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      priority: newTaskPriority,
    }]);
    setNewTask('');
    setNewTaskDue('');
    setNewTaskPriority('Medium');
  };

  const handleAiAnalysis = async () => {
    if (!summary.trim()) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await analyzeCallAndSuggest({
        accountName: opportunity.accountName,
        dealName: opportunity.dealName,
        stage: opportunity.stage,
        summary,
        transcript: transcript || undefined,
        personalNotes: personalNotes || undefined,
        participants,
        outcomes,
        currentChallenges: opportunity.challenges,
      });
      setAiResult(result);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to analyze call');
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiSuggestions = () => {
    if (!aiResult) return;
    // Add AI-suggested action items as todos
    for (const action of aiResult.nextActions) {
      if (!actionItems.find((a) => a.task === action)) {
        setActionItems((prev) => [...prev, {
          task: action,
          dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          priority: 'Medium' as Priority,
        }]);
      }
    }
  };

  const handleSave = async () => {
    if (!summary.trim()) return;
    setSaving(true);
    try {
      const typeLabel = CALL_TYPES.find((t) => t.key === type)?.label ?? type;

      // Create the interaction
      await createInteraction({
        opportunityId: opportunity.id,
        type,
        date: new Date(date),
        notes: summary.trim(),
        summary: summary.trim(),
        transcript: transcript || undefined,
        personalNotes: personalNotes || undefined,
        participants,
        outcomes,
        aiAnalysis: aiResult ? JSON.stringify(aiResult) : undefined,
        followUpDraft: aiResult?.followUpEmail || undefined,
      });

      // Create action items as todos
      for (const item of actionItems) {
        await createTodo({
          opportunityId: opportunity.id,
          task: item.task,
          dueDate: new Date(item.dueDate),
          completed: false,
          priority: item.priority,
        });
      }

      // Update opportunity status
      const oppUpdate: Record<string, unknown> = {};
      const lastActionStr = updateLastAction.trim() ||
        `${typeLabel} - ${new Date(date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}`;
      oppUpdate.lastAction = lastActionStr;
      if (updateNextAction.trim()) oppUpdate.nextAction = updateNextAction.trim();
      if (updateRisk !== opportunity.risk) oppUpdate.risk = updateRisk;
      await updateOpportunity(opportunity.id, oppUpdate);

      // Clear draft
      localStorage.removeItem(draftKey);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const summaryLength = summary.length;

  return (
    <View
      borderWidth="thin"
      borderColor="informative"
      borderRadius="medium"
      padding="size-300"
      marginBottom="size-200"
      backgroundColor="gray-50"
    >
      <Flex justifyContent="space-between" alignItems="center" marginBottom="size-200">
        <Heading level={3}>Post-Call Follow-Up</Heading>
        <ActionButton isQuiet onPress={onClose}>
          <Close />
        </ActionButton>
      </Flex>

      <Flex direction="column" gap="size-200">
        {/* Call type & date */}
        <Flex gap="size-200" wrap>
          <Picker
            label="Call Type"
            selectedKey={type}
            onSelectionChange={(key) => setType(key as InteractionType)}
            width="size-3000"
          >
            {CALL_TYPES.map((t) => (
              <Item key={t.key}>{t.label}</Item>
            ))}
          </Picker>
          <TextField
            label="Date"
            value={date}
            onChange={setDate}
            type="date"
            width="size-2400"
          />
        </Flex>

        {/* Participants */}
        <View>
          <Text UNSAFE_style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
            Participants
          </Text>
          {participants.length > 0 && (
            <Flex gap="size-50" wrap marginBottom="size-100">
              {participants.map((p, i) => (
                <View
                  key={i}
                  UNSAFE_style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'var(--spectrum-global-color-blue-100)',
                    border: '1px solid var(--spectrum-global-color-blue-400)',
                    borderRadius: '16px',
                    padding: '2px 8px 2px 12px',
                    fontSize: '13px',
                  }}
                >
                  <Text UNSAFE_style={{ fontSize: '13px' }}>{p}</Text>
                  <ActionButton
                    isQuiet
                    onPress={() => setParticipants(participants.filter((_, j) => j !== i))}
                    UNSAFE_style={{ minWidth: 0, padding: '0 2px', height: '20px' }}
                  >
                    <Close size="XS" />
                  </ActionButton>
                </View>
              ))}
            </Flex>
          )}
          <Flex gap="size-100" alignItems="end">
            <TextField
              label=""
              aria-label="Add participant"
              value={newParticipant}
              onChange={setNewParticipant}
              onKeyDown={(e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); addParticipant(); } }}
              width="size-3600"
              placeholder="Name (Role) - press Enter to add"
            />
            <ActionButton onPress={addParticipant} isDisabled={!newParticipant.trim()}>
              <Add size="S" />
            </ActionButton>
          </Flex>
        </View>

        {/* Call Summary */}
        <View>
          <TextArea
            label="Call Summary"
            value={summary}
            onChange={setSummary}
            isRequired
            width="100%"
            description={`${summaryLength}/500 chars - keep it concise`}
          />
        </View>

        {/* Transcript (collapsible) */}
        <View>
          <ActionButton
            isQuiet
            onPress={() => setShowTranscript(!showTranscript)}
            UNSAFE_style={{ marginBottom: '4px' }}
          >
            <Text>{showTranscript ? 'Hide' : 'Show'} Transcript (optional)</Text>
          </ActionButton>
          {showTranscript && (
            <TextArea
              label="Full Transcript"
              value={transcript}
              onChange={setTranscript}
              width="100%"
              height="size-2400"
              description="Paste from Zoom/Teams/Chorus"
            />
          )}
        </View>

        {/* Personal Notes */}
        <View
          UNSAFE_style={{
            background: 'var(--spectrum-global-color-yellow-100)',
            border: '1px solid var(--spectrum-global-color-yellow-400)',
            borderRadius: '8px',
            padding: '12px',
          }}
        >
          <Flex alignItems="center" gap="size-50" marginBottom="size-100">
            <LockClosed size="S" />
            <Text UNSAFE_style={{ fontWeight: 600, fontSize: '13px' }}>Personal Notes (Private)</Text>
          </Flex>
          <TextArea
            label=""
            aria-label="Personal notes"
            value={personalNotes}
            onChange={setPersonalNotes}
            width="100%"
            placeholder="Your observations, gut feel, concerns..."
          />
        </View>

        {/* Outcomes */}
        <View>
          <Text UNSAFE_style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
            Outcomes / Commitments
          </Text>
          {outcomes.length > 0 && (
            <Flex direction="column" gap="size-50" marginBottom="size-100">
              {outcomes.map((o, i) => (
                <Flex key={i} alignItems="center" gap="size-100">
                  <Text UNSAFE_style={{ fontSize: '13px' }}>&#8226; {o}</Text>
                  <ActionButton
                    isQuiet
                    onPress={() => setOutcomes(outcomes.filter((_, j) => j !== i))}
                    UNSAFE_style={{ minWidth: 0, padding: 0, height: '18px' }}
                  >
                    <Close size="XS" />
                  </ActionButton>
                </Flex>
              ))}
            </Flex>
          )}
          <Flex gap="size-100" alignItems="end">
            <TextField
              label=""
              aria-label="Add outcome"
              value={newOutcome}
              onChange={setNewOutcome}
              onKeyDown={(e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); addOutcome(); } }}
              width="100%"
              placeholder="Specific deliverable or commitment - press Enter"
            />
            <ActionButton onPress={addOutcome} isDisabled={!newOutcome.trim()}>
              <Add size="S" />
            </ActionButton>
          </Flex>
        </View>

        {/* Action Items */}
        <View>
          <Heading level={5} marginBottom="size-100">Quick Add Action Items</Heading>
          {actionItems.length > 0 && (
            <Flex direction="column" gap="size-50" marginBottom="size-100">
              {actionItems.map((item, i) => (
                <Flex key={i} alignItems="center" gap="size-100">
                  <Badge variant={item.priority === 'High' ? 'negative' : item.priority === 'Medium' ? 'info' : 'positive'}>
                    {item.priority}
                  </Badge>
                  <Text UNSAFE_style={{ fontSize: '13px', flex: 1 }}>{item.task}</Text>
                  <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
                    Due: {item.dueDate}
                  </Text>
                  <ActionButton
                    isQuiet
                    onPress={() => setActionItems(actionItems.filter((_, j) => j !== i))}
                    UNSAFE_style={{ minWidth: 0, padding: 0, height: '18px' }}
                  >
                    <Close size="XS" />
                  </ActionButton>
                </Flex>
              ))}
            </Flex>
          )}
          <Flex gap="size-100" wrap alignItems="end">
            <TextField
              label="Task"
              value={newTask}
              onChange={setNewTask}
              onKeyDown={(e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); addActionItem(); } }}
              width="size-3600"
            />
            <TextField
              label="Due"
              value={newTaskDue}
              onChange={setNewTaskDue}
              type="date"
              width="size-2000"
            />
            <Picker
              label="Priority"
              selectedKey={newTaskPriority}
              onSelectionChange={(key) => setNewTaskPriority(key as Priority)}
              width="size-1200"
            >
              <Item key="Low">Low</Item>
              <Item key="Medium">Med</Item>
              <Item key="High">High</Item>
            </Picker>
            <ActionButton onPress={addActionItem} isDisabled={!newTask.trim()}>
              <Add size="S" />
              <Text>Add</Text>
            </ActionButton>
          </Flex>
        </View>

        <Divider size="S" />

        {/* Update Opportunity Status */}
        <View>
          <Heading level={5} marginBottom="size-100">Update Opportunity Status</Heading>
          <Flex direction="column" gap="size-150">
            <TextField
              label="Update Last Action"
              value={updateLastAction}
              onChange={setUpdateLastAction}
              width="100%"
              placeholder="Auto-filled from call type + date if empty"
            />
            <Flex gap="size-200" wrap>
              <TextField
                label="Update Next Action"
                value={updateNextAction}
                onChange={setUpdateNextAction}
                width="size-4600"
              />
              <Picker
                label="Adjust Risk"
                selectedKey={updateRisk}
                onSelectionChange={(key) => setUpdateRisk(key as typeof updateRisk)}
                width="size-1600"
              >
                <Item key="Low">Low</Item>
                <Item key="Medium">Medium</Item>
                <Item key="High">High</Item>
              </Picker>
            </Flex>
          </Flex>
        </View>

        <Divider size="S" />

        {/* AI Analysis */}
        <View>
          <Flex gap="size-100" alignItems="center">
            <Button
              variant="accent"
              onPress={handleAiAnalysis}
              isPending={aiLoading}
              isDisabled={!summary.trim()}
            >
              <Chat />
              <Text>Analyze Call & Suggest Follow-Ups</Text>
            </Button>
            <Text UNSAFE_style={{ fontSize: '11px', color: 'var(--spectrum-global-color-gray-600)' }}>
              Cmd+Shift+A
            </Text>
          </Flex>

          {aiError && (
            <Well marginTop="size-200">
              <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-red-600)' }}>{aiError}</Text>
            </Well>
          )}

          {aiResult && (
            <View marginTop="size-200">
              <Flex justifyContent="space-between" alignItems="center" marginBottom="size-100">
                <Heading level={5}>AI Analysis</Heading>
                <Button variant="secondary" onPress={applyAiSuggestions}>
                  <Text>Apply Suggestions as Action Items</Text>
                </Button>
              </Flex>

              {/* Next Actions */}
              {aiResult.nextActions.length > 0 && (
                <View marginBottom="size-150">
                  <Text UNSAFE_style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px', display: 'block' }}>
                    Recommended Next Actions
                  </Text>
                  {aiResult.nextActions.map((a, i) => (
                    <Text key={i} UNSAFE_style={{ fontSize: '13px', display: 'block' }}>
                      {i + 1}. {a}
                    </Text>
                  ))}
                </View>
              )}

              {/* Follow-up Email */}
              {aiResult.followUpEmail && (
                <View marginBottom="size-150">
                  <Text UNSAFE_style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px', display: 'block' }}>
                    Draft Follow-Up Email
                  </Text>
                  <TextArea
                    label=""
                    aria-label="Follow-up email draft"
                    value={aiResult.followUpEmail}
                    onChange={(val) => setAiResult({ ...aiResult, followUpEmail: val })}
                    width="100%"
                  />
                </View>
              )}

              {/* CRM Update */}
              {aiResult.crmUpdate && (
                <View marginBottom="size-150">
                  <Text UNSAFE_style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px', display: 'block' }}>
                    CRM Update Snippet
                  </Text>
                  <Text UNSAFE_style={{ whiteSpace: 'pre-wrap', fontSize: '13px', fontFamily: 'monospace' }}>
                    {aiResult.crmUpdate}
                  </Text>
                </View>
              )}

              {/* Risks */}
              {aiResult.risks.length > 0 && (
                <View>
                  <Text UNSAFE_style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px', display: 'block', color: 'var(--spectrum-global-color-red-600)' }}>
                    Risks / Red Flags
                  </Text>
                  {aiResult.risks.map((r, i) => (
                    <Text key={i} UNSAFE_style={{ fontSize: '13px', display: 'block' }}>
                      &#9888; {r}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        <Divider size="S" />

        {/* Save / Cancel */}
        <Flex gap="size-100" justifyContent="end">
          <Button variant="secondary" onPress={onClose}>Cancel</Button>
          <Button
            variant="accent"
            onPress={handleSave}
            isPending={saving}
            isDisabled={!summary.trim()}
          >
            <Text>Save Follow-Up</Text>
          </Button>
        </Flex>
      </Flex>
    </View>
  );
}
