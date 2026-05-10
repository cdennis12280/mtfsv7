import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import xlsx from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outputPath = path.join(repoRoot, 'demo-data', 'west-northamptonshire-a31-model-snapshot.xlsx');
const createdAt = '2026-05-10T12:00:00.000Z';

const profile = (y1, y2 = y1, y3 = y2, y4 = y3, y5 = y4) => ({ y1, y2, y3, y4, y5 });
const tuple = (y1, y2 = y1, y3 = y2, y4 = y3, y5 = y4) => [y1, y2, y3, y4, y5];

const authorityConfig = {
  authorityName: 'West Northamptonshire Council',
  section151Officer: 'Chief Finance Officer / Section 151 Officer',
  chiefExecutive: 'Chief Executive',
  reportingPeriod: '2026/27 - 2030/31',
  reportDate: '2026-05-10',
  authorityType: 'Unitary Authority',
  population: 430000,
  strategicPriority1: 'Financial sustainability and balanced budget delivery',
  strategicPriority2: 'Protecting adults and children with complex needs',
  strategicPriority3: 'Service transformation, prevention and local growth',
};

const assumptions = {
  funding: {
    councilTaxIncrease: profile(4.95, 4.99, 4.99, 3.99, 3.99),
    businessRatesGrowth: profile(1.2, 1.5, 1.8, 1.8, 2.0),
    grantVariation: profile(1.0, -1.5, -2.0, -1.0, 0.0),
    feesChargesElasticity: profile(2.0, 2.5, 2.5, 2.0, 2.0),
  },
  expenditure: {
    payAward: profile(3.5, 3.0, 2.75, 2.5, 2.5),
    nonPayInflation: profile(3.2, 2.8, 2.5, 2.3, 2.2),
    ascDemandGrowth: profile(5.4, 5.0, 4.7, 4.4, 4.2),
    cscDemandGrowth: profile(5.1, 4.8, 4.5, 4.2, 4.0),
    savingsDeliveryRisk: profile(82, 84, 86, 88, 90),
    payAwardByFundingSource: {
      general_fund: 3.5,
      grant: 3.0,
      other: 2.5,
    },
    payGroupSensitivity: {
      default: 0,
      teachers: 0.4,
      njc: 0.2,
      senior: -0.3,
      other: 0,
    },
  },
  policy: {
    annualSavingsTarget: profile(29000, 18500, 13500, 9000, 7500),
    reservesUsage: profile(0, 0, 0, 0, 0),
    socialCareProtection: true,
  },
  advanced: {
    realTermsToggle: false,
    inflationRate: 2.5,
  },
};

const namedReserves = [
  ['res-gf', 'General Fund Balance', 'Unallocated working balance available for general financial resilience.', 'general_fund', 26000, false, 18000, tuple(0, 0, 0, 0, 0), tuple(0, 0, 0, 0, 0)],
  ['res-budget-risk', 'Budget Risk Reserve', 'Time-limited support for demand volatility, savings risk and budget recovery.', 'general_fund', 14500, false, 6000, tuple(0, 1000, 1000, 1000, 1000), tuple(3500, 2500, 1500, 1000, 500)],
  ['res-transformation', 'Transformation Reserve', 'Funding for change capacity, digital redesign and prevention work.', 'service_specific', 18000, true, 2500, tuple(0, 0, 0, 0, 0), tuple(5000, 4000, 3000, 2000, 1000)],
  ['res-asc', 'Adult Social Care Demand Reserve', 'Service reserve for care market and demographic volatility.', 'service_specific', 12500, true, 3000, tuple(1000, 1000, 1000, 1000, 1000), tuple(3000, 2500, 2000, 1500, 1000)],
  ['res-csc', 'Children Services Improvement Reserve', 'Support for placement sufficiency, safeguarding and improvement activity.', 'service_specific', 10500, true, 2500, tuple(500, 500, 500, 500, 500), tuple(3000, 2500, 1500, 1000, 500)],
  ['res-highways', 'Highways and Transport Reserve', 'Planned maintenance and transport pressure smoothing.', 'service_specific', 8200, true, 1500, tuple(500, 500, 500, 500, 500), tuple(2200, 1800, 1400, 1000, 800)],
  ['res-waste', 'Waste Service Reserve', 'Waste contract transition and mobilisation costs.', 'service_specific', 6100, true, 1000, tuple(0, 500, 500, 500, 500), tuple(1800, 1400, 900, 700, 500)],
  ['res-public-health', 'Public Health Grant Reserve', 'Ringfenced public health programme balances.', 'ringfenced', 7200, true, 0, tuple(0, 0, 0, 0, 0), tuple(1600, 1400, 1000, 800, 600)],
  ['res-hb-subsidy', 'Housing Benefit Subsidy Reserve', 'Ringfenced benefit subsidy and administration timing differences.', 'ringfenced', 4500, true, 0, tuple(0, 0, 0, 0, 0), tuple(800, 700, 600, 500, 400)],
  ['res-dsg', 'Dedicated Schools Grant Reserve', 'Ringfenced schools and high-needs funding management reserve.', 'ringfenced', 9000, true, 0, tuple(0, 0, 0, 0, 0), tuple(2500, 2000, 1500, 1000, 500)],
  ['res-collection', 'Collection Fund Reserve', 'Council tax and business rates collection fund volatility.', 'technical', 7800, true, 0, tuple(0, 0, 0, 0, 0), tuple(1200, 900, 700, 600, 500)],
  ['res-insurance', 'Insurance Reserve', 'Self-insurance, claims and risk financing.', 'technical', 6900, true, 2500, tuple(400, 400, 400, 400, 400), tuple(700, 700, 700, 700, 700)],
  ['res-capital-financing', 'Capital Financing Reserve', 'MRP, interest and capital financing smoothing.', 'technical', 11200, true, 3000, tuple(1000, 1000, 1000, 1000, 1000), tuple(2500, 2200, 1800, 1500, 1200)],
  ['res-pfi', 'PFI and Technical Accounting Reserve', 'PFI lifecycle and technical accounting timing reserve.', 'technical', 5400, true, 0, tuple(0, 0, 0, 0, 0), tuple(900, 800, 700, 600, 500)],
];

