import { render, screen } from '@testing-library/react';
import { GovernancePanel } from '../panels/GovernancePanel';
import { useMTFSStore } from '../../store/mtfsStore';

describe('GovernancePanel', () => {
  beforeEach(() => {
    useMTFSStore.getState().resetToDefaults();
  });

  it('renders core export actions', () => {
    render(<GovernancePanel />);

    expect(screen.getByText('Freeze Pack')).toBeInTheDocument();
    expect(screen.getByText('Readiness Check')).toBeInTheDocument();
    expect(screen.getByText('Member Brief')).toBeInTheDocument();
    expect(screen.getByText('S151 Pack')).toBeInTheDocument();
    expect(screen.getByText('Data CSV')).toBeInTheDocument();
  });
});
