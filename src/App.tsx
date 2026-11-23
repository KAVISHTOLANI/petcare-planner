import { useMemo, useState, type ReactNode } from 'react';
import { DemoTag, EmptyState, Field, Landing, NotFound, Notice, PageHead, Shell, downloadText, uid, useFlash, usePersistentState, useRoute } from './shared/ui';
import { DataTable, useTable, type Column } from './shared/table';
import { toCSV } from './shared/csv';
import { addDays, addMonths, daysBetween, formatDay, relativeDays, todayISO } from './shared/dates';
import {
  CATEGORIES,
  SPECIES,
  addWeight,
  ageLabel,
  agenda,
  intervalLabel,
  lastDone,
  validatePet,
  validateTask,
  validateWeight,
  weightTrend,
  type CareTask,
  type Category,
  type DueItem,
  type LogEntry,
  type Pet,
  type Species,
  type Unit,
} from './lib/care';

const KEY = 'pawplan:store';
const NAV = [
  { to: '/', label: 'Overview' },
  { to: '/today', label: 'Today' },
  { to: '/pets', label: 'Pets' },
  { to: '/log', label: 'Care log' },
];
const CAT_ICON: Record<Category, string> = { Feeding: 'F', Medication: 'M', Grooming: 'G', Exercise: 'E', 'Health check': 'H', Cleaning: 'C' };

interface Store {
  pets: Pet[];
  tasks: CareTask[];
  log: LogEntry[];
}

export function demoStore(today: string): Store {
  const pets: Pet[] = [
    { id: 'demo-pip', name: 'Pip', species: 'Dog', breed: 'Mixed breed', birthDate: addMonths(today, -41), notes: 'Nervous around bikes. Allergic to chicken — check treat labels.', weights: [-10, -8, -6, -4, -2, 0].map((m, i) => ({ date: addMonths(today, m), kg: [14.2, 14.6, 15.1, 15.0, 15.6, 15.9][i] })), demo: true },
    { id: 'demo-miso', name: 'Miso', species: 'Cat', breed: 'Domestic shorthair', birthDate: addMonths(today, -98), notes: 'Senior cat. Prefers wet food warmed slightly.', weights: [-9, -6, -3, -1].map((m, i) => ({ date: addDays(addMonths(today, m), -3), kg: [4.6, 4.5, 4.3, 4.25][i] })), demo: true },
    { id: 'demo-clover', name: 'Clover the Netherland dwarf rabbit', species: 'Rabbit', breed: 'Netherland dwarf', birthDate: '', notes: '', weights: [], demo: true },
  ];
  const t = (id: string, petId: string, title: string, category: Category, every: number, unit: Unit, timesPerDay = 1, start = today, instructions = ''): CareTask => ({ id: `demo-${id}`, petId, title, category, every, unit, timesPerDay, start, instructions });
  const tasks: CareTask[] = [
    t('pip-feed', 'demo-pip', 'Breakfast and dinner', 'Feeding', 1, 'day', 2, addDays(today, -60), '180 g dry food per meal'),
    t('pip-walk', 'demo-pip', 'Long walk', 'Exercise', 1, 'day', 1, addDays(today, -60)),
    t('pip-flea', 'demo-pip', 'Flea and tick treatment', 'Medication', 1, 'month', 1, addDays(today, -40), 'Spot-on between the shoulder blades'),
    t('pip-groom', 'demo-pip', 'Brush coat', 'Grooming', 1, 'week', 1, addDays(today, -30)),
    t('pip-vet', 'demo-pip', 'Annual check-up and vaccinations', 'Health check', 12, 'month', 1, addDays(today, 12)),
    t('miso-feed', 'demo-miso', 'Wet food', 'Feeding', 1, 'day', 3, addDays(today, -60), 'Half a pouch, slightly warmed'),
    t('miso-litter', 'demo-miso', 'Change litter tray', 'Cleaning', 2, 'day', 1, addDays(today, -60)),
    t('miso-pill', 'demo-miso', 'Thyroid tablet', 'Medication', 1, 'day', 1, addDays(today, -60), 'Hide in a pill pocket. As prescribed by the vet.'),
    t('clover-hay', 'demo-clover', 'Refill hay and fresh greens', 'Feeding', 1, 'day', 1, addDays(today, -60)),
    t('clover-nails', 'demo-clover', 'Trim nails', 'Grooming', 6, 'week', 1, addDays(today, -50)),
  ];
  const log: LogEntry[] = [];
  const add = (taskId: string, petId: string, date: string, note = '') => log.push({ id: `demo-l${log.length}`, taskId, petId, date, note });
  for (let i = 1; i <= 21; i++) {
    const d = addDays(today, -i);
    add('demo-pip-feed', 'demo-pip', d); add('demo-pip-feed', 'demo-pip', d);
    if (i % 4 !== 0) add('demo-pip-walk', 'demo-pip', d, i === 2 ? 'Met another dog, calm the whole time' : '');
    for (let k = 0; k < 3; k++) add('demo-miso-feed', 'demo-miso', d);
    if (i % 2 === 1) add('demo-miso-litter', 'demo-miso', d);
    if (i !== 1) add('demo-miso-pill', 'demo-miso', d);
    add('demo-clover-hay', 'demo-clover', d);
  }
  add('demo-pip-flea', 'demo-pip', addDays(today, -33));
  add('demo-pip-groom', 'demo-pip', addDays(today, -9), 'Lots of shedding');
  add('demo-clover-nails', 'demo-clover', addDays(today, -40));
  add('demo-pip-feed', 'demo-pip', today);
  return { pets, tasks, log };
}

