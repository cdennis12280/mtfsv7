import { fireEvent, render, screen } from '@testing-library/react';
import { CfoDemoMode } from '../CfoDemoMode';
import { useMTFSStore } from '../../store/mtfsStore';

describe('CfoDemoMode', () => {
  beforeEach(() => {
    useMTFSStore.getState().resetToDefaults();
    useMTFSStore.getState().enterCfoDemoMode();
  });

  it('enters the guided CFO walkthrough and completes all five steps', () => {
    render(<CfoDemoMode />);

    expect(screen.getByText('10-minute CFO / Head of Finance walkthrough')).toBeInTheDocument();
    expect(screen.getByText('Position')).toBeInTheDocument();
    expect(screen.getByText('Drivers')).toBeInTheDocument();
    expect(screen.getByText('Options')).toBeInTheDocument();
    expect(screen.getByText('Assurance')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Load CFO Demo Dataset'));
    expect(screen.getByText(/The MTFS needs/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Drivers'));
    expect(screen.getByText('Gap driver waterfall')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Options'));
    expect(screen.getByText('CFO scenario comparison')).toBeInTheDocument();
    expect(screen.getByText('Recommended Plan')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Assurance'));
    expect(screen.getByText('Assurance drawer')).toBeInTheDocument();
    expect(screen.getByText('Show me the calculation')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Export'));
    expect(screen.getByText('Demo-ready export')).toBeInTheDocument();
    expect(screen.getByText('Rehearsal checklist')).toBeInTheDocument();
  });
});
