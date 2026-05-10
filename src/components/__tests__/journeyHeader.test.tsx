import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { JourneyHeader } from '../JourneyHeader';
import { RehearsalChecklist } from '../RehearsalChecklist';
import { useMTFSStore } from '../../store/mtfsStore';

describe('journey UX surfaces', () => {
  beforeEach(() => {
    useMTFSStore.getState().resetToDefaults();
    useMTFSStore.getState().resetWorkflowUiState();
  });

  it('shows role journey, save state and print preview action', () => {
    useMTFSStore.getState().setRolePreset('cfo');
    render(<JourneyHeader />);
    expect(screen.getByText('CFO / S151 Officer journey')).toBeInTheDocument();
    expect(screen.getByText('Saved')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Print preview'));
    expect(useMTFSStore.getState().printPreviewMode).toBe('governance_evidence');
  });

  it('toggles rehearsal checklist items', () => {
    render(<RehearsalChecklist />);
    fireEvent.click(screen.getByText('Demo data loaded'));
    expect(useMTFSStore.getState().rehearsalChecklist.demoDataLoaded).toBe(true);
  });
});
