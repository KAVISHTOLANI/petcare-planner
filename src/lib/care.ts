import { addDays, addMonths, daysBetween, isValidISODate } from '../shared/dates';

export type Species = 'Dog' | 'Cat' | 'Rabbit' | 'Bird' | 'Fish' | 'Reptile' | 'Other';
export const SPECIES: Species[] = ['Dog', 'Cat', 'Rabbit', 'Bird', 'Fish', 'Reptile', 'Other'];
export type Category = 'Feeding' | 'Medication' | 'Grooming' | 'Exercise' | 'Health check' | 'Cleaning';
export const CATEGORIES: Category[] = ['Feeding', 'Medication', 'Grooming', 'Exercise', 'Health check', 'Cleaning'];

export interface Pet {
  id: string;
  name: string;
  species: Species;
  breed: string;
  birthDate: string; // '' when unknown
  notes: string;
  weights: { date: string; kg: number }[];
  demo?: boolean;
}

export type Unit = 'day' | 'week' | 'month';
export interface CareTask {
  id: string;
  petId: string;
  title: string;
  category: Category;
  every: number;
  unit: Unit;
  /** Only for daily tasks: how many times each day (e.g. feeding twice). */
  timesPerDay: number;
  /** First due date when the task has never been done. */
  start: string;
  instructions: string;
}

export interface LogEntry {
  id: string;
  taskId: string;
  petId: string;
  date: string;
  note: string;
}

export function addInterval(iso: string, every: number, unit: Unit): string {
  if (unit === 'day') return addDays(iso, every);
  if (unit === 'week') return addDays(iso, every * 7);
  return addMonths(iso, every);
}

export function intervalLabel(t: Pick<CareTask, 'every' | 'unit' | 'timesPerDay'>): string {
  if (t.unit === 'day' && t.every === 1) return t.timesPerDay > 1 ? `${t.timesPerDay}× a day` : 'Daily';
  if (t.every === 1) return t.unit === 'week' ? 'Weekly' : 'Monthly';
  return `Every ${t.every} ${t.unit}s`;
}

export function lastDone(log: LogEntry[], taskId: string): string | null {
  let last: string | null = null;
  for (const e of log) if (e.taskId === taskId && (!last || e.date > last)) last = e.date;
  return last;
}

export function doneOn(log: LogEntry[], taskId: string, date: string): number {
  return log.filter((e) => e.taskId === taskId && e.date === date).length;
}

/** Next due date: one interval after the last time it was done, or the start date if never done. */
export function nextDue(t: CareTask, log: LogEntry[], today: string): string {
  if (t.unit === 'day' && t.every === 1) {
    // Daily tasks are due today until done the required number of times.
    if (t.start > today) return t.start;
    return doneOn(log, t.id, today) >= t.timesPerDay ? addDays(today, 1) : today;
  }
  const last = lastDone(log, t.id);
  return last ? addInterval(last, t.every, t.unit) : t.start;
}

export type DueState = 'overdue' | 'today' | 'soon' | 'later';
export function dueState(due: string, today: string, soonDays = 3): DueState {
  const d = daysBetween(today, due);
  if (d < 0) return 'overdue';
  if (d === 0) return 'today';
  return d <= soonDays ? 'soon' : 'later';
}

export interface DueItem {
  task: CareTask;
  due: string;
  state: DueState;
  remaining: number; // times still needed today for multi-daily tasks
}

export function agenda(tasks: CareTask[], log: LogEntry[], today: string): DueItem[] {
  return tasks
    .map((task) => {
      const due = nextDue(task, log, today);
      const daily = task.unit === 'day' && task.every === 1;
      return { task, due, state: dueState(due, today), remaining: daily && due === today ? task.timesPerDay - doneOn(log, task.id, today) : 1 };
    })
    .sort((a, b) => a.due.localeCompare(b.due) || a.task.title.localeCompare(b.task.title));
}

export function ageLabel(birth: string, today: string): string {
  if (!birth) return 'Age unknown';
  const [by, bm, bd] = birth.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  let months = (ty - by) * 12 + (tm - bm) - (td < bd ? 1 : 0);
  if (months < 0) return 'Not born yet';
  if (months < 1) return `${daysBetween(birth, today)} days`;
  const y = Math.floor(months / 12);
  months %= 12;
  const parts = [y ? `${y} year${y === 1 ? '' : 's'}` : '', months ? `${months} month${months === 1 ? '' : 's'}` : ''].filter(Boolean);
  return parts.join(' ');
}

export function weightTrend(weights: Pet['weights']) {
  const s = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  if (s.length < 2) return { latest: s[0] ?? null, change: null as number | null, pct: null as number | null };
  const first = s[0], latest = s[s.length - 1];
  const change = Math.round((latest.kg - first.kg) * 100) / 100;
  return { latest, change, pct: Math.round((change / first.kg) * 1000) / 10 };
}

export function addWeight(weights: Pet['weights'], date: string, kg: number): Pet['weights'] {
  return [...weights.filter((w) => w.date !== date), { date, kg }].sort((a, b) => a.date.localeCompare(b.date));
}

export type Errors<K extends string> = Partial<Record<K, string>>;

export function validatePet(d: { name: string; birthDate: string }, today: string): Errors<'name' | 'birthDate'> {
  const e: Errors<'name' | 'birthDate'> = {};
  if (!d.name.trim()) e.name = 'Enter your pet’s name.';
  if (d.birthDate && (!isValidISODate(d.birthDate) || d.birthDate > today)) e.birthDate = 'Birth date must be a real date, not in the future.';
  return e;
}

export function validateTask(d: { title: string; every: string; timesPerDay: string; unit: Unit; start: string }): Errors<'title' | 'every' | 'timesPerDay' | 'start'> {
  const e: Errors<'title' | 'every' | 'timesPerDay' | 'start'> = {};
  if (!d.title.trim()) e.title = 'Describe the task.';
  const every = Number(d.every);
  if (!Number.isInteger(every) || every < 1 || every > 365) e.every = 'Use a whole number from 1 to 365.';
  const times = Number(d.timesPerDay);
  if (d.unit === 'day' && every === 1 && (!Number.isInteger(times) || times < 1 || times > 12)) e.timesPerDay = 'Between 1 and 12 times a day.';
  if (!isValidISODate(d.start)) e.start = 'Enter the first due date.';
  return e;
}

export function validateWeight(kgText: string, date: string, today: string): string | null {
  const kg = Number(kgText);
  if (!kgText.trim() || !Number.isFinite(kg) || kg <= 0 || kg > 200) return 'Enter a weight in kilograms between 0 and 200.';
  if (!isValidISODate(date) || date > today) return 'Use today or an earlier date.';
  return null;
}
