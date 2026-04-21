import { render, screen } from '@testing-library/react';
import { GovernancePanel } from '../panels/GovernancePanel';
import { useMTFSStore } from '../../store/mtfsStore';

describe('GovernancePanel', () => {
  beforeEach(() => {
    useMTFSStore.getState().resetToDefaults();
  });

  it('renders core export actions', () => {
    render(<GovernancePanel />);

    expect(screen.getByText('Export Committee Report PDF')).toBeInTheDocument();
    expect(screen.getByText('Export One-Page Member Brief PDF')).toBeInTheDocument();
    expect(screen.getByText('Export Premium Brief PDF')).toBeInTheDocument();
    expect(screen.getByText('Export Data CSV')).toBeInTheDocument();
  });
});