const savingsProposals = [
  ['sav-001', 'Adult Social Care reablement expansion', 'Increase reablement throughput and reduce long-term packages.', 'demand-management', 4200, 1, 82, true, 'amber', 'Executive Director Adults', tuple(35, 75, 100, 100, 100)],
  ['sav-002', 'Care market brokerage and placement review', 'Strengthen brokerage controls and review high-cost care packages.', 'demand-management', 3600, 1, 78, true, 'amber', 'Director of Commissioning', tuple(30, 70, 100, 100, 100)],
  ['sav-003', 'Children placement sufficiency programme', 'Increase local placements and reduce high-cost spot purchasing.', 'demand-management', 5100, 2, 70, true, 'red', 'Executive Director Children', tuple(0, 45, 80, 100, 100)],
  ['sav-004', 'SEND transport routing optimisation', 'Route review, eligibility checks and framework retendering.', 'efficiency', 2800, 1, 76, true, 'amber', 'Director Education', tuple(25, 65, 100, 100, 100)],
  ['sav-005', 'Home to school transport personal budgets', 'Increase take-up of direct travel support where appropriate.', 'transformation', 1250, 2, 72, true, 'amber', 'Director Education', tuple(0, 50, 85, 100, 100)],
  ['sav-006', 'Waste contract mobilisation efficiencies', 'Route productivity and contract performance controls.', 'procurement', 2400, 1, 80, true, 'amber', 'Director Environment', tuple(40, 80, 100, 100, 100)],
  ['sav-007', 'Waste income and contamination reduction', 'Improve recycling quality and commercial waste income.', 'income', 900, 2, 76, true, 'amber', 'Director Environment', tuple(0, 60, 100, 100, 100)],
  ['sav-008', 'Highways reactive maintenance productivity', 'Better triage and programme batching for highways works.', 'efficiency', 1300, 1, 84, true, 'green', 'Director Place', tuple(50, 90, 100, 100, 100)],
  ['sav-009', 'Corporate procurement category management', 'Cross-council procurement controls and contract challenge.', 'procurement', 3200, 1, 78, true, 'amber', 'Chief Finance Officer', tuple(35, 75, 100, 100, 100)],
  ['sav-010', 'Agency and interim spend controls', 'Recruitment panel, rate caps and vacancy scrutiny.', 'efficiency', 2100, 1, 86, true, 'green', 'Chief Executive', tuple(60, 100, 100, 100, 100)],
  ['sav-011', 'Workforce redesign and vacancy management', 'Service establishment review with targeted vacancy factor.', 'efficiency', 4700, 1, 74, true, 'amber', 'Director HR', tuple(30, 70, 95, 100, 100)],
  ['sav-012', 'Customer contact digital shift', 'Move repeat transactions to digital and assisted self-service.', 'transformation', 1500, 2, 82, true, 'amber', 'Director Customer', tuple(0, 45, 80, 100, 100)],
  ['sav-013', 'Planning Service Income (2526-B4-035)', 'Planning income and cost recovery uplift.', 'income', 60, 1, 92, true, 'green', 'Director Place', tuple(100, 100, 100, 100, 100)],
  ['sav-014', 'Parking Regulations and Charges (2526-B4-055)', 'Parking income and enforcement policy update.', 'income', 50, 1, 80, true, 'amber', 'Director Place', tuple(75, 100, 100, 100, 100)],
  ['sav-015', 'Regeneration Income Generation (2526-B4-007)', 'Regeneration assets and commercial income uplift.', 'income', 65, 1, 75, true, 'amber', 'Director Place', tuple(50, 100, 100, 100, 100)],
  ['sav-016', 'Internal Audit Restructure (2526-B4-127)', 'Internal audit delivery model restructure.', 'efficiency', 66, 1, 90, true, 'green', 'Monitoring Officer', tuple(100, 100, 100, 100, 100)],
  ['sav-017', 'Integrated Commissioning (2526-B4-107)', 'Joint commissioning and framework rationalisation.', 'procurement', 69, 2, 82, true, 'amber', 'Director Commissioning', tuple(0, 100, 100, 100, 100)],
  ['sav-018', 'Property Estates Staffing Realignment (2526-B4-136)', 'Estates and property operating model realignment.', 'efficiency', 64, 1, 85, true, 'green', 'Director Assets', tuple(100, 100, 100, 100, 100)],
  ['sav-019', 'Economic Growth Revenue Budget Savings (2526-B4-075)', 'Economic growth revenue budget reduction.', 'efficiency', 65, 1, 84, true, 'green', 'Director Economy', tuple(100, 100, 100, 100, 100)],
  ['sav-020', 'Home Adaptations Income Uplift (2526-B4-009)', 'Home adaptations income and recovery action.', 'income', 58, 2, 78, true, 'amber', 'Director Housing', tuple(0, 80, 100, 100, 100)],
  ['sav-021', 'Facilities management consolidation', 'Single facilities model and office optimisation.', 'efficiency', 1700, 1, 80, true, 'amber', 'Director Assets', tuple(40, 80, 100, 100, 100)],
  ['sav-022', 'Asset rationalisation revenue savings', 'Reduce running costs from surplus operational estate.', 'efficiency', 2200, 2, 72, true, 'amber', 'Director Assets', tuple(0, 45, 80, 100, 100)],
  ['sav-023', 'Garden waste and environmental fees review', 'Fees and service income review with concessions protected.', 'income', 1800, 1, 79, true, 'amber', 'Director Environment', tuple(50, 100, 100, 100, 100)],
  ['sav-024', 'Housing temporary accommodation prevention', 'Prevention and move-on programme to reduce nightly paid placements.', 'demand-management', 2600, 2, 74, true, 'amber', 'Director Housing', tuple(0, 50, 85, 100, 100)],
  ['sav-025', 'Finance system automation and controls', 'Automated reconciliations, purchase controls and budget monitoring.', 'transformation', 950, 2, 84, true, 'green', 'Chief Finance Officer', tuple(0, 50, 90, 100, 100)],
  ['sav-026', 'Libraries and community hubs operating review', 'Opening model and hub integration savings.', 'service-reduction', 1200, 3, 66, true, 'red', 'Director Communities', tuple(0, 0, 60, 100, 100)],
  ['sav-027', 'Leisure contract and subsidy review', 'Contract reset and usage-led subsidy reduction.', 'procurement', 1600, 2, 75, true, 'amber', 'Director Communities', tuple(0, 45, 90, 100, 100)],
  ['sav-028', 'Debt recovery and collection improvement', 'Improve collection rates and reduce arrears write-offs.', 'income', 1400, 1, 86, true, 'green', 'Chief Finance Officer', tuple(45, 85, 100, 100, 100)],
  ['sav-029', 'One-off transformation funding release', 'Release uncommitted one-off transformation funding after prioritisation.', 'transformation', 2500, 1, 70, false, 'amber', 'Chief Finance Officer', tuple(100, 0, 0, 0, 0)],
];