export default function App() {
  const [route, navigate] = useRoute();
  const today = todayISO();
  const [store, setStore] = usePersistentState<Store>(KEY, () => demoStore(today));
  const ctx = { store, setStore, today, navigate };
  const petEdit = route.match(/^\/pet\/([^/]+)\/edit$/);
  const pet = route.match(/^\/pet\/([^/]+)$/);
  let page: ReactNode;
  if (route === '/') page = <Home />;
  else if (route === '/today') page = <Today {...ctx} />;
  else if (route === '/pets') page = <Pets {...ctx} />;
  else if (route === '/pet/new') page = <PetForm {...ctx} />;
  else if (petEdit) page = <PetForm {...ctx} id={petEdit[1]} />;
  else if (pet) page = <PetPage {...ctx} id={pet[1]} />;
  else if (route === '/log') page = <Log {...ctx} />;
  else page = <NotFound />;
  return (
    <Shell name="Pawplan" wordmark={['Paw', 'plan']} nav={NAV} route={route} cta={{ to: '/today', label: 'Today’s care' }} footerNote="Pawplan is an organiser, not veterinary advice. Follow your vet’s instructions for medication and diet.">
      {page}
    </Shell>
  );
}

type Ctx = { store: Store; setStore: (s: Store) => void; today: string; navigate: (to: string) => void };
const STATE_LABEL = { overdue: 'Overdue', today: 'Due today', soon: 'Soon', later: 'Later' } as const;
const STATE_BADGE = { overdue: 'badge-err', today: 'badge-warn', soon: 'badge-accent', later: '' } as const;

function DueList({ items, pets, today, onDone, compact }: { items: DueItem[]; pets: Pet[]; today: string; onDone?: (i: DueItem) => void; compact?: boolean }) {
  const petName = (id: string) => pets.find((p) => p.id === id)?.name ?? '';
  return (
    <ul className={`due-list ${compact ? 'is-compact' : ''}`}>
      {items.map((i, n) => (
        <li key={i.task.id} className={`due due-${i.state}`} style={{ ['--i' as string]: n }}>
          <span className="cat" aria-hidden="true" data-cat={i.task.category}>{CAT_ICON[i.task.category]}</span>
          <span className="due-body">
            <span className="due-title">{i.task.title}{i.remaining > 1 && <span className="muted"> · {i.remaining} more today</span>}</span>
            <span className="small muted">{petName(i.task.petId)} · {i.task.category} · {intervalLabel(i.task)}{i.task.instructions && !compact && <> · {i.task.instructions}</>}</span>
          </span>
          <span className={`badge ${STATE_BADGE[i.state]}`}>{i.state === 'overdue' ? `${-daysBetween(today, i.due)}d overdue` : i.state === 'today' ? 'Today' : relativeDays(daysBetween(today, i.due))}</span>
          {onDone && <button type="button" className="btn btn-sm btn-primary" onClick={() => onDone(i)} aria-label={`Mark done: ${i.task.title} for ${petName(i.task.petId)}`}>Done</button>}
        </li>
      ))}
    </ul>
  );
}

