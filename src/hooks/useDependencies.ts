import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import type { Dependency, DependencyStatus } from '../types';

export function useDependencies(opportunityId: string | undefined) {
  return useLiveQuery(
    () =>
      opportunityId
        ? db.dependencies
            .where('opportunityId')
            .equals(opportunityId)
            .toArray()
        : [],
    [opportunityId]
  ) ?? [];
}

export async function createDependency(
  data: Omit<Dependency, 'id'>
): Promise<string> {
  const id = uuid();
  await db.dependencies.add({ ...data, id });
  return id;
}

export async function updateDependencyStatus(id: string, status: DependencyStatus) {
  await db.dependencies.update(id, { status });
}

export async function deleteDependency(id: string) {
  await db.dependencies.delete(id);
}