const workforcePosts = [
  ['wf-001', 'ASC-CARE-001', 'Adult Social Care Operations', 420, 'general_fund', 42500, 'njc', 4.5, 92, 8, 0],
  ['wf-002', 'ASC-SW-002', 'Adult Social Care Social Work', 310, 'general_fund', 51800, 'njc', 6, 88, 12, 0],
  ['wf-003', 'ASC-COMM-003', 'Adult Social Care Commissioning', 95, 'general_fund', 56500, 'senior', 3, 90, 10, 0],
  ['wf-004', 'ASC-PH-004', 'Public Health Programmes', 70, 'grant', 49600, 'njc', 3, 0, 100, 0],
  ['wf-005', 'CSC-SW-005', 'Children Social Care Social Work', 360, 'general_fund', 53200, 'njc', 8, 95, 5, 0],
  ['wf-006', 'CSC-PLAC-006', 'Children Placements and Safeguarding', 150, 'general_fund', 48700, 'njc', 7, 100, 0, 0],
  ['wf-007', 'EDU-SEND-007', 'SEND and Education Support', 210, 'general_fund', 44800, 'teachers', 5, 74, 26, 0],
  ['wf-008', 'EDU-SCH-008', 'School Improvement and Early Years', 90, 'grant', 47500, 'teachers', 4, 12, 88, 0],
  ['wf-009', 'HIG-OPS-009', 'Highways Operations', 240, 'general_fund', 38900, 'njc', 4, 96, 0, 4],
  ['wf-010', 'HIG-ENG-010', 'Highways Engineering and Transport', 135, 'general_fund', 52400, 'senior', 3, 92, 0, 8],
  ['wf-011', 'ENV-WASTE-011', 'Waste and Recycling Client Team', 125, 'general_fund', 38200, 'njc', 5, 100, 0, 0],
  ['wf-012', 'ENV-PARK-012', 'Parking and Environmental Enforcement', 80, 'other', 35500, 'njc', 3, 55, 0, 45],
  ['wf-013', 'CUS-CON-013', 'Customer Contact Centre', 220, 'general_fund', 32600, 'njc', 6, 100, 0, 0],
  ['wf-014', 'DIG-IT-014', 'Digital, Data and Technology', 165, 'general_fund', 58200, 'senior', 4, 85, 0, 15],
  ['wf-015', 'FIN-015', 'Finance and Accountancy', 185, 'general_fund', 54800, 'senior', 3.5, 100, 0, 0],
  ['wf-016', 'HR-016', 'People Services', 120, 'general_fund', 47200, 'njc', 4, 100, 0, 0],
  ['wf-017', 'LEGAL-017', 'Legal and Governance', 115, 'general_fund', 58500, 'senior', 3, 100, 0, 0],
  ['wf-018', 'PROP-018', 'Property and Facilities', 145, 'general_fund', 43800, 'njc', 5, 92, 0, 8],
  ['wf-019', 'PLAN-019', 'Planning and Place', 155, 'other', 51200, 'njc', 4, 58, 0, 42],
  ['wf-020', 'REG-020', 'Regeneration and Economy', 95, 'general_fund', 53600, 'senior', 3, 65, 25, 10],
  ['wf-021', 'COMM-021', 'Housing and Communities', 190, 'general_fund', 41600, 'njc', 5, 78, 16, 6],
  ['wf-022', 'TA-022', 'Temporary Accommodation Prevention', 65, 'grant', 39200, 'njc', 4, 20, 80, 0],
  ['wf-023', 'LIB-023', 'Libraries and Community Hubs', 210, 'general_fund', 30400, 'njc', 7, 100, 0, 0],
  ['wf-024', 'LEIS-024', 'Leisure and Culture Client Team', 55, 'general_fund', 44200, 'njc', 4, 92, 0, 8],
  ['wf-025', 'REV-025', 'Revenues and Benefits', 230, 'general_fund', 35800, 'njc', 5, 70, 25, 5],
  ['wf-026', 'PROC-026', 'Procurement and Contracts', 75, 'general_fund', 50800, 'senior', 3, 100, 0, 0],
  ['wf-027', 'AUD-027', 'Audit and Risk', 38, 'general_fund', 55200, 'senior', 2, 100, 0, 0],
  ['wf-028', 'COMMS-028', 'Communications and Engagement', 48, 'general_fund', 45600, 'njc', 4, 100, 0, 0],
  ['wf-029', 'CORP-029', 'Corporate Strategy and Performance', 62, 'general_fund', 52200, 'senior', 3, 100, 0, 0],
  ['wf-030', 'CLIMATE-030', 'Climate and Sustainability', 42, 'grant', 46200, 'njc', 4, 45, 55, 0],
  ['wf-031', 'TRADING-031', 'Traded Services', 95, 'other', 34000, 'njc', 5, 15, 0, 85],
  ['wf-032', 'APP-032', 'Apprentices and Entry Roles', 80, 'general_fund', 25500, 'default', 8, 80, 15, 5],
  ['wf-033', 'SENIOR-033', 'Corporate Leadership and Directors', 28, 'general_fund', 118000, 'senior', 1, 100, 0, 0],
  ['wf-034', 'PROJECT-034', 'Transformation Programme Team', 70, 'general_fund', 62000, 'senior', 3, 55, 35, 10],
  ['wf-035', 'MARKET-035', 'Care Market Sustainability Team', 45, 'grant', 50400, 'njc', 4, 25, 75, 0],
  ['wf-036', 'FAMILY-036', 'Family Hubs and Early Help', 130, 'grant', 39800, 'njc', 5, 40, 60, 0],
  ['wf-037', 'SEND-CASE-037', 'SEND Casework', 110, 'general_fund', 42600, 'njc', 7, 84, 16, 0],
  ['wf-038', 'BROKER-038', 'Care Brokerage', 75, 'general_fund', 37200, 'njc', 4, 100, 0, 0],
  ['wf-039', 'DEPOT-039', 'Depot and Operational Support', 120, 'general_fund', 33200, 'njc', 5, 94, 0, 6],
  ['wf-040', 'MEMBER-040', 'Democratic and Member Services', 38, 'general_fund', 42800, 'njc', 3, 100, 0, 0],
  ['wf-041', 'PAYROLL-041', 'Payroll and HR Operations', 52, 'general_fund', 38200, 'njc', 3, 100, 0, 0],
  ['wf-042', 'FLEET-042', 'Fleet and Transport Support', 70, 'general_fund', 35600, 'njc', 5, 88, 0, 12],
  ['wf-043', 'HOMELESS-043', 'Homelessness Prevention', 92, 'grant', 38600, 'njc', 6, 38, 62, 0],
  ['wf-044', 'ASSET-044', 'Asset Management', 64, 'general_fund', 51400, 'senior', 3, 100, 0, 0],
  ['wf-045', 'BENEFITS-045', 'Benefits Subsidy Administration', 115, 'grant', 34200, 'njc', 5, 45, 55, 0],
];

