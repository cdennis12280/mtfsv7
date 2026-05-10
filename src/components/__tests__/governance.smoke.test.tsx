import { render, screen } from '@testing-library/react';
import { GovernancePanel } from '../panels/GovernancePanel';
import { useMTFSStore } from '../../store/mtfsStore';

describe('GovernancePanel', () => {
  beforeEach(() => {
    useMTFSStore.getState().resetToDefaults();
  });

  it('renders core export actions', () => {
    render(<GovernancePanel />);

    expect(screen.getByText('Governance Readiness')).toBeInTheDocument();
    expect(screen.getByText('Export Pack')).toBeInTheDocument();
    expect(screen.getByText('Freeze Pack')).toBeInTheDocument();
    expect(screen.getByText('Readiness Check')).toBeInTheDocument();
    expect(screen.getByText('Member Brief')).toBeInTheDocument();
    expect(screen.getByText('S151 Pack')).toBeInTheDocument();
    expect(screen.getByText('Data CSV')).toBeInTheDocument();
  });

  it('keeps evidence detail behind collapsed accordions by default', () => {
    render(<GovernancePanel />);
    const methodologySummary = screen.getAllByText('Methodology').find((element) => element.tagName === 'SUMMARY');

    expect(screen.getByText('Evidence and provenance').closest('details')).not.toHaveAttribute('open');
    expect(screen.getByText('Data sources').closest('details')).not.toHaveAttribute('open');
    expect(methodologySummary?.closest('details')).not.toHaveAttribute('open');
    expect(screen.getByText('Limitations').closest('details')).not.toHaveAttribute('open');
    expect(screen.getByText('Assumptions log').closest('details')).not.toHaveAttribute('open');
  });
});