export function WeightChart({ pet, height = 200, width = 600 }: { pet: Pet; height?: number; width?: number }) {
  const [focus, setFocus] = useState<number | null>(null);
  const pts = [...pet.weights].sort((a, b) => a.date.localeCompare(b.date));
  if (pts.length === 0) return <p className="muted small">No weights recorded yet.</p>;
  const W = width, H = height, L = 64, R = 14, T = 14, B = 30;
  const min = Math.min(...pts.map((p) => p.kg)), max = Math.max(...pts.map((p) => p.kg));
  const pad = Math.max(0.2, (max - min) * 0.25);
  const lo = Math.max(0, min - pad), hi = max + pad;
  const d0 = pts[0].date, span = Math.max(1, daysBetween(d0, pts[pts.length - 1].date));
  const x = (d: string) => L + (pts.length === 1 ? (W - L - R) / 2 : (daysBetween(d0, d) / span) * (W - L - R));
  const y = (kg: number) => T + (1 - (kg - lo) / (hi - lo)) * (H - T - B);
  const ticks = [lo, (lo + hi) / 2, hi];
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ');
  const f = focus != null ? pts[focus] : null;
  return (
    <figure className="wchart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Weight of ${pet.name} over time, ${pts.length} readings from ${pts[0].kg} kg to ${pts[pts.length - 1].kg} kg`} onMouseLeave={() => setFocus(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="grid" />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" className="axis">{t.toFixed(1)} kg</text>
          </g>
        ))}
        <path d={`${path} L${x(pts[pts.length - 1].date)},${H - B} L${x(d0)},${H - B} Z`} className="area" />
        <path d={path} className="line" />
        {pts.map((p, i) => (
          <circle key={p.date} cx={x(p.date)} cy={y(p.kg)} r={focus === i ? 7 : 5} className="pt" tabIndex={0} aria-label={`${formatDay(p.date)}: ${p.kg} kg`} onMouseEnter={() => setFocus(i)} onFocus={() => setFocus(i)} onBlur={() => setFocus(null)} />
        ))}
        <text x={L} y={H - 8} className="axis">{formatDay(pts[0].date, { month: 'short', year: 'numeric' })}</text>
        {pts.length > 1 && <text x={W - R} y={H - 8} textAnchor="end" className="axis">{formatDay(pts[pts.length - 1].date, { month: 'short', year: 'numeric' })}</text>}
        {f && (
          <g transform={`translate(${Math.min(Math.max(x(f.date), 74), W - 74)},${Math.max(y(f.kg) - 16, 16)})`} className="tip">
            <rect x={-70} y={-24} width={140} height={24} rx={4} />
            <text x={0} y={-8} textAnchor="middle">{formatDay(f.date, { day: 'numeric', month: 'short' })} · {f.kg} kg</text>
          </g>
        )}
      </svg>
      <figcaption className="legend"><span><i className="key-line" />Weight (kg)</span><span className="muted">· hover or focus a point for its reading</span></figcaption>
    </figure>
  );
}

function HeroPreview() {
  const today = todayISO();
  const s = demoStore(today);
  const items = agenda(s.tasks, s.log, today).filter((i) => i.state === 'overdue' || i.state === 'today').slice(0, 4);
  return (
    <div className="hero-pp">
      <DueList items={items} pets={s.pets} today={today} compact />
      <div className="hero-pp-weight">
        <p className="eyebrow">Pip · weight, last 10 months</p>
        <WeightChart pet={s.pets[0]} height={150} />
      </div>
    </div>
  );
}

