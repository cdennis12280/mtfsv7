import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { EnhancementPanel } from '../panels/EnhancementPanel';
import { useMTFSStore } from '../../store/mtfsStore';
import { buildPayTemplateSheets, fmtK } from '../../utils/payTemplate';
import { buildContractTemplateSheets } from '../../utils/contractTemplate';

describe('EnhancementPanel helpers', () => {
  beforeEach(() => {
    useMTFSStore.getState().resetToDefaults();
  });

  it('formats negative money with the sign before the pound symbol', () => {
    expect(fmtK(-189_766)).toBe('-£189,766k');
    expect(fmtK(42_000)).toBe('£42,000k');
  });

  it('builds the pay template with workforce post headers only', () => {
    const sheets = buildPayTemplateSheets();
    const blank = sheets.find((sheet) => sheet.name === 'Template_Blank');
    const legacy = sheets.find((sheet) => sheet.name === 'Legacy_Pay_Spine');
    const instructions = sheets.find((sheet) => sheet.name === 'Instructions');

    expect(blank?.rows[0]).toEqual([
      'postId',
      'service',
      'fte',
      'fundingSource',
      'annualCost',
      'payAssumptionGroup',
      'vacancyFactor',
      'generalFundSplit',
      'grantFundSplit',
      'otherSplit',
    ]);
    expect(legacy).toBeUndefined();
    expect(instructions?.rows.flat().join(' ')).toContain('populate Workforce Posts');
  });

  it('builds the contract template with supplier and service columns', () => {
    const sheets = buildContractTemplateSheets();
    const blank = sheets.find((sheet) => sheet.name === 'Template_Blank');
    const example = sheets.find((sheet) => sheet.name === 'Example_Dummy_Data');
    const instructions = sheets.find((sheet) => sheet.name === 'Instructions');

    expect(blank?.rows[0]).toEqual([
      'name',
      'supplier',
      'service',
      'value',
      'clause',
      'bespokeRate',
      'effectiveFromYear',
      'reviewMonth',
      'upliftMethod',
      'fixedRate',
      'customRate',
      'phaseInMonths',
    ]);
    expect(example?.rows[1]).toEqual(['Waste Collection Contract', 'EnviroWaste Ltd', 'Waste and Recycling', 2800, 'cpi', 0, 1, 4, 'cpi', 0, 0, 0]);
    expect(instructions?.rows.flat().join(' ')).toContain('supplier is the provider or framework name');
  });

  it('renders workforce post headers in a table with fixed order', () => {
    useMTFSStore.getState().addWorkforcePost({
      id: 'wf-test',
      postId: 'ASC-SW-001',
      service: 'Adults Services',
      fundingSource: 'general_fund',
      fte: 1,
      annualCost: 46_800,
      payAssumptionGroup: 'njc',
      vacancyFactor: 3,
      generalFundSplit: 100,
      grantFundSplit: 0,
      otherSplit: 0,
    });

    render(<EnhancementPanel />);
    const table = screen.getByTestId('workforce-posts-table');
    const headers = within(table).getAllByRole('columnheader').map((header) => header.textContent);

    expect(headers).toEqual(['Post ID', 'Service', 'FTE', 'Funding', 'Annual Cost', 'Pay Group', 'Vacancy %', 'GF %', 'Grant %', 'Other %', 'Action']);
    expect(within(table).getByLabelText('Remove workforce post ASC-SW-001')).toBeInTheDocument();
  });

  it('shows a row-level split warning when workforce funding splits do not total 100', () => {
    useMTFSStore.getState().addWorkforcePost({
      id: 'wf-warning',
      postId: 'BAD-SPLIT',
      service: 'Adults Services',
      fundingSource: 'general_fund',
      fte: 1,
      annualCost: 46_800,
      payAssumptionGroup: 'default',
      vacancyFactor: 0,
      generalFundSplit: 80,
      grantFundSplit: 10,
      otherSplit: 5,
    });

    render(<EnhancementPanel />);

    expect(screen.getByText('Split total: 95%. Adjust GF, Grant and Other so they total 100% before export.')).toBeInTheDocument();
  });

  it('keeps annual cost editable from the aligned workforce table', () => {
    useMTFSStore.getState().addWorkforcePost({
      id: 'wf-edit',
      postId: 'EDIT-COST',
      service: 'Corporate Finance',
      fundingSource: 'general_fund',
      fte: 1,
      annualCost: 58_500,
      payAssumptionGroup: 'senior',
      vacancyFactor: 0,
      generalFundSplit: 100,
      grantFundSplit: 0,
      otherSplit: 0,
    });

    render(<EnhancementPanel />);
    fireEvent.change(screen.getByLabelText('Annual cost for EDIT-COST'), { target: { value: '62000' } });

    expect(useMTFSStore.getState().baseline.workforceModel.posts.find((post) => post.id === 'wf-edit')?.annualCost).toBe(62_000);
  });

  it('renders index assumption year headers in a single aligned matrix', () => {
    render(<EnhancementPanel />);
    const grid = screen.getByTestId('index-assumptions-grid');
    const headers = Array.from(grid.querySelectorAll('.index-assumptions-header span')).map((header) => header.textContent);

    expect(headers).toEqual(['Index', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5']);
  });

  it('renders every contract index assumption row', () => {
    render(<EnhancementPanel />);
    const grid = screen.getByTestId('index-assumptions-grid');

    expect(within(grid).getByText('cpi')).toBeInTheDocument();
    expect(within(grid).getByText('rpi')).toBeInTheDocument();
    expect(within(grid).getByText('nmw')).toBeInTheDocument();
    expect(within(grid).getByText('fixed')).toBeInTheDocument();
    expect(within(grid).getByText('bespoke')).toBeInTheDocument();
  });

  it('keeps NMW Y2 editable from the aligned index matrix', () => {
    render(<EnhancementPanel />);
    fireEvent.change(screen.getByLabelText('NMW Y2 rate'), { target: { value: '7' } });

    expect(useMTFSStore.getState().baseline.contractIndexationTracker.indexAssumptions.nmw.y2).toBe(7);
  });

  it('renders and edits the contained contract indexation table', () => {
    useMTFSStore.getState().addContractEntry({
      id: 'contract-test',
      name: 'Waste Collection Contract',
      supplier: 'EnviroWaste Ltd',
      service: 'Waste and Recycling',
      fundingSource: 'general_fund',
      value: 2_800,
      clause: 'cpi',
      bespokeRate: 0,
      effectiveFromYear: 1,
      nextUpliftYear: 1,
      reviewMonth: 4,
      upliftMethod: 'cpi',
      fixedRate: 0,
      customRate: 0,
      phaseInMonths: 0,
      capRate: 0,
      collarRate: 0,
    });

    render(<EnhancementPanel />);
    const table = screen.getByTestId('contract-indexation-table');
    const headers = within(table).getAllByRole('columnheader').map((header) => header.textContent);

    expect(headers).toEqual(['Contract', 'Supplier', 'Service', 'Funding', 'Value', 'Method', 'Start Yr', 'Month', 'Rate %', 'Cap %', 'Collar %', 'Action']);
    fireEvent.change(screen.getByLabelText('Value for Waste Collection Contract'), { target: { value: '3200' } });
    expect(useMTFSStore.getState().baseline.contractIndexationTracker.contracts.find((contract) => contract.id === 'contract-test')?.value).toBe(3_200);
    expect(within(table).getByLabelText('Remove contract Waste Collection Contract')).toBeInTheDocument();
  });

  it('renders and edits the contained invest-to-save table', () => {
    useMTFSStore.getState().addInvestToSaveProposal({
      id: 'i2s-test',
      name: 'Digital Case Management',
      upfrontCost: 1_200,
      annualSaving: 420,
      paybackYears: 3,
      deliveryYear: 1,
    });

    render(<EnhancementPanel />);
    const table = screen.getByTestId('invest-to-save-table');
    const headers = within(table).getAllByRole('columnheader').map((header) => header.textContent);

    expect(headers).toEqual(['Proposal', 'Upfront (£k)', 'Saving (£k)', 'Payback', 'Start Yr', 'Action']);
    fireEvent.change(screen.getByLabelText('Annual saving for Digital Case Management'), { target: { value: '500' } });
    expect(useMTFSStore.getState().baseline.investToSave.proposals.find((proposal) => proposal.id === 'i2s-test')?.annualSaving).toBe(500);
    expect(within(table).getByLabelText('Remove invest-to-save proposal Digital Case Management')).toBeInTheDocument();
  });

  it('renders and edits the contained income generation table', () => {
    useMTFSStore.getState().addIncomeLine({
      id: 'income-test',
      name: 'Traded Service',
      baseVolume: 2_000,
      basePrice: 120,
      volumeGrowth: 1.5,
      priceGrowth: 2.5,
    });

    render(<EnhancementPanel />);
    const table = screen.getByTestId('income-generation-table');
    const headers = within(table).getAllByRole('columnheader').map((header) => header.textContent);

    expect(headers).toEqual(['Line', 'Volume', 'Price', 'Vol %', 'Price %', 'Action']);
    fireEvent.change(screen.getByLabelText('Base price for Traded Service'), { target: { value: '150' } });
    expect(useMTFSStore.getState().baseline.incomeGenerationWorkbook.lines.find((line) => line.id === 'income-test')?.basePrice).toBe(150);
    expect(within(table).getByLabelText('Remove income line Traded Service')).toBeInTheDocument();
  });

  it('renders and edits the contained growth proposals table', () => {
    useMTFSStore.getState().addGrowthProposal({
      id: 'growth-test',
      name: 'Demand Growth',
      service: 'ASC',
      owner: 'Service Director',
      value: 500,
      deliveryYear: 1,
      isRecurring: true,
      confidence: 80,
      yearlyPhasing: [100, 100, 100, 100, 100],
      notes: '',
      status: 'Draft',
      evidenceNote: '',
    });

    render(<EnhancementPanel />);
    const table = screen.getByTestId('growth-proposals-table');
    const headers = within(table).getAllByRole('columnheader').map((header) => header.textContent);

    expect(headers).toEqual(['Proposal', 'Service', 'Owner', 'Value', 'Start Yr', 'Recurrence', 'Confidence', 'Y1 %', 'Y2 %', 'Y3 %', 'Y4 %', 'Y5 %', 'Notes', 'Action']);
    fireEvent.change(screen.getByLabelText('Value for growth proposal Demand Growth'), { target: { value: '650' } });
    expect(useMTFSStore.getState().baseline.growthProposals.find((proposal) => proposal.id === 'growth-test')?.value).toBe(650);
    expect(within(table).getByLabelText('Remove growth proposal Demand Growth')).toBeInTheDocument();
  });

  it('renders and edits the contained manual overrides table', () => {
    useMTFSStore.getState().addManualAdjustment({
      id: 'manual-test',
      service: 'Corporate',
      year: 1,
      amount: 100,
      reason: 'Manual override',
    });

    render(<EnhancementPanel />);
    const table = screen.getByTestId('manual-overrides-table');
    const headers = within(table).getAllByRole('columnheader').map((header) => header.textContent);

    expect(headers).toEqual(['Service', 'Year', 'Amount', 'Reason', 'Action']);
    fireEvent.change(screen.getByLabelText('Amount for manual override Corporate'), { target: { value: '125' } });
    expect(useMTFSStore.getState().baseline.manualAdjustments.find((adjustment) => adjustment.id === 'manual-test')?.amount).toBe(125);
    expect(within(table).getByLabelText('Remove manual override Corporate')).toBeInTheDocument();
  });

  it('renders growth and override import controls', () => {
    render(<EnhancementPanel />);

    expect(screen.getByLabelText('Import Growth CSV/XLSX')).toBeInTheDocument();
    expect(screen.getByLabelText('Import Override CSV/XLSX')).toBeInTheDocument();
    expect(screen.getByText('Growth Template')).toBeInTheDocument();
    expect(screen.getByText('Override Template')).toBeInTheDocument();
  });

  it('imports growth proposal CSV rows into Growth & Manual Overrides', async () => {
    render(<EnhancementPanel />);
    const file = new File(
      ['name,service,owner,value,deliveryYear,isRecurring,confidence,year1,year2,year3,year4,year5,notes\nASC pressure,ASC,Director ASC,1500,2,true,85,0,100,100,100,100,Market pressure'],
      'growth.csv',
      { type: 'text/csv' }
    );

    fireEvent.change(screen.getByLabelText('Import Growth CSV/XLSX'), { target: { files: [file] } });

    await waitFor(() => expect(useMTFSStore.getState().baseline.growthProposals).toHaveLength(1));
    const imported = useMTFSStore.getState().baseline.growthProposals[0];
    expect(imported.name).toBe('ASC pressure');
    expect(imported.yearlyPhasing).toEqual([0, 100, 100, 100, 100]);
    expect(screen.getByText('Imported 1 growth proposal row from growth.csv')).toBeInTheDocument();
  });

  it('imports manual override CSV rows into Growth & Manual Overrides', async () => {
    render(<EnhancementPanel />);
    const file = new File(
      ['service,year,amount,reason\nCorporate,3,-300,Expected one-off release'],
      'overrides.csv',
      { type: 'text/csv' }
    );

    fireEvent.change(screen.getByLabelText('Import Override CSV/XLSX'), { target: { files: [file] } });

    await waitFor(() => expect(useMTFSStore.getState().baseline.manualAdjustments).toHaveLength(1));
    const imported = useMTFSStore.getState().baseline.manualAdjustments[0];
    expect(imported.service).toBe('Corporate');
    expect(imported.year).toBe(3);
    expect(imported.amount).toBe(-300);
    expect(screen.getByText('Imported 1 manual override row from overrides.csv')).toBeInTheDocument();
  });

  it('shows reserve methodology assurance status and threshold comparison', () => {
    render(<EnhancementPanel />);

    expect(screen.getByText('Reserve assurance')).toBeInTheDocument();
    expect(screen.getByText('Above minimum')).toBeInTheDocument();
    expect(screen.getByText('Closing reserves')).toBeInTheDocument();
    expect(screen.getByText('Effective threshold')).toBeInTheDocument();
    expect(screen.getByText('A fixed cash floor is used as the minimum reserve requirement.')).toBeInTheDocument();
  });

  it('shows treasury RAG status, headroom and breach explanation', () => {
    useMTFSStore.getState().updateTreasuryIndicators({
      enabled: true,
      authorisedLimit: 120_000,
      operationalBoundary: 105_000,
      netFinancingNeed: 110_000,
    });

    render(<EnhancementPanel />);

    expect(screen.getByText('Treasury status')).toBeInTheDocument();
    expect(screen.getByText('Amber')).toBeInTheDocument();
    expect(screen.getByText('Headroom to operational boundary')).toBeInTheDocument();
    expect(screen.getByText('-£5,000k')).toBeInTheDocument();
    expect(screen.getByText('Net Financing Need exceeds Operational Boundary')).toBeInTheDocument();
  });

  it('shows treasury validation when the operational boundary exceeds the authorised limit', () => {
    useMTFSStore.getState().updateTreasuryIndicators({
      enabled: true,
      authorisedLimit: 100_000,
      operationalBoundary: 105_000,
      netFinancingNeed: 90_000,
    });

    render(<EnhancementPanel />);

    expect(screen.getByText('Red')).toBeInTheDocument();
    expect(screen.getByText('Operational boundary should not exceed the authorised limit.')).toBeInTheDocument();
  });

  it('shows a clear MRP disabled state instead of zero-year charges', () => {
    render(<EnhancementPanel />);

    expect(screen.getByText('MRP is not currently included in the MTFS calculation.')).toBeInTheDocument();
  });

  it('shows MRP yearly charges and revenue gap impact when enabled', () => {
    useMTFSStore.getState().updateMrpCalculator({ enabled: true });

    render(<EnhancementPanel />);

    expect(screen.getByText('Y1 revenue gap impact')).toBeInTheDocument();
    expect(screen.getByText('Five-year MRP total')).toBeInTheDocument();
    expect(screen.getByText('Charges borrowing over the remaining asset life, increasing as life shortens.')).toBeInTheDocument();
  });

  it('renames A31 controls and shows evidence snapshot status', () => {
    render(<EnhancementPanel />);

    expect(screen.getAllByText('No evidence saved').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Save Evidence Snapshot').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Open Evidence / A31').length).toBeGreaterThan(0);
  });

  it('moves source reconciliation behind assurance and advanced setup accordions', () => {
    render(<EnhancementPanel />);

    expect(screen.queryByText('Overlay Import & Reconciliation')).not.toBeInTheDocument();
    expect(screen.getByText('Assurance / Evidence')).toBeInTheDocument();
    expect(screen.getByText('8 checks · 0 matched · 0 variances')).toBeInTheDocument();
    expect(screen.queryByText('Source Data Reconciliation')).not.toBeInTheDocument();
    expect(screen.queryByText('Reconciliation filter')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Assurance / Evidence' }));

    expect(screen.getByText('Source Data Reconciliation')).toBeInTheDocument();
    expect(screen.getByText('Use this to compare imported finance source values against the model without changing the model.')).toBeInTheDocument();
    expect(screen.getByText('Advanced reconciliation setup')).toBeInTheDocument();
    expect(screen.queryByText('Reconciliation filter')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Advanced reconciliation setup' }));

    expect(screen.getByText('Add Mapping Profile')).toBeInTheDocument();
    expect(screen.getByLabelText('Import Overlay CSV/XLSX')).toBeInTheDocument();
    expect(screen.getByText('Reconciliation filter')).toBeInTheDocument();
  });
});
