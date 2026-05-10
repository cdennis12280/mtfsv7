import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import App from '../../App';
import { SavingsProgramme } from '../panels/SavingsProgramme';
import { useMTFSStore } from '../../store/mtfsStore';

vi.mock('../OnboardingCoach', () => ({
  OnboardingCoach: () => null,
}));

describe('Savings and baseline wording', () => {
  beforeEach(() => {
    useMTFSStore.getState().resetToDefaults();
  });

  it('keeps Advanced Modelling on the Baseline page only', () => {
    useMTFSStore.getState().setActiveTab('baseline');
    const { rerender } = render(<App />);

    expect(screen.getByText('Advanced Modelling')).toBeInTheDocument();

    useMTFSStore.getState().setActiveTab('savings');
    rerender(<App />);

    expect(screen.queryByText('Advanced Modelling')).not.toBeInTheDocument();
    expect(screen.getByText('Savings Programme Builder')).toBeInTheDocument();
  });

  it('uses savings-specific labels for proposal details, delivery assumptions and assurance', () => {
    useMTFSStore.getState().addSavingsProposal({
      id: 'saving-wording',
      name: 'Procurement saving',
      description: '',
      category: 'procurement',
      grossValue: 500,
      deliveryYear: 1,
      achievementRate: 80,
      isRecurring: true,
      ragStatus: 'amber',
      responsibleOfficer: 'Head of Procurement',
      yearlyDelivery: [50, 100, 100, 100, 100],
    });

    render(<SavingsProgramme />);

    expect(screen.getByText('Savings Programme Builder')).toBeInTheDocument();
    expect(screen.getByText('Year-by-Year Savings Delivery')).toBeInTheDocument();
    expect(screen.queryByText('Advanced Modelling')).not.toBeInTheDocument();

    const proposalRows = screen.getAllByText('Procurement saving');
    fireEvent.click(proposalRows[proposalRows.length - 1]);

    expect(screen.getByText('Proposal Detail')).toBeInTheDocument();
    expect(screen.getByText('Savings Delivery Assumptions')).toBeInTheDocument();
    expect(screen.getByText('Savings Assurance')).toBeInTheDocument();
  });
});