function Home() {
  return (
    <Landing
      eyebrow="Pet care planner · schedules & health log"
      title={<>Every feed, walk and dose — <em>remembered.</em></>}
      lead="Set up each pet’s recurring care once. Pawplan works out what’s due today and what’s overdue, keeps a log of who did what, and charts their weight over time."
      primary={{ href: '#/today', label: 'See today’s care' }}
      secondary={{ href: '#/pets', label: 'Meet the demo pets' }}
      previewLabel="Due today — demo pets"
      preview={<HeroPreview />}
      steps={[
        { title: 'Add a pet', body: 'Name, species, birth date and anything a sitter should know.' },
        { title: 'Add care tasks', body: 'Feeding twice a day, a walk, a monthly flea treatment, a yearly check-up — each with instructions.' },
        { title: 'Tick it off', body: 'Mark tasks done on Today. The next due date moves forward from when it was actually done.' },
      ]}
      stepsIntro="Pawplan opens with three labelled demo pets and three weeks of care history. Remove them whenever you’re ready."
      features={[
        { title: 'Due dates that follow reality', body: 'A monthly treatment given a week late is next due a month after that, not on the old date.' },
        { title: 'Several times a day', body: 'Feeding three times a day stays on the list until the third time is ticked.' },
        { title: 'Weight chart', body: 'Record weigh-ins and see the trend with axis labels, units and readings on hover.' },
        { title: 'Care log', body: 'A searchable history with notes, filters and CSV export for the vet or a pet sitter.' },
      ]}
      note="Pawplan is not veterinary advice. Follow your vet’s instructions for medication and diet."
      closing={{ title: <>Start with the pet <em>who’s staring at you.</em></>, action: { href: '#/pet/new', label: 'Add a pet' } }}
    />
  );
}

/* ---------- Today ---------- */
function Today({ store, setStore, today }: Ctx) {
  const [flash, setFlash] = useFlash();
  const [petFilter, setPetFilter] = useState('');
  const all = agenda(store.tasks, store.log, today).filter((i) => !petFilter || i.task.petId === petFilter);
  const now = all.filter((i) => i.state === 'overdue' || i.state === 'today');
  const upcoming = all.filter((i) => i.state === 'soon');
  if (store.pets.length === 0)
    return <EmptyState title="No pets yet" actions={<><a className="btn btn-primary" href="#/pet/new">Add a pet</a><button type="button" className="btn" onClick={() => setStore(demoStore(today))}>Load demo pets</button></>}>Add a pet, then the care they need.</EmptyState>;
  function done(i: DueItem) {
    setStore({ ...store, log: [...store.log, { id: uid('log'), taskId: i.task.id, petId: i.task.petId, date: today, note: '' }] });
    setFlash({ kind: 'success', text: `Logged “${i.task.title}” for ${store.pets.find((p) => p.id === i.task.petId)?.name}.` });
  }
  return (
    <div className="stack">
      <PageHead eyebrow={formatDay(today, { weekday: 'long', day: 'numeric', month: 'long' })} title={<>Today’s <em>care.</em></>} description={`${now.length} task${now.length === 1 ? '' : 's'} to do now, ${upcoming.length} coming up in the next three days.`} />
      {flash && <Notice kind={flash.kind} onDismiss={() => setFlash(null)}>{flash.text}</Notice>}
      <div className="pet-filter" role="group" aria-label="Filter by pet">
        <button type="button" className="btn btn-sm" aria-pressed={!petFilter} onClick={() => setPetFilter('')}>All pets</button>
        {store.pets.map((p) => <button key={p.id} type="button" className="btn btn-sm" aria-pressed={petFilter === p.id} onClick={() => setPetFilter(p.id)}>{p.name}</button>)}
      </div>
      <section className="card stack" aria-labelledby="now-title">
        <h2 id="now-title" className="h3">To do now</h2>
        {now.length === 0 ? <p className="muted" data-testid="all-done">All caught up — nothing due right now.</p> : <DueList items={now} pets={store.pets} today={today} onDone={done} />}
      </section>
      {upcoming.length > 0 && (
        <section className="card stack" aria-labelledby="soon-title">
          <h2 id="soon-title" className="h3">Next three days</h2>
          <DueList items={upcoming} pets={store.pets} today={today} />
        </section>
      )}
    </div>
  );
}