const contracts = [
  ['con-001', 'Waste Collection Contract', 'EnviroWaste Partnership', 'Waste Services', 'general_fund', 28000, 'cpi', 0, 1, 1, 4, 'cpi', 0, 0, 5.0, 0, 0],
  ['con-002', 'Waste Disposal and Treatment', 'Countywide Environmental Services', 'Waste Services', 'general_fund', 36000, 'rpi', 0, 1, 1, 4, 'rpi', 0, 0, 6.0, 0, 0],
  ['con-003', 'Highways Maintenance Framework', 'Highways Alliance', 'Highways and Transport', 'general_fund', 24500, 'cpi', 0, 1, 1, 6, 'cpi', 0, 0, 5.0, 0, 0],
  ['con-004', 'Home to School Transport Operators', 'Transport Framework Providers', 'Education Transport', 'general_fund', 25000, 'bespoke', 6.5, 1, 1, 9, 'custom', 0, 6.5, 8.0, 2.0, 0],
  ['con-005', 'Children Residential Placements', 'Regional Placement Framework', 'Children Social Care', 'general_fund', 42000, 'bespoke', 7.5, 1, 1, 4, 'custom', 0, 7.5, 10.0, 0, 0],
  ['con-006', 'Independent Fostering Agencies', 'IFA Framework', 'Children Social Care', 'general_fund', 18500, 'cpi', 0, 1, 1, 4, 'cpi', 0, 0, 6.0, 0, 0],
  ['con-007', 'Adult Residential and Nursing Care', 'Care Home Framework', 'Adult Social Care', 'general_fund', 58000, 'nmw', 0, 1, 1, 4, 'custom', 0, 6.0, 8.0, 2.0, 0],
  ['con-008', 'Domiciliary Care Framework', 'Home Care Providers', 'Adult Social Care', 'general_fund', 32000, 'nmw', 0, 1, 1, 4, 'custom', 0, 6.0, 8.0, 2.0, 0],
  ['con-009', 'Temporary Accommodation Supply', 'Housing Providers', 'Housing and Communities', 'grant', 14500, 'cpi', 0, 1, 1, 4, 'cpi', 0, 0, 5.0, 0, 0],
  ['con-010', 'Facilities Management', 'Civic FM Services', 'Property and Facilities', 'general_fund', 14500, 'rpi', 0, 2, 2, 7, 'rpi', 0, 0, 6.0, 0, 0],
  ['con-011', 'Corporate IT Managed Service', 'Digital Service Partner', 'Digital and Technology', 'general_fund', 12000, 'cpi', 0, 1, 1, 4, 'cpi', 0, 0, 5.0, 0, 0],
  ['con-012', 'Microsoft and Cloud Licensing', 'Cloud Licensing Partner', 'Digital and Technology', 'general_fund', 8500, 'bespoke', 9.0, 1, 1, 4, 'custom', 0, 9.0, 12.0, 0, 0],
  ['con-013', 'Energy Supply', 'Energy Framework', 'Corporate Landlord', 'general_fund', 9800, 'bespoke', 8.0, 1, 1, 10, 'custom', 0, 8.0, 15.0, 0, 0],
  ['con-014', 'Leisure Management Contract', 'Leisure Operator', 'Leisure and Culture', 'general_fund', 7600, 'cpi', 0, 1, 1, 4, 'cpi', 0, 0, 5.0, 0, 0],
  ['con-015', 'Public Health Services', 'Public Health Providers', 'Public Health', 'grant', 11800, 'cpi', 0, 1, 1, 4, 'cpi', 0, 0, 5.0, 0, 0],
  ['con-016', 'Revenues and Benefits System', 'Civica Revenues Platform', 'Revenues and Benefits', 'general_fund', 4200, 'fixed', 0, 1, 1, 4, 'fixed', 3.0, 0, 0, 0, 0],
  ['con-017', 'Insurance Programme', 'Municipal Insurers', 'Corporate Finance', 'general_fund', 6800, 'bespoke', 6.0, 1, 1, 4, 'custom', 0, 6.0, 10.0, 0, 0],
  ['con-018', 'Cleaning and Security', 'Civic Support Services', 'Property and Facilities', 'general_fund', 5100, 'nmw', 0, 1, 1, 4, 'custom', 0, 5.5, 8.0, 2.0, 0],
];

const grantSchedule = [
  ['grant-001', 'Revenue Support Grant and settlement funding', 74000, 'indicative', 5, false, false, 100],
  ['grant-002', 'Social Care Grant', 49000, 'indicative', 5, false, true, 100],
  ['grant-003', 'Improved Better Care Fund', 21000, 'confirmed', 5, true, true, 100],
  ['grant-004', 'Public Health Grant', 35000, 'indicative', 5, true, true, 100],
  ['grant-005', 'Housing Benefit Subsidy Grant', 82000, 'indicative', 5, true, false, 100],
  ['grant-006', 'Homelessness Prevention Grant', 7100, 'indicative', 3, true, false, 75],
  ['grant-007', 'Supporting Families Grant', 4300, 'indicative', 3, true, false, 70],
  ['grant-008', 'Dedicated Schools Grant management placeholder', 552000, 'indicative', 5, true, false, 100],
  ['grant-009', 'New Homes Bonus / Services Grant placeholder', 4800, 'assumed', 2, false, false, 50],
  ['grant-010', 'Local Authority Housing Fund grant', 3600, 'confirmed', 2, true, false, 0],
];

const customServiceLines = [
  ['custom-001', 'Adult Social Care provider fee uplift', 'demand-led', 16500, 'asc-demand', 0, 1.2, true, 'Additional care market fee and demographic uplift.'],
  ['custom-002', 'Children placement complexity premium', 'demand-led', 12800, 'csc-demand', 0, 1.5, true, 'Complex placement mix and sufficiency pressure.'],
  ['custom-003', 'SEND transport demand pressure', 'demand-led', 7200, 'manual', 4.5, 2.5, true, 'Demand and route cost pressure outside standard inflation.'],
  ['custom-004', 'Temporary accommodation demand pressure', 'demand-led', 6100, 'manual', 4.0, 2.0, true, 'Homelessness and nightly accommodation demand.'],
  ['custom-005', 'Corporate energy and utilities pressure', 'non-pay', 4800, 'manual', 5.0, 0, true, 'Energy reset and utilities volatility.'],
  ['custom-006', 'One-off budget recovery programme capacity', 'other', 2500, 'manual', 0, 0, false, 'One-off delivery capacity for savings and recovery programme.'],
];

const investToSave = [
  ['its-001', 'Care technology enabled support', 2200, 1500, 2.1, 1],
  ['its-002', 'Digital customer automation', 1800, 1150, 2.0, 2],
  ['its-003', 'Temporary accommodation prevention fund', 3000, 2100, 2.2, 2],
  ['its-004', 'Fleet telematics and route optimisation', 950, 650, 1.8, 1],
  ['its-005', 'Procurement analytics and contract controls', 700, 900, 1.2, 1],
];

const incomeLines = [
  ['inc-001', 'Planning applications and pre-application advice', 14500, 320, 1.5, 4.0],
  ['inc-002', 'Parking and enforcement income', 2200000, 1.75, 0.5, 5.0],
  ['inc-003', 'Garden waste subscriptions', 82000, 55, 1.0, 4.0],
  ['inc-004', 'Commercial waste and recycling customers', 6800, 840, 3.0, 3.5],
  ['inc-005', 'Adult social care client contributions', 18000, 2150, 1.0, 2.0],
  ['inc-006', 'Land charges and property searches', 21000, 72, 1.5, 3.0],
  ['inc-007', 'Leisure and culture income share', 420000, 6.8, 1.5, 3.0],
];

