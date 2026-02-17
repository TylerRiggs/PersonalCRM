import type { Opportunity, Interaction } from '../types';

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

export function formatInteractionType(type: Interaction['type']): string {
  const map: Record<Interaction['type'], string> = {
    customer_call: 'Customer Call',
    internal_call: 'Internal Call',
    email: 'Email',
    meeting: 'Meeting',
  };
  return map[type];
}

export function isOverdue(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d < new Date();
}

export function daysSince(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function generateWeeklyUpdate(
  opportunities: Opportunity[],
  weekStart: Date
): string {
  const weekStr = `${weekStart.getMonth() + 1}/${weekStart.getDate()}/${weekStart.getFullYear()}`;
  let output = `=== WEEKLY CRM UPDATE - Week of ${weekStr} ===\n\n`;

  for (const opp of opportunities) {
    output += `OPPORTUNITY: ${opp.dealName} - ${opp.accountName}\n`;
    output += `Last Action: ${opp.lastAction || 'N/A'}\n`;
    output += `Challenges: ${opp.challenges.length > 0 ? opp.challenges.join(', ') : 'None'}\n`;
    output += `Next Action: ${opp.nextAction || 'N/A'}\n`;
    output += `Risk: ${opp.risk}\n`;
    output += '\n---\n\n';
  }

  const totalValue = opportunities.reduce((sum, o) => sum + o.value, 0);
  const high = opportunities.filter((o) => o.risk === 'High').length;
  const medium = opportunities.filter((o) => o.risk === 'Medium').length;
  const low = opportunities.filter((o) => o.risk === 'Low').length;

  output += `[Total Opportunities: ${opportunities.length}]\n`;
  output += `[Total Pipeline Value: ${formatCurrency(totalValue)}]\n`;
  output += `[High Risk: ${high} | Medium Risk: ${medium} | Low Risk: ${low}]\n`;

  return output;
}
