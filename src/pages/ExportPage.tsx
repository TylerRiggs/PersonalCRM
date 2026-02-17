import {
  View,
  Flex,
  Heading,
  Text,
  Button,
  ActionButton,
  TextArea,
  Picker,
  Item,
  TextField,
  Well,
  Badge,
  Checkbox,
} from '@adobe/react-spectrum';
import Copy from '@spectrum-icons/workflow/Copy';
import Download from '@spectrum-icons/workflow/Download';
import Export from '@spectrum-icons/workflow/Export';
import { useState, useMemo } from 'react';
import { useOpportunities } from '../hooks/useOpportunities';
import { generateWeeklyUpdate } from '../utils/format';
import type { Stage } from '../types';

const STAGES: Stage[] = ['Discovery', 'Demo', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

export default function ExportPage() {
  const opportunities = useOpportunities();

  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const [startDate, setStartDate] = useState(lastWeek.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  const [stageFilter, setStageFilter] = useState<Stage | ''>('');
  const [excludeClosed, setExcludeClosed] = useState(true);
  const [generatedText, setGeneratedText] = useState('');
  const [copied, setCopied] = useState(false);

  const filteredOpps = useMemo(() => {
    let result = [...opportunities];
    if (stageFilter) {
      result = result.filter((o) => o.stage === stageFilter);
    }
    if (excludeClosed) {
      result = result.filter((o) => o.stage !== 'Closed Won' && o.stage !== 'Closed Lost');
    }
    return result;
  }, [opportunities, stageFilter, excludeClosed]);

  const handleGenerate = () => {
    const weekStart = new Date(startDate);
    const text = generateWeeklyUpdate(filteredOpps, weekStart);
    setGeneratedText(text);
    setCopied(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = generatedText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([generatedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crm-update-${startDate}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <View>
      <Heading level={1} marginBottom="size-300">Weekly CRM Export</Heading>

      {/* Filters */}
      <View
        borderWidth="thin"
        borderColor="dark"
        borderRadius="medium"
        padding="size-300"
        marginBottom="size-300"
      >
        <Heading level={4} marginBottom="size-200">Export Settings</Heading>
        <Flex gap="size-200" wrap alignItems="end">
          <TextField
            label="Start Date"
            value={startDate}
            onChange={setStartDate}
            type="date"
            width="size-2400"
          />
          <TextField
            label="End Date"
            value={endDate}
            onChange={setEndDate}
            type="date"
            width="size-2400"
          />
          <Picker
            label="Stage Filter"
            selectedKey={stageFilter}
            onSelectionChange={(key) => setStageFilter(key as Stage | '')}
            width="size-2400"
          >
            <Item key="">All Stages</Item>
            {STAGES.map((s) => (
              <Item key={s}>{s}</Item>
            ))}
          </Picker>
        </Flex>
        <Flex marginTop="size-200" alignItems="center" gap="size-200">
          <Checkbox isSelected={excludeClosed} onChange={setExcludeClosed}>
            Exclude Closed Won/Lost
          </Checkbox>
          <View flex />
          <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
            {filteredOpps.length} opportunities will be included
          </Text>
        </Flex>
        <Flex marginTop="size-200">
          <Button variant="accent" onPress={handleGenerate}>
            <Export />
            <Text>Generate Weekly Update</Text>
          </Button>
        </Flex>
      </View>

      {/* Generated output */}
      {generatedText && (
        <View>
          <Flex justifyContent="space-between" alignItems="center" marginBottom="size-150">
            <Heading level={3}>Generated Update</Heading>
            <Flex gap="size-100">
              <Button variant="primary" onPress={handleCopy}>
                <Copy />
                <Text>{copied ? 'Copied!' : 'Copy All'}</Text>
              </Button>
              <ActionButton onPress={handleDownload}>
                <Download />
                <Text>Save as File</Text>
              </ActionButton>
            </Flex>
          </Flex>
          <TextArea
            label="CRM Update"
            value={generatedText}
            onChange={setGeneratedText}
            width="100%"
            height="size-6000"
            UNSAFE_style={{ fontFamily: 'monospace' }}
          />
        </View>
      )}
    </View>
  );
}
