export type Stage =
  | 'Discovery'
  | 'Demo'
  | 'Proposal'
  | 'Negotiation'
  | 'Closed Won'
  | 'Closed Lost';

export type RiskLevel = 'Low' | 'Medium' | 'High';

export type InteractionType = 'customer_call' | 'internal_call' | 'email' | 'meeting';

export type Priority = 'Low' | 'Medium' | 'High';

export type DependencyStatus = 'Pending' | 'In Progress' | 'Completed' | 'Blocked';

export interface Interaction {
  id: string;
  opportunityId: string;
  type: InteractionType;
  date: Date;
  notes: string;
  participants: string[];
  outcomes: string[];
}

export interface Todo {
  id: string;
  opportunityId: string;
  task: string;
  dueDate: Date;
  completed: boolean;
  priority: Priority;
}

export interface Dependency {
  id: string;
  opportunityId: string;
  description: string;
  owner: string;
  status: DependencyStatus;
  dueDate?: Date;
}

export interface Opportunity {
  id: string;
  accountName: string;
  dealName: string;
  stage: Stage;
  value: number;
  closeDate: Date;
  lastAction: string;
  challenges: string[];
  nextAction: string;
  risk: RiskLevel;
  createdAt: Date;
  updatedAt: Date;
}
