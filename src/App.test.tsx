import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

const KEY = 'pawplan:store';

describe('Pawplan', () => {
  it('lists due and overdue care and logs a task', async () => {
    window.location.hash = '/today';
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText('Wet food')).toBeInTheDocument();
    expect(screen.getByText(/· 3 more today/)).toBeInTheDocument();
    expect(screen.getAllByText(/overdue/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Mark done: Long walk for Pip' }));
    expect(screen.getByText('Logged “Long walk” for Pip.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark done: Long walk for Pip' })).not.toBeInTheDocument();
  });

  it('filters Today by pet', async () => {
    window.location.hash = '/today';
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Miso' }));
    expect(screen.queryByText('Long walk')).not.toBeInTheDocument();
    expect(screen.getByText('Wet food')).toBeInTheDocument();
  });

  it('shows the empty state, then adds a pet with validation', async () => {
    localStorage.setItem(KEY, JSON.stringify({ pets: [], tasks: [], log: [] }));
    window.location.hash = '/pets';
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText('No pets yet')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Add pet' }));
    await user.click(await screen.findByRole('button', { name: 'Save pet' }));
    expect(screen.getByText('Enter your pet’s name.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Name'), 'Biscuit');
    await user.click(screen.getByRole('button', { name: 'Save pet' }));
    expect(await screen.findByRole('heading', { name: 'Biscuit' })).toBeInTheDocument();
  });

  it('adds a care task and a weight on the pet page', async () => {
    window.location.hash = '/pet/demo-pip';
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Add task' }));
    expect(screen.getByText('Describe the task.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Task'), 'Dental chew');
    await user.click(screen.getByRole('button', { name: 'Add task' }));
    expect(within(screen.getByRole('table')).getByText('Dental chew')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Weight (kg)'), '-1');
    await user.click(screen.getByRole('button', { name: 'Record weight' }));
    expect(screen.getByText(/between 0 and 200/)).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Weight (kg)'));
    await user.type(screen.getByLabelText('Weight (kg)'), '16.2');
    await user.click(screen.getByRole('button', { name: 'Record weight' }));
    expect(screen.getByText('16.2 kg')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Weight of Pip over time, 6 readings/ })).toBeInTheDocument();
  });

  it('filters the care log by category', async () => {
    window.location.hash = '/log';
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByLabelText('Category'), 'Grooming');
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toHaveTextContent('Brush coat');
  });
});
