import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useMTFSStore } from '../../store/mtfsStore';
import { ScenarioPlanning } from '../panels/ScenarioPlanning';

describe('ScenarioPlanning simplified flow', () => {
  beforeEach(() => {
    useMTFSStore.getState().resetToDefaults();
  });

  it('renders the four-step scenario flow without top-level committee bookmarks', () => {
    render(<ScenarioPlanning />);

    expect(screen.getAllByText('Option Setup').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Executive Comparison').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sensitivity Preview').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Decision Pack Export').length).toBeGreaterThan(0);
    expect(screen.queryByText('Committee Question Bookmarks')).not.toBeInTheDocument();
  });

  it('keeps sensitivity preview non-destructive until applied to a new scenario', () => {
    useMTFSStore.getState().createDefaultScenarioPack();
    const beforeResult = useMTFSStore.getState().result.totalGap;
    const beforeScenarioCount = useMTFSStore.getState().scenarios.length;

    render(<ScenarioPlanning />);
    fireEvent.change(screen.getByLabelText('Pay award shock'), { target: { value: '2' } });

    expect(useMTFSStore.getState().result.totalGap).toBe(beforeResult);
    expect(useMTFSStore.getState().scenarios.length).toBe(beforeScenarioCount);

    fireEvent.click(screen.getByText('Apply preview to new scenario'));

    expect(useMTFSStore.getState().scenarios.length).toBe(beforeScenarioCount + 1);
    expect(useMTFSStore.getState().scenarios.at(-1)?.name).toContain('sensitivity preview');
  });
});
