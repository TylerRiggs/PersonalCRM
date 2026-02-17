import Dexie, { type Table } from 'dexie';
import type { Opportunity, Interaction, Todo, Dependency } from '../types';

class CRMDatabase extends Dexie {
  opportunities!: Table<Opportunity, string>;
  interactions!: Table<Interaction, string>;
  todos!: Table<Todo, string>;
  dependencies!: Table<Dependency, string>;

  constructor() {
    super('SalesWorkloadManager');

    this.version(1).stores({
      opportunities: 'id, accountName, dealName, stage, risk, closeDate, updatedAt',
      interactions: 'id, opportunityId, type, date',
      todos: 'id, opportunityId, dueDate, completed, priority',
      dependencies: 'id, opportunityId, status',
    });

    // v2: Interaction gains summary, transcript, personalNotes, aiAnalysis, followUpDraft
    this.version(2).stores({
      opportunities: 'id, accountName, dealName, stage, risk, closeDate, updatedAt',
      interactions: 'id, opportunityId, type, date',
      todos: 'id, opportunityId, dueDate, completed, priority',
      dependencies: 'id, opportunityId, status',
    });
  }
}

export const db = new CRMDatabase();
