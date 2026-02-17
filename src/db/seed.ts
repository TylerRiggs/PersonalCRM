import { db } from './index';

export async function seedDatabase() {
  const oppCount = await db.opportunities.count();
  if (oppCount > 0) return; // Already seeded

  const now = new Date();

  // === Opportunity 1: UT Dell Medical School ===
  const opp1Id = 'seed-utdell-001';
  await db.opportunities.add({
    id: opp1Id,
    accountName: 'UT Dell Medical School',
    dealName: 'Patient Journey Analytics Platform',
    stage: 'Proposal',
    value: 450000,
    closeDate: new Date('2026-04-30'),
    lastAction: 'Technical deep-dive on CJA integration with Epic EMR completed 2/10',
    challenges: [
      'Budget approval pending from CFO',
      'IT security review required for data flows',
      'Competing with Tableau for analytics spend',
    ],
    nextAction: 'Present ROI analysis and security documentation to CFO and CISO by 2/25',
    risk: 'Medium',
    createdAt: new Date('2026-01-10'),
    updatedAt: new Date('2026-02-10'),
  });

  await db.interactions.bulkAdd([
    {
      id: 'seed-int-utdell-1',
      opportunityId: opp1Id,
      type: 'discovery_call',
      date: new Date('2026-01-15'),
      notes: 'Initial discovery call to understand patient journey visibility needs.',
      summary: 'Discussed patient journey visibility gaps across care continuum. CMO wants unified view of patient touchpoints from appointment scheduling through post-discharge follow-up.',
      participants: ['Dr. Sarah Chen (Chief Medical Officer)', 'Tom Rodriguez (IT Director)'],
      outcomes: [
        'Identified Epic EMR as primary data source',
        'Need real-time dashboard for clinical teams',
      ],
    },
    {
      id: 'seed-int-utdell-2',
      opportunityId: opp1Id,
      type: 'demo',
      date: new Date('2026-01-28'),
      notes: 'Product demo showcasing CJA cross-channel analysis.',
      summary: "Demonstrated CJA's cross-channel analysis capabilities with healthcare demo data. Strong positive reaction to patient journey flow visualization.",
      participants: ['Dr. Sarah Chen', 'Tom Rodriguez', 'Jennifer Kim (Analytics Lead)'],
      outcomes: [
        'Requested technical architecture review',
        'Security questionnaire requested',
      ],
    },
    {
      id: 'seed-int-utdell-3',
      opportunityId: opp1Id,
      type: 'meeting',
      date: new Date('2026-02-10'),
      notes: 'Technical deep-dive on integration approach.',
      summary: 'Validated Epic integration approach via HL7 FHIR APIs. Discussed on-premise vs cloud deployment options.',
      participants: ['Tom Rodriguez', 'Jennifer Kim', 'Adobe Solutions Architect'],
      outcomes: [
        'IT approved technical approach',
        'Requested formal security review from CISO',
      ],
    },
  ]);

  await db.todos.bulkAdd([
    {
      id: 'seed-todo-utdell-1',
      opportunityId: opp1Id,
      task: 'Prepare ROI analysis showing cost savings from reduced readmissions',
      dueDate: new Date('2026-02-20'),
      completed: false,
      priority: 'High',
    },
    {
      id: 'seed-todo-utdell-2',
      opportunityId: opp1Id,
      task: 'Complete security questionnaire for CISO review',
      dueDate: new Date('2026-02-22'),
      completed: false,
      priority: 'High',
    },
    {
      id: 'seed-todo-utdell-3',
      opportunityId: opp1Id,
      task: 'Schedule CFO presentation',
      dueDate: new Date('2026-02-18'),
      completed: false,
      priority: 'Medium',
    },
  ]);

  await db.dependencies.add({
    id: 'seed-dep-utdell-1',
    opportunityId: opp1Id,
    description: 'Waiting on legal to approve BAA amendment',
    owner: 'Adobe Legal',
    status: 'In Progress',
    dueDate: new Date('2026-02-28'),
  });

  // === Opportunity 2: NXP Semiconductors ===
  const opp2Id = 'seed-nxp-001';
  await db.opportunities.add({
    id: opp2Id,
    accountName: 'NXP Semiconductors',
    dealName: 'Customer Data Platform + Journey Optimizer Expansion',
    stage: 'Negotiation',
    value: 1200000,
    closeDate: new Date('2026-03-31'),
    lastAction: 'Executive sponsor meeting with CMO completed 2/12, positive feedback on use cases',
    challenges: [
      'Pricing objection on AJO per-message fees',
      'Integration complexity with SAP Commerce and Salesforce',
      'Stakeholder alignment across EMEA and Americas marketing teams',
    ],
    nextAction: 'Send revised pricing proposal with commit-based discount by 2/20',
    risk: 'Medium',
    createdAt: new Date('2025-11-15'),
    updatedAt: new Date('2026-02-12'),
  });

  await db.interactions.add({
    id: 'seed-int-nxp-1',
    opportunityId: opp2Id,
    type: 'executive_briefing',
    date: new Date('2026-02-12'),
    notes: 'Executive sponsor meeting with CMO and VP Global Marketing.',
    summary: 'CMO expressed strong interest in unifying customer data across regions. Current MarTech stack is fragmented (6 different tools). Wants single source of truth for customer profiles.',
    participants: ['Lisa Wang (CMO)', 'Marcus Hoffman (VP Global Marketing)', 'Tyler'],
    outcomes: [
      'CMO committed to championing deal internally',
      'Requested pricing flexibility for multi-year commit',
    ],
  });

  await db.todos.bulkAdd([
    {
      id: 'seed-todo-nxp-1',
      opportunityId: opp2Id,
      task: 'Work with Adobe pricing team on volume discount structure',
      dueDate: new Date('2026-02-19'),
      completed: false,
      priority: 'High',
    },
    {
      id: 'seed-todo-nxp-2',
      opportunityId: opp2Id,
      task: 'Create integration roadmap doc with IT timelines',
      dueDate: new Date('2026-02-22'),
      completed: false,
      priority: 'Medium',
    },
    {
      id: 'seed-todo-nxp-3',
      opportunityId: opp2Id,
      task: 'Schedule EMEA stakeholder alignment call',
      dueDate: new Date('2026-02-25'),
      completed: false,
      priority: 'Medium',
    },
  ]);

  await db.dependencies.add({
    id: 'seed-dep-nxp-1',
    opportunityId: opp2Id,
    description: 'Waiting on SAP Commerce connector documentation from Product team',
    owner: 'Adobe Product',
    status: 'Pending',
    dueDate: new Date('2026-02-21'),
  });

  // === Opportunity 3: Vizient ===
  const opp3Id = 'seed-vizient-001';
  await db.opportunities.add({
    id: opp3Id,
    accountName: 'Vizient',
    dealName: 'Real-Time CDP for Member Engagement',
    stage: 'Discovery',
    value: 800000,
    closeDate: new Date('2026-06-30'),
    lastAction: 'Initial discovery call 2/8, identified pain points around member data fragmentation',
    challenges: [
      'Unclear budget ownership (split between IT and Marketing)',
      'Long sales cycle typical for healthcare GPOs',
      'Stakeholder discovery still in progress',
    ],
    nextAction: 'Multi-threading: schedule calls with IT Director and Member Experience VP by 3/1',
    risk: 'Low',
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-02-08'),
  });

  await db.interactions.add({
    id: 'seed-int-vizient-1',
    opportunityId: opp3Id,
    type: 'discovery_call',
    date: new Date('2026-02-08'),
    notes: 'First discovery call to explore member engagement needs.',
    summary: 'Vizient wants to improve member engagement by creating unified profiles across membership portal, events, and education programs. Currently data lives in 4 separate systems.',
    participants: ['Amanda Foster (Director of Member Experience)', 'Tyler'],
    outcomes: [
      'Agreed to broader stakeholder discovery',
      'Need to involve IT and potentially CDO',
    ],
  });

  await db.todos.bulkAdd([
    {
      id: 'seed-todo-vizient-1',
      opportunityId: opp3Id,
      task: "Research Vizient's current MarTech stack",
      dueDate: new Date('2026-02-20'),
      completed: false,
      priority: 'Medium',
    },
    {
      id: 'seed-todo-vizient-2',
      opportunityId: opp3Id,
      task: 'Prepare discovery deck for IT stakeholders',
      dueDate: new Date('2026-02-24'),
      completed: false,
      priority: 'Medium',
    },
    {
      id: 'seed-todo-vizient-3',
      opportunityId: opp3Id,
      task: 'Find references from other healthcare GPOs using RT-CDP',
      dueDate: new Date('2026-02-27'),
      completed: false,
      priority: 'Low',
    },
  ]);
}
