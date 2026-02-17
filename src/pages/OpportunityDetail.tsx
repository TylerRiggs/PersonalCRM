import { useParams, useNavigate } from 'react-router-dom';
import {
  View,
  Flex,
  Heading,
  Text,
  Button,
  ActionButton,
  Badge,
  Well,
  Divider,
  DialogTrigger,
  AlertDialog,
  StatusLight,
  Tabs,
  TabList,
  TabPanels,
  Item,
  Checkbox,
  TextArea,
} from '@adobe/react-spectrum';
import Delete from '@spectrum-icons/workflow/Delete';
import Edit from '@spectrum-icons/workflow/Edit';
import Add from '@spectrum-icons/workflow/Add';
import Chat from '@spectrum-icons/workflow/Chat';
import { useState } from 'react';
import { useOpportunity, deleteOpportunity } from '../hooks/useOpportunities';
import { useInteractions, createInteraction } from '../hooks/useInteractions';
import { useTodos, createTodo, toggleTodo, deleteTodo } from '../hooks/useTodos';
import { useDependencies, createDependency, updateDependencyStatus, deleteDependency } from '../hooks/useDependencies';
import { formatDate, formatCurrency, formatInteractionType, daysSince } from '../utils/format';
import { suggestNextActions } from '../api/openclaw';
import InteractionForm from '../components/InteractionForm';
import OpportunityForm from '../components/OpportunityForm';
import TodoForm from '../components/TodoForm';
import DependencyForm from '../components/DependencyForm';
import type { RiskLevel, DependencyStatus, InteractionType } from '../types';

function riskVariant(risk: RiskLevel): 'positive' | 'info' | 'negative' {
  if (risk === 'Low') return 'positive';
  if (risk === 'Medium') return 'info';
  return 'negative';
}

function depStatusLight(status: DependencyStatus) {
  if (status === 'Completed') return 'positive' as const;
  if (status === 'In Progress') return 'info' as const;
  if (status === 'Blocked') return 'negative' as const;
  return 'neutral' as const;
}

