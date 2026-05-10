export type TemplateSheet = { name: string; rows: (string | number)[][] };

export function fmtK(v: number) {
  const rounded = Math.round(v);
  const sign = rounded < 0 ? '-' : '';
  return `${sign}£${Math.abs(rounded).toLocaleString('en-GB')}k`;
}

const WORKFORCE_TEMPLATE_HEADERS = [
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
];

export function buildPayTemplateSheets(): TemplateSheet[] {
  return [
    { name: 'Template_Blank', rows: [WORKFORCE_TEMPLATE_HEADERS, Array(WORKFORCE_TEMPLATE_HEADERS.length).fill('')] },
    {
      name: 'Example_Workforce_Posts',
      rows: [
        WORKFORCE_TEMPLATE_HEADERS,
        ['ASC-SW-001', 'Adults Services', 1, 'general_fund', 46800, 'njc', 3, 100, 0, 0],
        ['CSC-EH-014', 'Children Services', 0.8, 'grant', 39200, 'njc', 0, 20, 80, 0],
        ['CORP-FIN-006', 'Corporate Finance', 1, 'general_fund', 58500, 'senior', 0, 70, 0, 30],
        ['REG-PM-021', 'Regeneration', 0.6, 'other', 51000, 'other', 5, 0, 25, 75],
      ],
    },
    {
      name: 'Instructions',
      rows: [
        ['Workforce Posts Template - Instructions'],
        ['1) Use Template_Blank for workforce post imports.'],
        ['2) Keep headers unchanged. These headers populate Workforce Posts when imported through Workforce Funding Model.'],
        ['3) fundingSource must be: general_fund | grant | other.'],
        ['4) payAssumptionGroup must be: default | teachers | njc | senior | other.'],
        ['5) generalFundSplit + grantFundSplit + otherSplit should total 100 for each row.'],
        ['6) annualCost is full-time annual cost in pounds; vacancyFactor and split fields are percentages.'],
        ['7) Old grade-level files with grade, fte, spinePointCost are still accepted and converted into workforce posts.'],
        ['8) Save as .xlsx/.xls or export as .csv, then use Import CSV/XLSX in Workforce Funding Model.'],
        ['Note: import appends rows to existing entries.'],
      ],
    },
  ];
}
