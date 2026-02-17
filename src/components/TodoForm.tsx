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
import { createTodo } from '../hooks/useTodos';
import type { Priority } from '../types';

const PRIORITIES: Priority[] = ['Low', 'Medium', 'High'];

interface Props {
  opportunityId: string;
  onClose: () => void;
}

export default function TodoForm({ opportunityId, onClose }: Props) {
  const [task, setTask] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = useState<Priority>('Medium');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!task.trim()) return;
    setSaving(true);
    try {
      await createTodo({
        opportunityId,
        task: task.trim(),
        dueDate: new Date(dueDate),
        completed: false,
        priority,
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
      <Heading level={4} marginBottom="size-200">Add Task</Heading>
      <Flex direction="column" gap="size-200">
        <TextField
          label="Task"
          value={task}
          onChange={setTask}
          isRequired
          width="100%"
        />
        <Flex gap="size-200" wrap>
          <TextField
            label="Due Date"
            value={dueDate}
            onChange={setDueDate}
            type="date"
            width="size-2400"
          />
          <Picker
            label="Priority"
            selectedKey={priority}
            onSelectionChange={(key) => setPriority(key as Priority)}
            width="size-1600"
          >
            {PRIORITIES.map((p) => (
              <Item key={p}>{p}</Item>
            ))}
          </Picker>
        </Flex>
        <Flex gap="size-100" justifyContent="end">
          <Button variant="secondary" onPress={onClose}>Cancel</Button>
          <Button variant="accent" onPress={handleSave} isPending={saving}>
            <Text>Add Task</Text>
          </Button>
        </Flex>
      </Flex>
    </View>
  );
}
