import type { TemplateSheet } from './payTemplate';

const CONTRACT_TEMPLATE_HEADERS = [
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
];

export function buildContractTemplateSheets(): TemplateSheet[] {
  return [
    { name: 'Template_Blank', rows: [CONTRACT_TEMPLATE_HEADERS, Array(CONTRACT_TEMPLATE_HEADERS.length).fill('')] },
    {
      name: 'Example_Dummy_Data',
      rows: [
        CONTRACT_TEMPLATE_HEADERS,
        ['Waste Collection Contract', 'EnviroWaste Ltd', 'Waste and Recycling', 2800, 'cpi', 0, 1, 4, 'cpi', 0, 0, 0],
        ['Facilities Management', 'Civic FM Services', 'Corporate Landlord', 1450, 'rpi', 0, 2, 7, 'rpi', 0, 0, 3],
        ['Specialist Placement Framework', 'Care Placements Framework', 'Children Services', 950, 'bespoke', 4.25, 1, 10, 'custom', 0, 4.25, 6],
      ],
    },
    {
      name: 'Instructions',
      rows: [
        ['Contract Indexation Tracker Template - Instructions'],
        ['1) Complete Template_Blank with one row per contract.'],
        ['2) supplier is the provider or framework name; service is the council service area responsible for the contract.'],
        ['3) clause must be one of: cpi, rpi, nmw, bespoke.'],
        ['4) upliftMethod must be one of: cpi, rpi, fixed, custom.'],
        ['5) effectiveFromYear is 1-5 and reviewMonth is 1-12.'],
        ['6) phaseInMonths is 0-12 to phase indexation in year of effect.'],
        ['7) bespokeRate/customRate used for bespoke/custom methods.'],
        ['8) value is annual contract value in £000.'],
        ['9) Save and import via Import CSV/XLSX.'],
        ['Note: import appends rows to existing entries.'],
      ],
    },
  ];
}
