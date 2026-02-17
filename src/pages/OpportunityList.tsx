import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  View,
  Flex,
  Heading,
  Text,
  ActionButton,
  Button,
  Badge,
  Picker,
  Item,
  SearchField,
  Well,
} from '@adobe/react-spectrum';
import Add from '@spectrum-icons/workflow/Add';
import { useState, useMemo } from 'react';
import { useOpportunities } from '../hooks/useOpportunities';
import { formatCurrency, formatDate } from '../utils/format';
import type { Stage, RiskLevel } from '../types';

const STAGES: Stage[] = ['Discovery', 'Demo', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
const RISK_LEVELS: RiskLevel[] = ['Low', 'Medium', 'High'];

function riskVariant(risk: RiskLevel): 'positive' | 'info' | 'negative' {
  if (risk === 'Low') return 'positive';
  if (risk === 'Medium') return 'info';
  return 'negative';
}

export default function OpportunityList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') ?? '';
  const [stageFilter, setStageFilter] = useState<Stage | ''>('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | ''>('');

  const filters = useMemo(
    () => ({
      search: urlSearch || undefined,
      stage: stageFilter || undefined,
      risk: riskFilter || undefined,
    }),
    [urlSearch, stageFilter, riskFilter]
  );

  const opportunities = useOpportunities(filters as { search?: string; stage?: Stage; risk?: RiskLevel });

  const handleLocalSearchChange = (value: string) => {
    if (value.trim()) {
      setSearchParams({ search: value.trim() }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  return (
    <View>
      <Flex alignItems="center" justifyContent="space-between" marginBottom="size-300">
        <Heading level={1}>Opportunities</Heading>
        <Button variant="accent" onPress={() => navigate('/opportunities/new')}>
          <Add />
          <Text>New Opportunity</Text>
        </Button>
      </Flex>

      {/* Filters */}
      <Flex gap="size-200" wrap marginBottom="size-300" alignItems="end">
        <SearchField
          label="Search"
          value={urlSearch}
          onChange={handleLocalSearchChange}
          onClear={() => setSearchParams({}, { replace: true })}
          width="size-3000"
        />
        <Picker
          label="Stage"
          selectedKey={stageFilter}
          onSelectionChange={(key) => setStageFilter(key as Stage | '')}
          width="size-2400"
        >
          <Item key="">All Stages</Item>
          {STAGES.map((s) => (
            <Item key={s}>{s}</Item>
          ))}
        </Picker>
        <Picker
          label="Risk"
          selectedKey={riskFilter}
          onSelectionChange={(key) => setRiskFilter(key as RiskLevel | '')}
          width="size-1600"
        >
          <Item key="">All Risks</Item>
          {RISK_LEVELS.map((r) => (
            <Item key={r}>{r}</Item>
          ))}
        </Picker>
      </Flex>

      {/* Grid */}
      {opportunities.length === 0 ? (
        <Well>
          <Text>No opportunities found. {urlSearch || stageFilter || riskFilter ? 'Try adjusting your filters.' : 'Create your first opportunity to get started.'}</Text>
        </Well>
      ) : (
        <Flex wrap gap="size-200">
          {opportunities.map((opp) => (
            <View
              key={opp.id}
              borderWidth="thin"
              borderColor="dark"
              borderRadius="medium"
              padding="size-200"
              width="size-4600"
              UNSAFE_style={{ cursor: 'pointer' }}
            >
              <ActionButton
                isQuiet
                onPress={() => navigate(`/opportunities/${opp.id}`)}
                UNSAFE_style={{ width: '100%', height: 'auto', justifyContent: 'flex-start' }}
              >
                <Flex direction="column" gap="size-100" width="100%">
                  <Flex justifyContent="space-between" alignItems="start">
                    <View>
                      <Heading level={4}>{opp.dealName}</Heading>
                      <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)' }}>
                        {opp.accountName}
                      </Text>
                    </View>
                    <Badge variant={riskVariant(opp.risk)}>{opp.risk}</Badge>
                  </Flex>
                  <Flex justifyContent="space-between" alignItems="center">
                    <Text UNSAFE_style={{ fontWeight: 'bold' }}>{formatCurrency(opp.value)}</Text>
                    <Badge variant="neutral">{opp.stage}</Badge>
                  </Flex>
                  {opp.lastAction && (
                    <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
                      {opp.lastAction}
                    </Text>
                  )}
                  <Flex justifyContent="space-between" alignItems="center">
                    <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
                      Close: {formatDate(opp.closeDate)}
                    </Text>
                    {opp.challenges.length > 0 && (
                      <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-orange-600)' }}>
                        {opp.challenges.length} challenge{opp.challenges.length !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </Flex>
                </Flex>
              </ActionButton>
            </View>
          ))}
        </Flex>
      )}
    </View>
  );
}