const baseline = {
  councilTax: 292000,
  businessRates: 63000,
  coreGrants: 251000,
  feesAndCharges: 126000,
  pay: 204000,
  nonPay: 97000,
  ascDemandLed: 160000,
  cscDemandLed: 106000,
  otherServiceExp: 165000,
  generalFundReserves: 40500,
  earmarkedReserves: 117600,
  reservesMinimumThreshold: 23000,
  customServiceLines: customServiceLines.map(([id, name, category, baseValue, inflationDriver, manualInflationRate, demandGrowthRate, isRecurring, notes]) => ({ id, name, category, baseValue, inflationDriver, manualInflationRate, demandGrowthRate, isRecurring, notes })),
  namedReserves: namedReserves.map(([id, name, purpose, category, openingBalance, isEarmarked, minimumBalance, plannedContributions, plannedDrawdowns]) => ({ id, name, purpose, category, openingBalance, isEarmarked, minimumBalance, plannedContributions, plannedDrawdowns })),
  councilTaxBaseConfig: {
    enabled: true,
    bandDEquivalentDwellings: 148000.4,
    bandDCharge: 1960.14,
    collectionRate: 98.5,
    parishPrecepts: 0,
    corePreceptPct: 2.95,
    ascPreceptPct: 2.0,
    collectionFundSurplusDeficit: 0,
  },
  businessRatesConfig: {
    enabled: true,
    baselineRates: 63000,
    growthRate: profile(1.2, 1.5, 1.8, 1.8, 2.0),
    appealsProvision: 4500,
    tariffTopUp: 6200,
    levySafetyNet: 0,
    poolingGain: 1200,
    collectionFundAdjustment: -1800,
    resetAdjustment: -3500,
    resetYear: 3,
  },
  grantSchedule: grantSchedule.map(([id, name, value, certainty, endYear, ringfenced, inflationLinked, replacementAssumption]) => ({ id, name, value, certainty, endYear, ringfenced, inflationLinked, replacementAssumption })),
  ascCohortModel: {
    enabled: true,
    population18to64: 258000,
    population65plus: 85500,
    prevalence18to64: 2.0,
    prevalence65plus: 15.8,
    unitCost18to64: 18500,
    unitCost65plus: 9800,
    growth18to64: 2.3,
    growth65plus: 3.6,
  },
  capitalFinancing: {
    enabled: true,
    borrowingByYear: tuple(41000, 36000, 32000, 28500, 25500),
    interestRate: 4.7,
    mrpRate: 2.0,
  },
  riskBasedReserves: {
    enabled: true,
    adoptAsMinimumThreshold: true,
    demandVolatility: 10500,
    savingsNonDelivery: 6900,
    fundingUncertainty: 5200,
    litigationRisk: 2400,
  },
  reservesRecoveryPlan: {
    enabled: true,
    targetYear: 5,
    targetLevel: 52000,
    annualContribution: 0,
    autoCalculate: true,
  },
  paySpineConfig: { enabled: false, rows: [] },
  workforceModel: {
    enabled: true,
    mode: 'workforce_posts',
    posts: workforcePosts.map(([id, postId, service, fte, fundingSource, annualCost, payAssumptionGroup, vacancyFactor, generalFundSplit, grantFundSplit, otherSplit]) => ({ id, postId, service, fte, fundingSource, annualCost, payAssumptionGroup, vacancyFactor, generalFundSplit, grantFundSplit, otherSplit })),
  },
  contractIndexationTracker: {
    enabled: true,
    indexAssumptions: {
      cpi: profile(3.0, 2.6, 2.3, 2.2, 2.0),
      rpi: profile(4.0, 3.5, 3.0, 2.8, 2.6),
      nmw: profile(6.0, 5.0, 4.5, 4.0, 4.0),
      fixed: profile(3.0, 3.0, 3.0, 3.0, 3.0),
      bespoke: profile(5.0, 4.0, 3.5, 3.0, 3.0),
    },
    contracts: contracts.map(([id, name, supplier, service, fundingSource, value, clause, bespokeRate, effectiveFromYear, nextUpliftYear, reviewMonth, upliftMethod, fixedRate, customRate, capRate, collarRate, phaseInMonths]) => ({ id, name, supplier, service, fundingSource, value, clause, bespokeRate, effectiveFromYear, nextUpliftYear, reviewMonth, upliftMethod, fixedRate, customRate, capRate, collarRate, phaseInMonths })),
  },
  investToSave: {
    enabled: true,
    proposals: investToSave.map(([id, name, upfrontCost, annualSaving, paybackYears, deliveryYear]) => ({ id, name, upfrontCost, annualSaving, paybackYears, deliveryYear })),
  },
  incomeGenerationWorkbook: {
    enabled: true,
    lines: incomeLines.map(([id, name, baseVolume, basePrice, volumeGrowth, priceGrowth]) => ({ id, name, baseVolume, basePrice, volumeGrowth, priceGrowth })),
  },
  growthProposals: [
    { id: 'growth-001', name: 'Adult Social Care demographic growth', service: 'Adult Social Care', owner: 'Executive Director Adults', value: 8200, deliveryYear: 1, isRecurring: true, confidence: 85, yearlyPhasing: tuple(100, 100, 100, 100, 100), notes: 'Publicly anchored demand pressure theme; modelled detail for demo.', status: 'Finance Reviewed', evidenceNote: 'Aligned to WNC budget narrative on adult social care demand.' },
    { id: 'growth-002', name: 'Children complex placements growth', service: 'Children Social Care', owner: 'Executive Director Children', value: 7300, deliveryYear: 1, isRecurring: true, confidence: 80, yearlyPhasing: tuple(100, 100, 100, 100, 100), notes: 'Complex needs and placement cost pressure.', status: 'Finance Reviewed', evidenceNote: 'Aligned to WNC budget narrative on children services demand.' },
    { id: 'growth-003', name: 'Home to school transport demand', service: 'Education Transport', owner: 'Director Education', value: 4100, deliveryYear: 1, isRecurring: true, confidence: 78, yearlyPhasing: tuple(100, 100, 100, 100, 100), notes: 'SEND and transport growth pressure.', status: 'Service Reviewed', evidenceNote: 'Demo assumption scaled to public budget themes.' },
  ],
  manualAdjustments: [
    { id: 'manual-001', service: 'Corporate Contingency', year: 1, amount: -3500, reason: 'Use of corporate contingency to bridge first-year timing.' },
    { id: 'manual-002', service: 'Transformation Programme', year: 2, amount: 1500, reason: 'Additional one-off implementation capacity.' },
    { id: 'manual-003', service: 'Collection Fund', year: 3, amount: 1800, reason: 'Collection fund timing and taxbase uncertainty.' },
  ],
  importMappingProfiles: [
    { id: 'map-001', name: 'WNC demo ledger overlay', mappings: { 'Council Tax': 'baseline.councilTax', 'Business Rates': 'baseline.businessRates', Grants: 'baseline.coreGrants', Pay: 'baseline.pay' }, createdAt },
  ],
  overlayImports: [
    { id: 'overlay-001', sourceName: 'Demo public budget source values', importedAt: createdAt, mappedValues: { councilTax: 292000, businessRates: 63000, grants: 251000, serviceIncome: 126000 }, unmappedFields: ['Dedicated Schools Grant shown as source context only'] },
  ],
  reservesAdequacyMethodology: {
    method: 'risk_based',
    fixedMinimum: 23000,
    pctOfNetBudget: 5,
  },
  treasuryIndicators: {
    enabled: true,
    authorisedLimit: 320000,
    operationalBoundary: 285000,
    netFinancingNeed: 247000,
  },
  mrpCalculator: {
    enabled: true,
    policy: 'asset-life',
    baseBorrowing: 247000,
    assetLifeYears: 40,
    annuityRate: 3.5,
  },
};