export default function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const opportunity = useOpportunity(id);
  const interactions = useInteractions(id);
  const todos = useTodos(id);
  const dependencies = useDependencies(id);

  const [showEdit, setShowEdit] = useState(false);
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [showTodoForm, setShowTodoForm] = useState(false);
  const [showDepForm, setShowDepForm] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  if (opportunity === undefined) {
    return <Text>Loading...</Text>;
  }

  if (!opportunity) {
    return (
      <Well>
        <Text>Opportunity not found.</Text>
        <Button variant="secondary" onPress={() => navigate('/opportunities')} marginTop="size-200">
          Back to Opportunities
        </Button>
      </Well>
    );
  }

  const handleDelete = async () => {
    await deleteOpportunity(opportunity.id);
    navigate('/opportunities');
  };

  const handleAiSuggest = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const recentInteractionStrs = interactions.slice(0, 5).map(
        (i) => `${formatDate(i.date)} ${formatInteractionType(i.type)}: ${i.notes.substring(0, 100)}`
      );
      const result = await suggestNextActions({
        accountName: opportunity.accountName,
        dealName: opportunity.dealName,
        stage: opportunity.stage,
        lastAction: opportunity.lastAction,
        challenges: opportunity.challenges,
        recentInteractions: recentInteractionStrs,
      });
      setAiSuggestions(result);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to connect to OpenClaw');
    } finally {
      setAiLoading(false);
    }
  };

  const staleDays = daysSince(opportunity.updatedAt);
  const incompleteTodos = todos.filter((t) => !t.completed);
  const overdueTodos = incompleteTodos.filter((t) => new Date(t.dueDate) < new Date());

  return (
    <View>
      {/* Header */}
      <Flex alignItems="start" justifyContent="space-between" marginBottom="size-300">
        <View>
          <Flex alignItems="center" gap="size-150">
            <Heading level={1}>{opportunity.dealName}</Heading>
            <Badge variant={riskVariant(opportunity.risk)}>{opportunity.risk} Risk</Badge>
          </Flex>
          <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-gray-600)', fontSize: '16px' }}>
            {opportunity.accountName}
          </Text>
        </View>
        <Flex gap="size-100">
          <ActionButton onPress={() => setShowEdit(true)}>
            <Edit />
            <Text>Edit</Text>
          </ActionButton>
          <DialogTrigger>
            <ActionButton>
              <Delete />
              <Text>Delete</Text>
            </ActionButton>
            <AlertDialog
              variant="destructive"
              title="Delete Opportunity"
              primaryActionLabel="Delete"
              cancelLabel="Cancel"
              onPrimaryAction={handleDelete}
            >
              Are you sure you want to delete "{opportunity.dealName}"? This will also remove all
              associated interactions, tasks, and dependencies.
            </AlertDialog>
          </DialogTrigger>
        </Flex>
      </Flex>

      {showEdit && (
        <OpportunityForm
          opportunity={opportunity}
          onClose={() => setShowEdit(false)}
        />
      )}

      {/* Overview cards */}
      <Flex gap="size-200" wrap marginBottom="size-300">
        <InfoCard label="Value" value={formatCurrency(opportunity.value)} />
        <InfoCard label="Stage" value={opportunity.stage} />
        <InfoCard label="Close Date" value={formatDate(opportunity.closeDate)} />
        <InfoCard label="Last Updated" value={`${staleDays}d ago`} highlight={staleDays > 7} />
      </Flex>

      {/* Status section */}
      <View
        borderWidth="thin"
        borderColor="dark"
        borderRadius="medium"
        padding="size-200"
        marginBottom="size-300"
      >
        <Heading level={4} marginBottom="size-100">Status</Heading>
        <Flex direction="column" gap="size-100">
          <Flex gap="size-100">
            <Text UNSAFE_style={{ fontWeight: 'bold', minWidth: '100px' }}>Last Action:</Text>
            <Text>{opportunity.lastAction || 'N/A'}</Text>
          </Flex>
          <Flex gap="size-100">
            <Text UNSAFE_style={{ fontWeight: 'bold', minWidth: '100px' }}>Next Action:</Text>
            <Text>{opportunity.nextAction || 'N/A'}</Text>
          </Flex>
          <Flex gap="size-100" alignItems="start">
            <Text UNSAFE_style={{ fontWeight: 'bold', minWidth: '100px' }}>Challenges:</Text>
            <View>
              {opportunity.challenges.length > 0 ? (
                opportunity.challenges.map((c, i) => (
                  <Text key={i} UNSAFE_style={{ display: 'block' }}>• {c}</Text>
                ))
              ) : (
                <Text>None</Text>
              )}
            </View>
          </Flex>
        </Flex>
      </View>

      {/* Tabs */}
      <Tabs aria-label="Opportunity details">
        <TabList>
          <Item key="interactions">Interactions ({interactions.length})</Item>
          <Item key="todos">To-Dos ({incompleteTodos.length}{overdueTodos.length > 0 ? ` / ${overdueTodos.length} overdue` : ''})</Item>
          <Item key="dependencies">Dependencies ({dependencies.length})</Item>
          <Item key="ai">AI Assistant</Item>
        </TabList>
        <TabPanels>
          {/* Interactions */}
          <Item key="interactions">
            <View paddingY="size-200">
              <Flex justifyContent="space-between" alignItems="center" marginBottom="size-200">
                <Heading level={4}>Recent Interactions</Heading>
                <Button variant="primary" onPress={() => setShowInteractionForm(true)}>
                  <Add />
                  <Text>Log Interaction</Text>
                </Button>
              </Flex>

              {showInteractionForm && (
                <InteractionForm
                  opportunityId={opportunity.id}
                  onClose={() => setShowInteractionForm(false)}
                />
              )}

              {interactions.length === 0 ? (
                <Well><Text>No interactions logged yet.</Text></Well>
              ) : (
                <Flex direction="column" gap="size-150">
                  {interactions.map((interaction) => (
                    <View
                      key={interaction.id}
                      borderWidth="thin"
                      borderColor="gray-300"
                      borderRadius="medium"
                      padding="size-200"
                    >
                      <Flex justifyContent="space-between" alignItems="center" marginBottom="size-100">
                        <Flex alignItems="center" gap="size-100">
                          <Badge variant="info">{formatInteractionType(interaction.type)}</Badge>
                          <Text UNSAFE_style={{ fontWeight: 'bold' }}>{formatDate(interaction.date)}</Text>
                        </Flex>
                      </Flex>
                      <Text>{interaction.notes}</Text>
                      {interaction.participants.length > 0 && (
                        <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)', marginTop: '4px' }}>
                          Participants: {interaction.participants.join(', ')}
                        </Text>
                      )}
                      {interaction.outcomes.length > 0 && (
                        <View marginTop="size-100">
                          <Text UNSAFE_style={{ fontSize: '12px', fontWeight: 'bold' }}>Outcomes:</Text>
                          {interaction.outcomes.map((o, i) => (
                            <Text key={i} UNSAFE_style={{ fontSize: '12px' }}>• {o}</Text>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </Flex>
              )}
            </View>
          </Item>

          {/* To-Dos */}
          <Item key="todos">
            <View paddingY="size-200">
              <Flex justifyContent="space-between" alignItems="center" marginBottom="size-200">
                <Heading level={4}>To-Dos</Heading>
                <Button variant="primary" onPress={() => setShowTodoForm(true)}>
                  <Add />
                  <Text>Add Task</Text>
                </Button>
              </Flex>

              {showTodoForm && (
                <TodoForm
                  opportunityId={opportunity.id}
                  onClose={() => setShowTodoForm(false)}
                />
              )}

              {todos.length === 0 ? (
                <Well><Text>No tasks yet.</Text></Well>
              ) : (
                <Flex direction="column" gap="size-100">
                  {todos
                    .sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1))
                    .map((todo) => {
                      const isOverdue = !todo.completed && new Date(todo.dueDate) < new Date();
                      return (
                        <Flex key={todo.id} alignItems="center" gap="size-100">
                          <Checkbox
                            isSelected={todo.completed}
                            onChange={() => toggleTodo(todo.id)}
                          >
                            <Text UNSAFE_style={{
                              textDecoration: todo.completed ? 'line-through' : undefined,
                              color: todo.completed ? 'var(--spectrum-global-color-gray-500)' : undefined,
                            }}>
                              {todo.task}
                            </Text>
                          </Checkbox>
                          <Badge variant={todo.priority === 'High' ? 'negative' : todo.priority === 'Medium' ? 'info' : 'positive'}>
                            {todo.priority}
                          </Badge>
                          <Text UNSAFE_style={{
                            fontSize: '12px',
                            color: isOverdue ? 'var(--spectrum-global-color-red-600)' : 'var(--spectrum-global-color-gray-600)',
                          }}>
                            Due: {formatDate(todo.dueDate)}
                          </Text>
                          <ActionButton isQuiet onPress={() => deleteTodo(todo.id)}>
                            <Delete size="S" />
                          </ActionButton>
                        </Flex>
                      );
                    })}
                </Flex>
              )}
            </View>
          </Item>

          {/* Dependencies */}
          <Item key="dependencies">
            <View paddingY="size-200">
              <Flex justifyContent="space-between" alignItems="center" marginBottom="size-200">
                <Heading level={4}>Dependencies</Heading>
                <Button variant="primary" onPress={() => setShowDepForm(true)}>
                  <Add />
                  <Text>Add Dependency</Text>
                </Button>
              </Flex>

              {showDepForm && (
                <DependencyForm
                  opportunityId={opportunity.id}
                  onClose={() => setShowDepForm(false)}
                />
              )}

              {dependencies.length === 0 ? (
                <Well><Text>No dependencies tracked.</Text></Well>
              ) : (
                <Flex direction="column" gap="size-150">
                  {dependencies.map((dep) => (
                    <View
                      key={dep.id}
                      borderWidth="thin"
                      borderColor="gray-300"
                      borderRadius="medium"
                      padding="size-200"
                    >
                      <Flex justifyContent="space-between" alignItems="center">
                        <Flex alignItems="center" gap="size-100">
                          <StatusLight variant={depStatusLight(dep.status)}>
                            {dep.status}
                          </StatusLight>
                          <Text>{dep.description}</Text>
                        </Flex>
                        <Flex gap="size-100" alignItems="center">
                          <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
                            Owner: {dep.owner}
                          </Text>
                          {dep.dueDate && (
                            <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>
                              Due: {formatDate(dep.dueDate)}
                            </Text>
                          )}
                        </Flex>
                      </Flex>
                      <Flex gap="size-50" marginTop="size-100">
                        {(['Pending', 'In Progress', 'Completed', 'Blocked'] as DependencyStatus[]).map((s) => (
                          <ActionButton
                            key={s}
                            isQuiet
                            onPress={() => updateDependencyStatus(dep.id, s)}
                            UNSAFE_style={{
                              fontSize: '11px',
                              fontWeight: dep.status === s ? 'bold' : 'normal',
                              textDecoration: dep.status === s ? 'underline' : 'none',
                            }}
                          >
                            {s}
                          </ActionButton>
                        ))}
                        <View flex />
                        <ActionButton isQuiet onPress={() => deleteDependency(dep.id)}>
                          <Delete size="S" />
                        </ActionButton>
                      </Flex>
                    </View>
                  ))}
                </Flex>
              )}
            </View>
          </Item>

          {/* AI Assistant */}
          <Item key="ai">
            <View paddingY="size-200">
              <Heading level={4} marginBottom="size-200">AI Assistant (OpenClaw)</Heading>
              <Button
                variant="accent"
                onPress={handleAiSuggest}
                isPending={aiLoading}
              >
                <Chat />
                <Text>Suggest Next Actions</Text>
              </Button>
              {aiError && (
                <Well marginTop="size-200" UNSAFE_style={{ borderColor: 'var(--spectrum-global-color-red-400)' }}>
                  <Text UNSAFE_style={{ color: 'var(--spectrum-global-color-red-600)' }}>
                    {aiError}
                  </Text>
                  <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)', marginTop: '4px', display: 'block' }}>
                    Make sure OpenClaw is running at the configured URL and your token is set in Settings.
                  </Text>
                </Well>
              )}
              {aiSuggestions && (
                <View
                  marginTop="size-200"
                  borderWidth="thin"
                  borderColor="informative"
                  borderRadius="medium"
                  padding="size-200"
                >
                  <Heading level={5} marginBottom="size-100">Suggestions</Heading>
                  <Text UNSAFE_style={{ whiteSpace: 'pre-wrap' }}>{aiSuggestions}</Text>
                </View>
              )}
            </View>
          </Item>
        </TabPanels>
      </Tabs>
    </View>
  );
}

function InfoCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View
      borderWidth="thin"
      borderColor={highlight ? 'negative' : 'dark'}
      borderRadius="medium"
      padding="size-200"
      minWidth="size-1700"
    >
      <Text UNSAFE_style={{ fontSize: '12px', color: 'var(--spectrum-global-color-gray-600)' }}>{label}</Text>
      <Text UNSAFE_style={{
        fontWeight: 'bold',
        fontSize: '16px',
        display: 'block',
        marginTop: '4px',
        color: highlight ? 'var(--spectrum-global-color-red-600)' : undefined,
      }}>
        {value}
      </Text>
    </View>
  );
}
