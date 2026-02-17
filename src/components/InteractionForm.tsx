import {
  View,
  Flex,
  Heading,
  TextField,
  TextArea,
  Picker,
  Item,
  Button,
  Text,
} from '@adobe/react-spectrum';
import { useState } from 'react';
import { createInteraction } from '../hooks/useInteractions';
import { updateOpportunity } from '../hooks/useOpportunities';
import { suggestNextActions } from '../api/openclaw';
import type { InteractionType } from '../types';

const TYPES: { key: InteractionType; label: string }[] = [
  { key: 'customer_call', label: 'Customer Call' },
  { key: 'internal_call', label: 'Internal Call' },
  { key: 'email', label: 'Email' },
  { key: 'meeting', label: 'Meeting' },
];

interface Props {
  opportunityId: string;
  onClose: () => void;
}

export default function InteractionForm({ opportunityId, onClose }: Props) {
  const [type, setType] = useState<InteractionType>('customer_call');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [participantsText, setParticipantsText] = useState('');
  const [outcomesText, setOutcomesText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (andSuggest = false) => {
    if (!notes.trim()) return;
    setSaving(true);
    try {
      const participants = participantsText
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      const outcomes = outcomesText
        .split('\n')
        .map((o) => o.trim())
        .filter(Boolean);

      await createInteraction({
        opportunityId,
        type,
        date: new Date(date),
        notes: notes.trim(),
        participants,
        outcomes,
      });

      // Update the last action on the opportunity
      const typeLabel = TYPES.find((t) => t.key === type)?.label ?? type;
      await updateOpportunity(opportunityId, {
        lastAction: `${typeLabel} - ${new Date(date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}`,
      });

      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View
      borderWidth="thin"
      borderColor="informative"
      borderRadius="medium"
      padding="size-300"
      marginBottom="size-200"
      backgroundColor="gray-50"
    >
      <Heading level={4} marginBottom="size-200">Log Interaction</Heading>
      <Flex direction="column" gap="size-200">
        <Flex gap="size-200" wrap>
          <Picker
            label="Type"
            selectedKey={type}
            onSelectionChange={(key) => setType(key as InteractionType)}
            width="size-2400"
          >
            {TYPES.map((t) => (
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
        <TextField
          label="Participants (comma-separated)"
          value={participantsText}
          onChange={setParticipantsText}
          width="100%"
        />
        <TextArea
          label="Notes"
          value={notes}
          onChange={setNotes}
          isRequired
          width="100%"
        />
        <TextArea
          label="Outcomes (one per line)"
          value={outcomesText}
          onChange={setOutcomesText}
          width="100%"
        />
        <Flex gap="size-100" justifyContent="end">
          <Button variant="secondary" onPress={onClose}>Cancel</Button>
          <Button variant="accent" onPress={() => handleSave(false)} isPending={saving}>
            <Text>Save</Text>
          </Button>
        </Flex>
      </Flex>
    </View>
  );
}