/* ---------- Pets ---------- */
function Pets({ store, setStore, today }: Ctx) {
  const [flash, setFlash] = useFlash();
  return (
    <div className="stack">
      <PageHead eyebrow="Pets" title={<>Your <em>animals.</em></>} actions={<a className="btn btn-primary" href="#/pet/new">Add pet</a>} />
      {flash && <Notice kind={flash.kind} onDismiss={() => setFlash(null)}>{flash.text}</Notice>}
      {store.pets.length === 0 ? (
        <EmptyState title="No pets yet" actions={<><a className="btn btn-primary" href="#/pet/new">Add a pet</a><button type="button" className="btn" onClick={() => setStore(demoStore(today))}>Load demo pets</button></>}>Each pet gets a profile, a care schedule and a weight chart.</EmptyState>
      ) : (
        <>
          <div className="grid-3 pets">
            {store.pets.map((p, i) => {
              const items = agenda(store.tasks.filter((t) => t.petId === p.id), store.log, today);
              const due = items.filter((x) => x.state === 'overdue' || x.state === 'today').length;
              const w = weightTrend(p.weights);
              return (
                <a key={p.id} href={`#/pet/${p.id}`} className="card pet-card" data-reveal style={{ ['--i' as string]: i }}>
                  <span className="pet-initial" aria-hidden="true">{p.name[0]}</span>
                  <strong className="pet-name">{p.name}</strong>
                  <span className="small muted">{p.species}{p.breed && ` · ${p.breed}`} · {ageLabel(p.birthDate, today)}</span>
                  <span className="row small">
                    <span className={`badge ${due ? 'badge-warn' : 'badge-ok'}`}>{due ? `${due} due now` : 'All done'}</span>
                    {w.latest && <span className="muted">{w.latest.kg} kg</span>}
                    {p.demo && <DemoTag />}
                  </span>
                </a>
              );
            })}
          </div>
          {store.pets.some((p) => p.demo) && (
            <div><button type="button" className="btn btn-ghost btn-sm" onClick={() => { const ids = new Set(store.pets.filter((p) => p.demo).map((p) => p.id)); setStore({ pets: store.pets.filter((p) => !ids.has(p.id)), tasks: store.tasks.filter((t) => !ids.has(t.petId)), log: store.log.filter((l) => !ids.has(l.petId)) }); setFlash({ kind: 'success', text: 'Demo pets removed.' }); }}>Clear demo pets</button></div>
          )}
        </>
      )}
    </div>
  );
}