const scenarioRows = [
  ['scenario-current', 'Current Plan', 'Publicly anchored WNC-scale base plan with approved savings and balanced-budget assumptions.', 'base', '#2563eb', createdAt, 4.95, 1.2, 1.0, 2.0, 3.5, 3.2, 5.4, 5.1, 82, 3.5, 3.0, 2.5, 0, 0.4, 0.2, -0.3, 0, 29000, 0, true, false, 2.5, 0, 50],
  ['scenario-do-nothing', 'Do Nothing', 'Shows the trajectory if savings delivery weakens and demand/cost pressures continue.', 'pessimistic', '#dc2626', createdAt, 4.95, 0.8, -2.0, 1.0, 4.5, 4.2, 6.2, 6.0, 55, 4.5, 4.0, 3.5, 0.2, 0.8, 0.5, 0, 0.2, 0, 5000, true, false, 2.5, 0, 85],
  ['scenario-recommended', 'Recommended Plan', 'Balanced management option: protect reserves, improve delivery confidence and hold demand pressures.', 'optimistic', '#16a34a', createdAt, 4.95, 1.8, 0.5, 2.5, 3.1, 2.5, 4.6, 4.3, 90, 3.1, 2.8, 2.3, -0.1, 0.2, 0, -0.4, 0, 32000, 0, true, false, 2.5, 0, 35],
  ['scenario-funding-shock', 'Funding Shock', 'Stress case for grant reduction, business rates reset and savings slippage.', 'pessimistic', '#f97316', createdAt, 4.95, -0.5, -5.0, 1.5, 3.8, 3.4, 5.7, 5.4, 68, 3.8, 3.4, 2.8, 0, 0.5, 0.3, -0.2, 0.1, 18000, 3000, true, false, 2.5, 0, 75],
];

const snapshot = {
  id: 'wnc-a31-demo-2026-27',
  name: 'West Northamptonshire Council A31 Demo Snapshot',
  description: 'Importable CFO / Head of Finance demo snapshot calibrated to public West Northamptonshire Council 2026/27 budget scale. Detailed rows are demo modelling assumptions, not official ledger records.',
  createdAt,
  assumptions,
  baseline,
  savingsProposals: savingsProposals.map(([id, name, description, category, grossValue, deliveryYear, achievementRate, isRecurring, ragStatus, responsibleOfficer, yearlyDelivery]) => ({ id, name, description, category, grossValue, deliveryYear, achievementRate, isRecurring, ragStatus, responsibleOfficer, yearlyDelivery })),
  authorityConfig,
  scenarios: [],
  metadata: {
    appVersion: 'v7.0',
    schemaVersion: 'mtfs-snapshot-xlsx-v2',
    notes: 'High-level values are anchored to published WNC 2026/27 budget pages: £1.02bn net revenue budget (£464.3m excluding DSG), £292m council tax, £63m business rates, £251m grants, £126m service income, 430,000 residents, £29m 2026/27 efficiencies and £146m savings since 2021. Workforce, contracts, reserves and proposal rows are synthetic demo assumptions scaled to those public anchors.',
  },
};

const sourceNotes = [
  ['Source / modelling note'],
  ['This workbook is for product demonstration and finance workflow rehearsal. It is not an official West Northamptonshire Council ledger, budget book, statutory return, or committee paper.'],
  ['High-level public anchors used'],
  ['WNC 2026/27 budget page: 430,000 residents, more than £1.3bn annual spend, £146m savings and income generation since 2021, around £64m cost rise.'],
  ['WNC How we are funded page: Council Tax £292m; ringfenced grants £146m; service income £126m; unringfenced grants £105m; Business Rates £63m; DSG context £552m.'],
  ['WNC balanced budget news: final net revenue budget £1.02bn, £464.3m excluding Dedicated Schools Grant, 4.95% council tax increase, £29m efficiencies.'],
  ['WNC What we spend our budget on page: service mix used to scale demand and contract examples.'],
  ['Granular rows'],
  ['Workforce posts, contract rows, named reserves, savings proposals, income lines and invest-to-save schemes are synthetic but intentionally WNC-scale and local-authority realistic.'],
  ['Import path'],
  ['In app: Scenarios -> Model Snapshots (A31) -> Import JSON/XLSX.'],
];

function rowsFromObjectMap(header, rows) {
  return [header, ...rows];
}

