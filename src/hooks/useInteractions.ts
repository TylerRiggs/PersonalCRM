import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import type { Interaction } from '../types';

export function useInteractions(opportunityId: string | undefined) {
  return useLiveQuery(
    () =>
      opportunityId
        ? db.interactions
            .where('opportunityId')
            .equals(opportunityId)
            .reverse()
            .sortBy('date')
        : [],
    [opportunityId]
  ) ?? [];
}

export async function createInteraction(
  data: Omit<Interaction, 'id'>
): Promise<string> {
  const id = uuid();
  await db.interactions.add({ ...data, id });
  // Update opportunity's updatedAt
  await db.opportunities.update(data.opportunityId, {
    updatedAt: new Date(),
  });
  return id;
}

export async function deleteInteraction(id: string) {
  await db.interactions.delete(id);
}
