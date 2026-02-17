import {
  View,
  Flex,
  Heading,
  TextField,
  Picker,
  Item,
  Button,
  Text,
} from '@adobe/react-spectrum';
import { useState } from 'react';
import { createDependency } from '../hooks/useDependencies';
import type { DependencyStatus } from '../types';

const STATUSES: DependencyStatus[] = ['Pending', 'In Progress', 'Completed', 'Blocked'];

interface Props {
  opportunityId: string;
  onClose: () => void;
}

export default function DependencyForm({ opportunityId, onClose }: Props) {
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('');
  const [status, setStatus] = useState<DependencyStatus>('Pending');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!description.trim() || !owner.trim()) return;
    setSaving(true);
    try {
      await createDependency({
        opportunityId,
        description: description.trim(),
        owner: owner.trim(),
        status,
        dueDate: dueDate ? new Date(dueDate) : undefined,
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
      <Heading level={4} marginBottom="size-200">Add Dependency</Heading>
      <Flex direction="column" gap="size-200">
        <TextField
          label="Description"
          value={description}
          onChange={setDescription}
          isRequired
          width="100%"
        />
        <Flex gap="size-200" wrap>
          <TextField
            label="Owner"
            value={owner}
            onChange={setOwner}
            isRequired
            width="size-3000"
          />
          <Picker
            label="Status"
            selectedKey={status}
            onSelectionChange={(key) => setStatus(key as DependencyStatus)}
            width="size-2000"
          >
            {STATUSES.map((s) => (
              <Item key={s}>{s}</Item>
            ))}
          </Picker>
          <TextField
            label="Due Date (optional)"
            value={dueDate}
            onChange={setDueDate}
            type="date"
            width="size-2400"
          />
        </Flex>
        <Flex gap="size-100" justifyContent="end">
          <Button variant="secondary" onPress={onClose}>Cancel</Button>
          <Button variant="accent" onPress={handleSave} isPending={saving}>
            <Text>Add Dependency</Text>
          </Button>
        </Flex>
      </Flex>
    </View>
  );
}