function PetForm({ store, setStore, today, navigate, id }: Ctx & { id?: string }) {
  const existing = id ? store.pets.find((p) => p.id === id) : undefined;
  const [d, setD] = useState({ name: existing?.name ?? '', species: existing?.species ?? ('Dog' as Species), breed: existing?.breed ?? '', birthDate: existing?.birthDate ?? '', notes: existing?.notes ?? '' });
  const [submitted, setSubmitted] = useState(false);
  if (id && !existing) return <EmptyState title="Pet not found" actions={<a className="btn btn-primary" href="#/pets">Back to pets</a>} />;
  const errors = submitted ? validatePet(d, today) : {};
  function save(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(validatePet(d, today)).length) return;
    const clean = { ...d, name: d.name.trim(), breed: d.breed.trim(), notes: d.notes.trim() };
    if (existing) {
      setStore({ ...store, pets: store.pets.map((p) => (p.id === existing.id ? { ...existing, ...clean, demo: false } : p)) });
      navigate(`/pet/${existing.id}`);
    } else {
      const nid = uid('pet');
      setStore({ ...store, pets: [...store.pets, { ...clean, id: nid, weights: [] }] });
      navigate(`/pet/${nid}`);
    }
  }
  return (
    <div className="stack">
      <PageHead eyebrow={existing ? 'Edit pet' : 'New pet'} title={existing ? <>Edit <em>{existing.name}</em></> : <>Add a <em>pet.</em></>} />
      <form className="card stack" onSubmit={save} noValidate>
        <div className="form-grid">
          <Field label="Name" error={errors.name}>{(p) => <input {...p} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} maxLength={60} />}</Field>
          <Field label="Species">{(p) => <select {...p} value={d.species} onChange={(e) => setD({ ...d, species: e.target.value as Species })}>{SPECIES.map((s) => <option key={s}>{s}</option>)}</select>}</Field>
          <Field label="Breed" hint="Optional">{(p) => <input {...p} value={d.breed} onChange={(e) => setD({ ...d, breed: e.target.value })} />}</Field>
          <Field label="Birth date" hint="Optional; an estimate is fine" error={errors.birthDate}>{(p) => <input {...p} type="date" max={today} value={d.birthDate} onChange={(e) => setD({ ...d, birthDate: e.target.value })} />}</Field>
        </div>
        <Field label="Notes for anyone caring for them" hint="Allergies, habits, vet details">{(p) => <textarea {...p} rows={3} value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} />}</Field>
        <div className="row"><button className="btn btn-primary" type="submit">{existing ? 'Save changes' : 'Save pet'}</button><a className="btn btn-ghost" href={existing ? `#/pet/${existing.id}` : '#/pets'}>Cancel</a></div>
      </form>
    </div>
  );
}

