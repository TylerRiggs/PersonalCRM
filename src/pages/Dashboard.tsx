import { useNavigate } from 'react-router-dom';
import {
  View,
  Flex,
  Heading,
  Text,
  ActionButton,
  Badge,
  Well,
  ProgressBar,
} from '@adobe/react-spectrum';
import Alert from '@spectrum-icons/workflow/Alert';
import ArrowRight from '@spectrum-icons/workflow/ArrowRight';
import { useOpportunities } from '../hooks/useOpportunities';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { formatCurrency, daysSince } from '../utils/format';
import type { Stage, RiskLevel } from '../types';

const STAGE_ORDER: Stage[] = ['Discovery', 'Demo', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

function riskVariant(risk: RiskLevel): 'positive' | 'info' | 'negative' {
  if (risk === 'Low') return 'positive';
  if (risk === 'Medium') return 'info';
  return 'negative';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const opportunities = useOpportunities();

  const overdueTodos = useLiveQuery(async () => {
    const now = new Date();
    const all = await db.todos.toArray();
    return all.filter((t) => !t.completed && new Date(t.dueDate) < now);
  }) ?? [];

  const activeOpps = opportunities.filter(
    (o) => o.stage !== 'Closed Won' && o.stage !== 'Closed Lost'
  );
  const highRisk = activeOpps.filter((o) => o.risk === 'High');
  const staleOpps = activeOpps.filter((o) => daysSince(o.updatedAt) > 7);

  const totalPipeline = activeOpps.reduce((sum, o) => sum + o.value, 0);

  const stageCounts = STAGE_ORDER.map((stage) => ({
    stage,
    count: opportunities.filter((o) => o.stage === stage).length,
    value: opportunities.filter((o) => o.stage === stage).reduce((s, o) => s + o.value, 0),
  }));

  const attentionItems = [
    ...highRisk.map((o) => ({
      id: o.id,
      label: `${o.dealName} - High Risk`,
      detail: o.accountName,
      type: 'risk' as const,
    })),
    ...staleOpps.map((o) => ({
      id: o.id,
      label: `${o.dealName} - No activity ${daysSince(o.updatedAt)} days`,
      detail: o.accountName,
      type: 'stale' as const,
    })),
    ...overdueTodos.slice(0, 5).map((t) => ({
      id: t.opportunityId,
      label: `Overdue: ${t.task}`,
      detail: '',
      type: 'overdue' as const,
    })),
  ];

  return (
    <View>
      <Heading level={1} marginBottom="size-300">Dashboard</Heading>

      {/* Stats row */}
      <Flex gap="size-200" wrap marginBottom="size-400">
        <StatCard label="Active Opportunities" value={String(activeOpps.length)} />
        <StatCard label="Total Pipeline" value={formatCurrency(totalPipeline)} />
        <StatCard label="Overdue Tasks" value={String(overdueTodos.length)} highlight={overdueTodos.length > 0} />
        <StatCard label="High Risk Deals" value={String(highRisk.length)} highlight={highRisk.length > 0} />
      </Flex>

      {/* Requires Attention */}
      {attentionItems.length > 0 && (
        <View marginBottom="size-400">
          <Heading level={3} marginBottom="size-150">
            <Flex alignItems="center" gap="size-100">
              <Alert size="S" />
              <Text>Requires Attention</Text>
            </Flex>
          </Heading>
          <Flex direction="column" gap="size-100">
            {attentionItems.map((item, i) => (
              <ActionButton
                key={`${item.id}-${i}`}
                isQuiet
                onPress={() => navigate(`/opportunities/${item.id}`)}
                UNSAFE_style={{ justifyContent: 'flex-start', width: '100%' }}
              >
                <Badge
                  variant={item.type === 'risk' ? 'negative' : item.type === 'stale' ? 'info' : 'negative'}
                >
                  {item.type === 'risk' ? 'Risk' : item.type === 'stale' ? 'Stale' : 'Overdue'}
                </Badge>
                <Text>{item.label}</Text>
                {item.detail && (
                  <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)', marginLeft: 'auto' }}>
                    {item.detail}
                  </Text>
                )}
              </ActionButton>
            ))}
          </Flex>
        </View>
      )}

      {/* Pipeline by Stage */}
      <Heading level={3} marginBottom="size-150">Pipeline by Stage</Heading>
      <Flex direction="column" gap="size-100" marginBottom="size-400">
        {stageCounts.filter(s => s.count > 0).map((s) => (
          <View key={s.stage}>
            <Flex justifyContent="space-between" marginBottom="size-50">
              <Text>{s.stage} ({s.count})</Text>
              <Text>{formatCurrency(s.value)}</Text>
            </Flex>
            <ProgressBar
              value={totalPipeline > 0 ? (s.value / totalPipeline) * 100 : 0}
              label={s.stage}
              showValueLabel={false}
              width="100%"
            />
          </View>
        ))}
      </Flex>

      {/* Recent Opportunities */}
      <Flex alignItems="center" justifyContent="space-between" marginBottom="size-150">
        <Heading level={3}>Recent Opportunities</Heading>
        <ActionButton isQuiet onPress={() => navigate('/opportunities')}>
          <Text>View All</Text>
          <ArrowRight size="S" />
        </ActionButton>
      </Flex>
      <Flex direction="column" gap="size-150">
        {opportunities.slice(0, 6).map((opp) => (
          <ActionButton
            key={opp.id}
            isQuiet
            onPress={() => navigate(`/opportunities/${opp.id}`)}
            UNSAFE_style={{ justifyContent: 'flex-start', width: '100%' }}
          >
            <Flex alignItems="center" gap="size-200" width="100%">
              <View flex>
                <Text UNSAFE_style={{ fontWeight: 'bold' }}>{opp.dealName}</Text>
                <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)', marginLeft: '8px' }}>
                  {opp.accountName}
                </Text>
              </View>
              <Badge variant={riskVariant(opp.risk)}>{opp.risk}</Badge>
              <Text>{formatCurrency(opp.value)}</Text>
              <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>{opp.stage}</Text>
            </Flex>
          </ActionButton>
        ))}
        {opportunities.length === 0 && (
          <Well>
            <Text>No opportunities yet. Click "New Opportunity" to get started.</Text>
          </Well>
        )}
      </Flex>
    </View>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View
      borderWidth="thin"
      borderColor={highlight ? 'negative' : 'dark'}
      borderRadius="medium"
      padding="size-200"
      minWidth="size-2400"
      flex
    >
      <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
        {label}
      </Text>
      <Heading level={2} marginTop="size-50" UNSAFE_style={highlight ? { color: 'var(--spectrum-global-color-red-600)' } : undefined}>
        {value}
      </Heading>
    </View>
  );
}
