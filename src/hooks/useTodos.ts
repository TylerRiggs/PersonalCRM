import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuid } from 'uuid';
import { db } from '../db';
import type { Todo } from '../types';

export function useTodos(opportunityId: string | undefined) {
  return useLiveQuery(
    () =>
      opportunityId
        ? db.todos
            .where('opportunityId')
            .equals(opportunityId)
            .toArray()
        : [],
    [opportunityId]
  ) ?? [];
}

export function useAllOverdueTodos() {
  return useLiveQuery(async () => {
    const now = new Date();
    const todos = await db.todos
      .where('completed')
      .equals(0)
      .toArray();
    return todos.filter((t) => new Date(t.dueDate) < now);
  }) ?? [];
}

export async function createTodo(
  data: Omit<Todo, 'id'>
): Promise<string> {
  const id = uuid();
  await db.todos.add({ ...data, id });
  return id;
}

export async function updateTodo(id: string, data: Partial<Omit<Todo, 'id'>>) {
  await db.todos.update(id, data);
}

export async function toggleTodo(id: string) {
  const todo = await db.todos.get(id);
  if (todo) {
    await db.todos.update(id, { completed: !todo.completed });
  }
}

export async function deleteTodo(id: string) {
  await db.todos.delete(id);
}