function PetPage({ store, setStore, today, navigate, id }: Ctx & { id: string }) {
  const pet = store.pets.find((p) => p.id === id);
  const [flash, setFlash] = useFlash();
  const [td, setTd] = useState({ title: '', category: 'Feeding' as Category, every: '1', unit: 'day' as Unit, timesPerDay: '1', start: today, instructions: '' });
  const [taskSubmitted, setTaskSubmitted] = useState(false);
  const [w, setW] = useState({ kg: '', date: today });
  const [wErr, setWErr] = useState<string | null>(null);
  if (!pet) return <EmptyState title="Pet not found" actions={<a className="btn btn-primary" href="#/pets">Back to pets</a>}>It may have been removed.</EmptyState>;
  const tasks = store.tasks.filter((t) => t.petId === pet.id);
  const items = agenda(tasks, store.log, today);
  const trend = weightTrend(pet.weights);
  const taskErrors = taskSubmitted ? validateTask(td) : {};
  const daily = td.unit === 'day' && td.every === '1';

  function addTask(e: React.FormEvent) {
    e.preventDefault();
    setTaskSubmitted(true);
    if (Object.keys(validateTask(td)).length) return;
    setStore({ ...store, tasks: [...store.tasks, { id: uid('task'), petId: pet!.id, title: td.title.trim(), category: td.category, every: Number(td.every), unit: td.unit, timesPerDay: daily ? Number(td.timesPerDay) : 1, start: td.start, instructions: td.instructions.trim() }] });
    setTd({ ...td, title: '', instructions: '' });
    setTaskSubmitted(false);
    setFlash({ kind: 'success', text: `Added “${td.title.trim()}”.` });
  }
  function addW(e: React.FormEvent) {
    e.preventDefault();
    const err = validateWeight(w.kg, w.date, today);
    setWErr(err);
    if (err) return;
    setStore({ ...store, pets: store.pets.map((p) => (p.id === pet!.id ? { ...p, weights: addWeight(p.weights, w.date, Math.round(Number(w.kg) * 100) / 100) } : p)) });
    setW({ kg: '', date: today });
    setFlash({ kind: 'success', text: 'Weight recorded.' });
  }

  return (
    <div className="stack">
      <PageHead
        eyebrow={<><a href="#/pets">Pets</a> / {pet.species}</>}
        title={pet.name}
        description={`${pet.breed ? `${pet.breed} · ` : ''}${ageLabel(pet.birthDate, today)}`}
        actions={<><a className="btn" href={`#/pet/${pet.id}/edit`}>Edit</a><button type="button" className="btn btn-danger" onClick={() => { if (window.confirm(`Remove ${pet.name}, their tasks and their care log?`)) { setStore({ pets: store.pets.filter((p) => p.id !== pet.id), tasks: store.tasks.filter((t) => t.petId !== pet.id), log: store.log.filter((l) => l.petId !== pet.id) }); navigate('/pets'); } }}>Remove</button></>}
      />
      {flash && <Notice kind={flash.kind} onDismiss={() => setFlash(null)}>{flash.text}</Notice>}
      {pet.demo && <p><DemoTag /> <span className="small muted">A fictional demo pet.</span></p>}
      {pet.notes && <p className="note-box">{pet.notes}</p>}
      <div className="layout-main">
        <section className="card stack" aria-labelledby="sched-title">
          <h2 id="sched-title" className="h3">Care schedule</h2>
          {tasks.length === 0 ? <p className="muted">No care tasks yet. Add the first one below.</p> : (
            <div className="table-wrap">
              <table className="table">
                <caption className="sr-only">Care tasks for {pet.name}</caption>
                <thead><tr><th scope="col">Task</th><th scope="col">How often</th><th scope="col">Last done</th><th scope="col">Next due</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {items.map((i) => {
                    const last = lastDone(store.log, i.task.id);
                    return (
                      <tr key={i.task.id}>
                        <th scope="row">{i.task.title}<div className="small muted">{i.task.category}{i.task.instructions && ` · ${i.task.instructions}`}</div></th>
                        <td>{intervalLabel(i.task)}</td>
                        <td>{last ? formatDay(last, { day: 'numeric', month: 'short' }) : '—'}</td>
                        <td><span className={`badge ${STATE_BADGE[i.state]}`}>{i.state === 'later' ? formatDay(i.due, { day: 'numeric', month: 'short' }) : i.state === 'soon' ? relativeDays(daysBetween(today, i.due)) : STATE_LABEL[i.state]}</span></td>
                        <td><button type="button" className="btn btn-sm btn-ghost" aria-label={`Delete task ${i.task.title}`} onClick={() => setStore({ ...store, tasks: store.tasks.filter((t) => t.id !== i.task.id), log: store.log.filter((l) => l.taskId !== i.task.id) })}>Delete</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <form className="stack add-task" onSubmit={addTask} noValidate aria-labelledby="add-task-title">
            <h3 id="add-task-title" className="label">Add a care task</h3>
            <div className="form-grid">
              <Field label="Task" error={taskErrors.title}>{(p) => <input {...p} value={td.title} onChange={(e) => setTd({ ...td, title: e.target.value })} placeholder="e.g. Dental chew" />}</Field>
              <Field label="Category">{(p) => <select {...p} value={td.category} onChange={(e) => setTd({ ...td, category: e.target.value as Category })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>}</Field>
              <Field label="Repeat every" error={taskErrors.every}>{(p) => <input {...p} inputMode="numeric" value={td.every} onChange={(e) => setTd({ ...td, every: e.target.value })} />}</Field>
              <Field label="Unit">{(p) => <select {...p} value={td.unit} onChange={(e) => setTd({ ...td, unit: e.target.value as Unit })}><option value="day">Days</option><option value="week">Weeks</option><option value="month">Months</option></select>}</Field>
              {daily && <Field label="Times per day" error={taskErrors.timesPerDay}>{(p) => <input {...p} inputMode="numeric" value={td.timesPerDay} onChange={(e) => setTd({ ...td, timesPerDay: e.target.value })} />}</Field>}
              <Field label="First due" error={taskErrors.start}>{(p) => <input {...p} type="date" value={td.start} onChange={(e) => setTd({ ...td, start: e.target.value })} />}</Field>
            </div>
            <Field label="Instructions" hint="Amounts, where things are kept, what the vet said">{(p) => <input {...p} value={td.instructions} onChange={(e) => setTd({ ...td, instructions: e.target.value })} />}</Field>
            <div><button className="btn btn-primary" type="submit">Add task</button></div>
          </form>
        </section>
        <aside className="card stack" aria-labelledby="w-title">
          <h2 id="w-title" className="h3">Weight</h2>
          {trend.latest && <p><span className="display-num">{trend.latest.kg} kg</span><br /><span className="small muted">{formatDay(trend.latest.date)}{trend.change != null && ` · ${trend.change > 0 ? '+' : ''}${trend.change} kg (${trend.pct}%) since first reading`}</span></p>}
          <WeightChart pet={pet} height={220} width={380} />
          <form className="stack" onSubmit={addW} noValidate>
            <div className="form-grid two">
              <Field label="Weight (kg)" error={wErr}>{(p) => <input {...p} inputMode="decimal" value={w.kg} onChange={(e) => setW({ ...w, kg: e.target.value })} />}</Field>
              <Field label="Date">{(p) => <input {...p} type="date" max={today} value={w.date} onChange={(e) => setW({ ...w, date: e.target.value })} />}</Field>
            </div>
            <div><button className="btn btn-sm" type="submit">Record weight</button></div>
          </form>
          <p className="small muted">Ask your vet what a healthy weight range is for {pet.name}.</p>
        </aside>
      </div>
    </div>
  );
}

/* ---------- Log ---------- */
type Row = LogEntry & { pet: string; task: string; category: string };
function Log({ store, setStore, today }: Ctx) {
  const [pet, setPet] = useState('');
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [since, setSince] = useState('30');
  const rows: Row[] = useMemo(() => {
    const from = since === 'all' ? '' : addDays(today, -Number(since));
    return store.log
      .filter((l) => (!pet || l.petId === pet) && l.date >= from)
      .map((l) => { const t = store.tasks.find((x) => x.id === l.taskId); return { ...l, pet: store.pets.find((p) => p.id === l.petId)?.name ?? '—', task: t?.title ?? 'Deleted task', category: t?.category ?? '' }; })
      .filter((r) => (!cat || r.category === cat) && (!q.trim() || `${r.task} ${r.note}`.toLowerCase().includes(q.trim().toLowerCase())));
  }, [store, pet, cat, q, since, today]);
  const columns: Column<Row>[] = [
    { key: 'date', label: 'Date', sort: (r) => r.date, render: (r) => formatDay(r.date, { day: 'numeric', month: 'short', year: 'numeric' }) },
    { key: 'pet', label: 'Pet', sort: (r) => r.pet, render: (r) => r.pet },
    { key: 'task', label: 'Task', sort: (r) => r.task, render: (r) => r.task },
    { key: 'cat', label: 'Category', sort: (r) => r.category, render: (r) => r.category },
    { key: 'note', label: 'Note', render: (r) => <input className="note-input" aria-label={`Note for ${r.task} on ${r.date}`} defaultValue={r.note} onBlur={(e) => e.target.value !== r.note && setStore({ ...store, log: store.log.map((l) => (l.id === r.id ? { ...l, note: e.target.value } : l)) })} placeholder="Add a note" /> },
  ];
  const table = useTable(rows, columns, { initialSort: 'date', initialDir: 'desc', pageSize: 12 });
  return (
    <div className="stack">
      <PageHead eyebrow="Care log" title={<>What was <em>done, and when.</em></>} actions={<button type="button" className="btn" disabled={!rows.length} onClick={() => downloadText('pawplan-care-log.csv', toCSV(['Date', 'Pet', 'Task', 'Category', 'Note'], rows.map((r) => [r.date, r.pet, r.task, r.category, r.note])), 'text/csv')}>Export CSV</button>} />
      <div className="card stack">
        <div className="filters">
          <Field label="Search" className="grow">{(p) => <input {...p} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Task or note" />}</Field>
          <Field label="Pet">{(p) => <select {...p} value={pet} onChange={(e) => setPet(e.target.value)}><option value="">All pets</option>{store.pets.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>}</Field>
          <Field label="Category">{(p) => <select {...p} value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>}</Field>
          <Field label="Period">{(p) => <select {...p} value={since} onChange={(e) => setSince(e.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="all">All time</option></select>}</Field>
        </div>
        <DataTable caption="Care log entries" columns={columns} table={table} rowKey={(r) => r.id} empty="No care logged for these filters." />
      </div>
    </div>
  );
}
