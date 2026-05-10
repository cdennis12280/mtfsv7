import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useMTFSStore } from '../../store/mtfsStore';
import { HighValuePanel } from '../panels/HighValuePanel';

describe('HighValuePanel funding controls', () => {
  beforeEach(() => {
    useMTFSStore.getState().resetToDefaults();
  });

  it('renders Grant Schedule Builder as an aligned editable table', () => {
    useMTFSStore.getState().addGrantScheduleEntry({
      id: 'grant-test',
      name: 'Public Health Grant',
      value: 4200,
      certainty: 'confirmed',
      endYear: 5,
      ringfenced: true,
      inflationLinked: true,
      replacementAssumption: 100,
    });

    render(<HighValuePanel />);

    const table = screen.getByTestId('grant-schedule-table');
    const headers = within(table).getAllByRole('columnheader').map((header) => header.textContent);

    expect(headers).toEqual(['Grant', 'Value (£k)', 'Certainty', 'End Year', 'Ringfenced', 'Inflation Linked', 'Replacement %', 'Action']);
    expect(within(table).getByLabelText('Grant value for Public Health Grant')).toBeInTheDocument();
    expect(within(table).getByLabelText('Remove grant Public Health Grant')).toBeInTheDocument();
  });

  it('keeps grant values editable from the aligned table', () => {
    useMTFSStore.getState().addGrantScheduleEntry({
      id: 'grant-edit',
      name: 'Services Grant',
      value: 1000,
      certainty: 'indicative',
      endYear: 3,
      ringfenced: false,
      inflationLinked: false,
      replacementAssumption: 50,
    });

    render(<HighValuePanel />);
    fireEvent.change(screen.getByLabelText('Grant value for Services Grant'), { target: { value: '1250' } });

    expect(useMTFSStore.getState().baseline.grantSchedule.find((grant) => grant.id === 'grant-edit')?.value).toBe(1250);
  });

  it('shows calculation impact summaries for central funding models', () => {
    render(<HighValuePanel />);

    expect(screen.getAllByText('Calculation impact').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('Y1 council tax yield')).toBeInTheDocument();
    expect(screen.getByText('Y1 retained rates')).toBeInTheDocument();
    expect(screen.getByText('Baseline core grants')).toBeInTheDocument();
  });
});
