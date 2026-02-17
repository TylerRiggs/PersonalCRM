import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import type { Opportunity, Stage, RiskLevel } from '../types';

export function useOpportunities(filters?: {
  stage?: Stage;
  risk?: RiskLevel;
  search?: string;
}) {
  const opportunities = useLiveQuery(async () => {
    let collection = db.opportunities.orderBy('updatedAt').reverse();
    let results = await collection.toArray();

    if (filters?.stage) {
      results = results.filter((o) => o.stage === filters.stage);
    }
    if (filters?.risk) {
      results = results.filter((o) => o.risk === filters.risk);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (o) =>
          o.accountName.toLowerCase().includes(q) ||
          o.dealName.toLowerCase().includes(q)
      );
    }
    return results;
  }, [filters?.stage, filters?.risk, filters?.search]);

  return opportunities ?? [];
}

export function useOpportunity(id: string | undefined) {
  return useLiveQuery(
    () => (id ? db.opportunities.get(id) : undefined),
    [id]
  );
}

export async function createOpportunity(
  data: Omit<Opportunity, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = uuid();
  const now = new Date();
  await db.opportunities.add({
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateOpportunity(
  id: string,
  data: Partial<Omit<Opportunity, 'id' | 'createdAt'>>
) {
  await db.opportunities.update(id, {
    ...data,
    updatedAt: new Date(),
  });
}

export async function deleteOpportunity(id: string) {
  await db.transaction('rw', [db.opportunities, db.interactions, db.todos, db.dependencies], async () => {
    await db.interactions.where('opportunityId').equals(id).delete();
    await db.todos.where('opportunityId').equals(id).delete();
    await db.dependencies.where('opportunityId').equals(id).delete();
    await db.opportunities.delete(id);
  });
}
