import {
  View,
  Flex,
  Heading,
  TextField,
  NumberField,
  Picker,
  Item,
  Button,
  ActionButton,
  Text,
  Badge,
} from '@adobe/react-spectrum';
import Close from '@spectrum-icons/workflow/Close';
import Add from '@spectrum-icons/workflow/Add';
import { useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOpportunity, updateOpportunity } from '../hooks/useOpportunities';
import type { Opportunity, Stage, RiskLevel } from '../types';

const STAGES: Stage[] = ['Discovery', 'Demo', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
const RISK_LEVELS: RiskLevel[] = ['Low', 'Medium', 'High'];

interface Props {
  opportunity?: Opportunity;
  onClose?: () => void;
}

export default function OpportunityForm({ opportunity, onClose }: Props) {
  const navigate = useNavigate();
  const isEdit = !!opportunity;

  const [accountName, setAccountName] = useState(opportunity?.accountName ?? '');
  const [dealName, setDealName] = useState(opportunity?.dealName ?? '');
  const [stage, setStage] = useState<Stage>(opportunity?.stage ?? 'Discovery');
  const [value, setValue] = useState(opportunity?.value ?? 0);
  const [closeDate, setCloseDate] = useState(
    opportunity?.closeDate
      ? new Date(opportunity.closeDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [lastAction, setLastAction] = useState(opportunity?.lastAction ?? '');
  const [nextAction, setNextAction] = useState(opportunity?.nextAction ?? '');
  const [challenges, setChallenges] = useState<string[]>(opportunity?.challenges ?? []);
  const [newChallenge, setNewChallenge] = useState('');
  const [risk, setRisk] = useState<RiskLevel>(opportunity?.risk ?? 'Low');
  const [saving, setSaving] = useState(false);

  const addChallenge = () => {
    const trimmed = newChallenge.trim();
    if (trimmed && !challenges.includes(trimmed)) {
      setChallenges([...challenges, trimmed]);
      setNewChallenge('');
    }
  };

  const removeChallenge = (index: number) => {
    setChallenges(challenges.filter((_, i) => i !== index));
  };

  const handleChallengeKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addChallenge();
    }
  };

  const handleSave = async () => {
    if (!accountName.trim() || !dealName.trim()) return;
    setSaving(true);
    try {
      const data = {
        accountName: accountName.trim(),
        dealName: dealName.trim(),
        stage,
        value,
        closeDate: new Date(closeDate),
        lastAction: lastAction.trim(),
        nextAction: nextAction.trim(),
        challenges,
        risk,
      };

      if (isEdit && opportunity) {
        await updateOpportunity(opportunity.id, data);
        onClose?.();
      } else {
        const id = await createOpportunity(data);
        navigate(`/opportunities/${id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      borderWidth="thin"
      borderColor="dark"
      borderRadius="medium"
      padding="size-300"
      marginBottom="size-300"
      backgroundColor="gray-50"
    >
      <Heading level={3} marginBottom="size-200">
        {isEdit ? 'Edit Opportunity' : 'New Opportunity'}
      </Heading>
      <Flex direction="column" gap="size-200">
        <Flex gap="size-200" wrap>
          <TextField
            label="Account Name"
            value={accountName}
            onChange={setAccountName}
            isRequired
            width="size-3000"
          />
          <TextField
            label="Deal Name"
            value={dealName}
            onChange={setDealName}
            isRequired
            width="size-3000"
          />
        </Flex>
        <Flex gap="size-200" wrap>
          <Picker
            label="Stage"
            selectedKey={stage}
            onSelectionChange={(key) => setStage(key as Stage)}
            width="size-2400"
          >
            {STAGES.map((s) => (
              <Item key={s}>{s}</Item>
            ))}
          </Picker>
          <NumberField
            label="Deal Value ($)"
            value={value}
            onChange={setValue}
            minValue={0}
            formatOptions={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
            width="size-2400"
          />
          <TextField
            label="Close Date"
            value={closeDate}
            onChange={setCloseDate}
            type="date"
            width="size-2400"
          />
          <Picker
            label="Risk Level"
            selectedKey={risk}
            onSelectionChange={(key) => setRisk(key as RiskLevel)}
            width="size-1600"
          >
            {RISK_LEVELS.map((r) => (
              <Item key={r}>{r}</Item>
            ))}
          </Picker>
        </Flex>
        <TextField
          label="Last Action"
          value={lastAction}
          onChange={setLastAction}
          width="100%"
        />
        <TextField
          label="Next Action"
          value={nextAction}
          onChange={setNextAction}
          width="100%"
        />

        {/* Chip-based challenges input */}
        <View>
          <Text UNSAFE_style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
            Challenges
          </Text>
          {challenges.length > 0 && (
            <Flex gap="size-50" wrap marginBottom="size-100">
              {challenges.map((c, i) => (
                <View
                  key={i}
                  UNSAFE_style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'var(--spectrum-global-color-orange-100)',
                    border: '1px solid var(--spectrum-global-color-orange-400)',
                    borderRadius: '16px',
                    padding: '2px 8px 2px 12px',
                    fontSize: '13px',
                  }}
                >
                  <Text UNSAFE_style={{ fontSize: '13px' }}>{c}</Text>
                  <ActionButton
                    isQuiet
                    onPress={() => removeChallenge(i)}
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
              aria-label="Add challenge"
              value={newChallenge}
              onChange={setNewChallenge}
              onKeyDown={handleChallengeKeyDown}
              width="size-4600"
              placeholder="Type a challenge and press Enter"
            />
            <ActionButton onPress={addChallenge} isDisabled={!newChallenge.trim()}>
              <Add size="S" />
              <Text>Add</Text>
            </ActionButton>
          </Flex>
        </View>

        <Flex gap="size-100" justifyContent="end">
          {(isEdit || onClose) && (
            <Button
              variant="secondary"
              onPress={() => {
                onClose?.();
                if (!isEdit) navigate(-1);
              }}
            >
              Cancel
            </Button>
          )}
          <Button variant="accent" onPress={handleSave} isPending={saving}>
            <Text>{isEdit ? 'Save Changes' : 'Create Opportunity'}</Text>
          </Button>
        </Flex>
      </Flex>
    </View>
  );
}