const workbookRows = {
  Meta: [
    ['key', 'value'],
    ['format', 'mtfs-snapshot-xlsx-v2'],
    ['snapshot_id', snapshot.id],
    ['snapshot_name', snapshot.name],
    ['description', snapshot.description],
    ['created_at', snapshot.createdAt],
    ['app_version', snapshot.metadata.appVersion],
    ['notes', snapshot.metadata.notes],
  ],
  AuthorityConfig: [
    ['field', 'value'],
    ...Object.entries(authorityConfig),
  ],
  Assumptions: [
    ['section', 'field', 'y1', 'y2', 'y3', 'y4', 'y5', 'unit'],
    ['funding', 'councilTaxIncrease', 4.95, 4.99, 4.99, 3.99, 3.99, '%'],
    ['funding', 'businessRatesGrowth', 1.2, 1.5, 1.8, 1.8, 2.0, '%'],
    ['funding', 'grantVariation', 1.0, -1.5, -2.0, -1.0, 0.0, '%'],
    ['funding', 'feesChargesElasticity', 2.0, 2.5, 2.5, 2.0, 2.0, '%'],
    ['expenditure', 'payAward', 3.5, 3.0, 2.75, 2.5, 2.5, '%'],
    ['expenditure', 'nonPayInflation', 3.2, 2.8, 2.5, 2.3, 2.2, '%'],
    ['expenditure', 'ascDemandGrowth', 5.4, 5.0, 4.7, 4.4, 4.2, '%'],
    ['expenditure', 'cscDemandGrowth', 5.1, 4.8, 4.5, 4.2, 4.0, '%'],
    ['expenditure', 'savingsDeliveryRisk', 82, 84, 86, 88, 90, '%'],
    ['expenditure', 'payAwardByFundingSource.general_fund', assumptions.expenditure.payAwardByFundingSource.general_fund, '', '', '', '', '%'],
    ['expenditure', 'payAwardByFundingSource.grant', assumptions.expenditure.payAwardByFundingSource.grant, '', '', '', '', '%'],
    ['expenditure', 'payAwardByFundingSource.other', assumptions.expenditure.payAwardByFundingSource.other, '', '', '', '', '%'],
    ['expenditure', 'payGroupSensitivity.default', assumptions.expenditure.payGroupSensitivity.default, '', '', '', '', 'pp'],
    ['expenditure', 'payGroupSensitivity.teachers', assumptions.expenditure.payGroupSensitivity.teachers, '', '', '', '', 'pp'],
    ['expenditure', 'payGroupSensitivity.njc', assumptions.expenditure.payGroupSensitivity.njc, '', '', '', '', 'pp'],
    ['expenditure', 'payGroupSensitivity.senior', assumptions.expenditure.payGroupSensitivity.senior, '', '', '', '', 'pp'],
    ['expenditure', 'payGroupSensitivity.other', assumptions.expenditure.payGroupSensitivity.other, '', '', '', '', 'pp'],
    ['policy', 'annualSavingsTarget', 29000, 18500, 13500, 9000, 7500, '£000'],
    ['policy', 'reservesUsage', 0, 0, 0, 0, 0, '£000'],
    ['policy', 'socialCareProtection', 'true', '', '', '', '', 'boolean'],
    ['advanced', 'realTermsToggle', 'false', '', '', '', '', 'boolean'],
    ['advanced', 'inflationRate', 2.5, '', '', '', '', '%'],
  ],
  BaselineCore: [
    ['field', 'value', 'unit'],
    ['councilTax', baseline.councilTax, '£000'],
    ['businessRates', baseline.businessRates, '£000'],
    ['coreGrants', baseline.coreGrants, '£000'],
    ['feesAndCharges', baseline.feesAndCharges, '£000'],
    ['pay', baseline.pay, '£000'],
    ['nonPay', baseline.nonPay, '£000'],
    ['ascDemandLed', baseline.ascDemandLed, '£000'],
    ['cscDemandLed', baseline.cscDemandLed, '£000'],
    ['otherServiceExp', baseline.otherServiceExp, '£000'],
    ['generalFundReserves', baseline.generalFundReserves, '£000'],
    ['earmarkedReserves', baseline.earmarkedReserves, '£000'],
    ['reservesMinimumThreshold', baseline.reservesMinimumThreshold, '£000'],
  ],
  BaselineSettings: [
    ['path', 'value', 'unit_or_note'],
    ['councilTaxBaseConfig.enabled', 'true', 'boolean'],
    ['councilTaxBaseConfig.bandDEquivalentDwellings', 148000.4, 'count'],
    ['councilTaxBaseConfig.bandDCharge', 1960.14, '£'],
    ['councilTaxBaseConfig.collectionRate', 98.5, '%'],
    ['councilTaxBaseConfig.parishPrecepts', 0, '£000'],
    ['councilTaxBaseConfig.corePreceptPct', 2.95, '%'],
    ['councilTaxBaseConfig.ascPreceptPct', 2.0, '%'],
    ['councilTaxBaseConfig.collectionFundSurplusDeficit', 0, '£000'],
    ['businessRatesConfig.enabled', 'true', 'boolean'],
    ['businessRatesConfig.baselineRates', 63000, '£000'],
    ['businessRatesConfig.growthRate.y1', 1.2, '%'],
    ['businessRatesConfig.growthRate.y2', 1.5, '%'],
    ['businessRatesConfig.growthRate.y3', 1.8, '%'],
    ['businessRatesConfig.growthRate.y4', 1.8, '%'],
    ['businessRatesConfig.growthRate.y5', 2.0, '%'],
    ['businessRatesConfig.appealsProvision', 4500, '£000'],
    ['businessRatesConfig.tariffTopUp', 6200, '£000'],
    ['businessRatesConfig.levySafetyNet', 0, '£000'],
    ['businessRatesConfig.poolingGain', 1200, '£000'],
    ['businessRatesConfig.collectionFundAdjustment', -1800, '£000'],
    ['businessRatesConfig.resetAdjustment', -3500, '£000'],
    ['businessRatesConfig.resetYear', 3, 'year 1-5'],
    ['ascCohortModel.enabled', 'true', 'boolean'],
    ['ascCohortModel.population18to64', 258000, 'count'],
    ['ascCohortModel.population65plus', 85500, 'count'],
    ['ascCohortModel.prevalence18to64', 2.0, '%'],
    ['ascCohortModel.prevalence65plus', 15.8, '%'],
    ['ascCohortModel.unitCost18to64', 18500, '£'],
    ['ascCohortModel.unitCost65plus', 9800, '£'],
    ['ascCohortModel.growth18to64', 2.3, '%'],
    ['ascCohortModel.growth65plus', 3.6, '%'],
    ['capitalFinancing.enabled', 'true', 'boolean'],
    ['capitalFinancing.interestRate', 4.7, '%'],
    ['capitalFinancing.mrpRate', 2.0, '%'],
    ['capitalFinancing.borrowingByYear.1', 41000, '£000'],
    ['capitalFinancing.borrowingByYear.2', 36000, '£000'],
    ['capitalFinancing.borrowingByYear.3', 32000, '£000'],
    ['capitalFinancing.borrowingByYear.4', 28500, '£000'],
    ['capitalFinancing.borrowingByYear.5', 25500, '£000'],
    ['riskBasedReserves.enabled', 'true', 'boolean'],
    ['riskBasedReserves.adoptAsMinimumThreshold', 'true', 'boolean'],
    ['riskBasedReserves.demandVolatility', 10500, '£000'],
    ['riskBasedReserves.savingsNonDelivery', 6900, '£000'],
    ['riskBasedReserves.fundingUncertainty', 5200, '£000'],
    ['riskBasedReserves.litigationRisk', 2400, '£000'],
    ['reservesRecoveryPlan.enabled', 'true', 'boolean'],
    ['reservesRecoveryPlan.targetYear', 5, 'year 1-5'],
    ['reservesRecoveryPlan.targetLevel', 52000, '£000'],
    ['reservesRecoveryPlan.annualContribution', 0, '£000'],
    ['reservesRecoveryPlan.autoCalculate', 'true', 'boolean'],
    ['reservesAdequacyMethodology.method', 'risk_based', 'fixed|pct_of_net_budget|risk_based'],
    ['reservesAdequacyMethodology.fixedMinimum', 23000, '£000'],
    ['reservesAdequacyMethodology.pctOfNetBudget', 5, '%'],
    ['treasuryIndicators.enabled', 'true', 'boolean'],
    ['treasuryIndicators.authorisedLimit', 320000, '£000'],
    ['treasuryIndicators.operationalBoundary', 285000, '£000'],
    ['treasuryIndicators.netFinancingNeed', 247000, '£000'],
    ['mrpCalculator.enabled', 'true', 'boolean'],
    ['mrpCalculator.policy', 'asset-life', 'asset-life|annuity|straight-line'],
    ['mrpCalculator.baseBorrowing', 247000, '£000'],
    ['mrpCalculator.assetLifeYears', 40, 'years'],
    ['mrpCalculator.annuityRate', 3.5, '%'],
    ['workforceModel.enabled', 'true', 'boolean'],
    ['contractIndexationTracker.enabled', 'true', 'boolean'],
    ...['cpi', 'rpi', 'nmw', 'fixed', 'bespoke'].flatMap((index) =>
      [1, 2, 3, 4, 5].map((year) => [`contractIndexationTracker.indexAssumptions.${index}.y${year}`, baseline.contractIndexationTracker.indexAssumptions[index][`y${year}`], '%'])
    ),
    ['investToSave.enabled', 'true', 'boolean'],
    ['incomeGenerationWorkbook.enabled', 'true', 'boolean'],
  ],
  SavingsProposals: rowsFromObjectMap(
    ['id', 'name', 'description', 'category', 'grossValue', 'deliveryYear', 'achievementRate', 'isRecurring', 'ragStatus', 'responsibleOfficer', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5'],
    savingsProposals.map(([id, name, description, category, grossValue, deliveryYear, achievementRate, isRecurring, ragStatus, responsibleOfficer, yearlyDelivery]) => [id, name, description, category, grossValue, deliveryYear, achievementRate, String(isRecurring), ragStatus, responsibleOfficer, ...yearlyDelivery])
  ),
  NamedReserves: rowsFromObjectMap(
    ['id', 'name', 'purpose', 'category', 'openingBalance', 'isEarmarked', 'minimumBalance', 'contribY1', 'contribY2', 'contribY3', 'contribY4', 'contribY5', 'drawY1', 'drawY2', 'drawY3', 'drawY4', 'drawY5'],
    namedReserves.map(([id, name, purpose, category, openingBalance, isEarmarked, minimumBalance, contributions, drawdowns]) => [id, name, purpose, category, openingBalance, String(isEarmarked), minimumBalance, ...contributions, ...drawdowns])
  ),
  CustomServiceLines: rowsFromObjectMap(
    ['id', 'name', 'category', 'baseValue', 'inflationDriver', 'manualInflationRate', 'demandGrowthRate', 'isRecurring', 'notes'],
    customServiceLines
  ),
  GrantSchedule: rowsFromObjectMap(
    ['id', 'name', 'value', 'certainty', 'endYear', 'ringfenced', 'inflationLinked', 'replacementAssumption'],
    grantSchedule.map((row) => row.map((cell) => typeof cell === 'boolean' ? String(cell) : cell))
  ),
  WorkforcePosts: rowsFromObjectMap(
    ['id', 'postId', 'service', 'fte', 'fundingSource', 'annualCost', 'payAssumptionGroup', 'vacancyFactor', 'generalFundSplit', 'grantFundSplit', 'otherSplit'],
    workforcePosts
  ),
  Contracts: rowsFromObjectMap(
    ['id', 'name', 'supplier', 'service', 'fundingSource', 'value', 'clause', 'bespokeRate', 'effectiveFromYear', 'nextUpliftYear', 'reviewMonth', 'upliftMethod', 'fixedRate', 'customRate', 'capRate', 'collarRate', 'phaseInMonths'],
    contracts
  ),
  InvestToSave: rowsFromObjectMap(
    ['id', 'name', 'upfrontCost', 'annualSaving', 'paybackYears', 'deliveryYear'],
    investToSave
  ),
  IncomeLines: rowsFromObjectMap(
    ['id', 'name', 'baseVolume', 'basePrice', 'volumeGrowth', 'priceGrowth'],
    incomeLines
  ),
  Scenarios: rowsFromObjectMap(
    ['id', 'name', 'description', 'type', 'color', 'createdAt', 'councilTaxIncrease', 'businessRatesGrowth', 'grantVariation', 'feesChargesElasticity', 'payAward', 'nonPayInflation', 'ascDemandGrowth', 'cscDemandGrowth', 'savingsDeliveryRisk', 'payAwardByFundingSourceGeneralFund', 'payAwardByFundingSourceGrant', 'payAwardByFundingSourceOther', 'payGroupSensitivityDefault', 'payGroupSensitivityTeachers', 'payGroupSensitivityNJC', 'payGroupSensitivitySenior', 'payGroupSensitivityOther', 'annualSavingsTarget', 'reservesUsage', 'socialCareProtection', 'realTermsToggle', 'inflationRate', 'resultTotalGap', 'resultRiskScore'],
    scenarioRows
  ),
  SnapshotJSON: [
    ['json'],
    [JSON.stringify({
      id: snapshot.id,
      name: snapshot.name,
      note: 'This demo workbook is intentionally too detailed for a single-cell JSON fallback. The app imports the editable A31 sheets first; use those sheets as the authoritative snapshot source.',
    })],
  ],
  Readme: sourceNotes,
};

function configureSheet(sheet, rows) {
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  sheet['!cols'] = Array.from({ length: columnCount }, (_, column) => {
    const longest = rows.reduce((max, row) => Math.max(max, String(row[column] ?? '').length), 12);
    return { wch: Math.max(12, Math.min(48, longest + 2)) };
  });
  if (rows.length > 1 && rows[0]?.length) {
    const endColumn = xlsx.utils.encode_col(rows[0].length - 1);
    sheet['!autofilter'] = { ref: `A1:${endColumn}1` };
    sheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };
  }
  return sheet;
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const workbook = xlsx.utils.book_new();
for (const [name, rows] of Object.entries(workbookRows)) {
  const sheet = configureSheet(xlsx.utils.aoa_to_sheet(rows), rows);
  xlsx.utils.book_append_sheet(workbook, sheet, name);
}
xlsx.writeFile(workbook, outputPath);

const validationWorkbook = xlsx.readFile(outputPath);
const requiredSheets = Object.keys(workbookRows);
const missingSheets = requiredSheets.filter((sheet) => !validationWorkbook.SheetNames.includes(sheet));
if (missingSheets.length > 0) {
  throw new Error(`Generated workbook is missing required sheets: ${missingSheets.join(', ')}`);
}

const rowCount = (sheetName) => xlsx.utils.sheet_to_json(validationWorkbook.Sheets[sheetName], { defval: '' }).length;
const checks = [
  ['SavingsProposals', 25],
  ['NamedReserves', 12],
  ['WorkforcePosts', 40],
  ['Contracts', 15],
  ['GrantSchedule', 8],
  ['Scenarios', 4],
];
for (const [sheetName, minimumRows] of checks) {
  const rows = rowCount(sheetName);
  if (rows < minimumRows) {
    throw new Error(`${sheetName} has ${rows} rows, expected at least ${minimumRows}`);
  }
}

console.log(`Created ${path.relative(repoRoot, outputPath)}`);
console.log(`Sheets: ${validationWorkbook.SheetNames.join(', ')}`);
console.log(`Rows: ${checks.map(([sheetName]) => `${sheetName}=${rowCount(sheetName)}`).join(', ')}`);
