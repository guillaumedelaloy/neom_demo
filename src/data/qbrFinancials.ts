/**
 * QBR Q2 2026 — Financial data extraction.
 *
 * Every number in this file is taken directly from the NEOM Quarterly
 * Business Review, Consolidated document – Q2 (12 June 2026).
 * No values are inferred, estimated, or renamed.
 */

/* ── helpers ── */

export type Kpi = {
  label: string
  actual: string
  budget: string
  variance: string
  unit: string
}

export type WaterfallItem = {
  label: string
  value: string
  detail?: string[]
}

export type PriceRow = {
  item: string
  forecast: string
  budget: string
  variance: string
  unit: string
}

export type BuKpi = {
  label: string
  q1Actual: string
  q1Budget: string
  q1Var: string
  fyForecast: string
  fyBudget: string
  fyVar: string
  unit: string
}

/* ── SECTION 1 — Group Financial Performance (Q1) ── */

export const groupQ1: Kpi[] = [
  { label: 'Revenue', actual: '8,585', budget: '9,041', variance: '-5%', unit: '$M' },
  { label: 'EBITDA', actual: '3,204', budget: '3,482', variance: '-8%', unit: '$M' },
  { label: 'Net profit / (loss)', actual: '1,377', budget: '1,619', variance: '-15%', unit: '$M' },
  { label: 'Cash balance', actual: '10,047', budget: '11,672', variance: '-14%', unit: '$M' },
]

export const groupFY: Kpi[] = [
  { label: 'Revenue', actual: '44,490', budget: '39,382', variance: '+13%', unit: '$M' },
  { label: 'EBITDA', actual: '15,922', budget: '15,051', variance: '+6%', unit: '$M' },
  { label: 'Net profit / (loss)', actual: '7,666', budget: '6,877', variance: '+11%', unit: '$M' },
  { label: 'Cash balance', actual: '12,506', budget: '10,415', variance: '+20%', unit: '$M' },
]

/* ── SECTION 2 — Q1 EBITDA Bridge ── */

export type WaterfallBarKind = 'total' | 'delta' | 'subtotal' | 'reference'

export type WaterfallBar = {
  label: string
  lines: string[]
  value: number
  kind: WaterfallBarKind
  detail?: string[]
}

export const q1EbitdaWaterfall: WaterfallBar[] = [
  { label: 'Q1 26B', lines: ['Q1 26B'], value: 3482, kind: 'total' },
  { label: 'Volume effect', lines: ['Volume', 'effect'], value: -1596, kind: 'delta', detail: ['Urban Development & Smart Communities -1,094', 'Special Economic Zone & Investment Platform -268', 'Luxury Tourism & Hospitality -234'] },
  { label: 'Operating costs', lines: ['Operating', 'costs'], value: 1249, kind: 'delta', detail: ['Op. cost +1,034', 'SG&A +182', 'Dev. & TS +33'] },
  { label: 'Others', lines: ['Others'], value: 375, kind: 'delta', detail: ['Insurance claim +375'] },
  { label: 'Controlled EBITDA', lines: ['Controlled', 'EBITDA'], value: 3510, kind: 'subtotal' },
  { label: 'Price effect', lines: ['Price', 'effect'], value: 973, kind: 'delta', detail: ['Urban Development & Smart Communities +255', 'Special Economic Zone & Investment Platform +383', 'Luxury Tourism & Hospitality +334'] },
  { label: 'Input cost effect', lines: ['Input cost', 'effect'], value: -1025, kind: 'delta', detail: ['Construction materials -1,053', 'Power +24', 'Water -12', 'Fuel -2', 'Steel +17'] },
  { label: 'Share in JV profit', lines: ['Share in', 'JV profit'], value: -253, kind: 'delta', detail: ['ENOWA +72', 'Tonomus +8', 'OXAGON -340', 'Topian +4', 'Magna +3'] },
  { label: 'Q1 26F', lines: ['Q1 26F'], value: 3204, kind: 'total' },
  { label: 'Q1 25A', lines: ['Q1 25A'], value: 3469, kind: 'reference' },
]

export const q1EbitdaBridge: WaterfallItem[] = [
  { label: 'Q1 26 Budget', value: '3,482' },
  {
    label: 'Volume effect',
    value: '-1,596',
    detail: ['Urban Development & Smart Communities -1,094', 'Special Economic Zone & Investment Platform -268', 'Luxury Tourism & Hospitality -234'],
  },
  {
    label: 'Operating costs',
    value: '+1,249',
    detail: ['Op. cost +1,034', 'SG&A +182', 'Dev. & TS +33'],
  },
  {
    label: 'Others',
    value: '+375',
    detail: ['Insurance claim +375'],
  },
  {
    label: 'Price effect',
    value: '+973',
    detail: ['Urban Development & Smart Communities +255', 'Special Economic Zone & Investment Platform +383', 'Luxury Tourism & Hospitality +334'],
  },
  {
    label: 'Input cost effect',
    value: '-1,025',
    detail: ['Construction materials -1,053', 'Power +24', 'Water -12', 'Fuel -2', 'Steel +17'],
  },
  {
    label: 'Share in JV profit',
    value: '-253',
    detail: ['ENOWA +72', 'Tonomus +8', 'OXAGON -340', 'Topian +4', 'Magna +3'],
  },
  { label: 'Q1 26 Forecast', value: '3,204' },
]

/* ── SECTION 3 — Full Year Outlook ── */

export const fyOutlook = {
  ebitda: { forecast: '15,922', budget: '15,051', variance: '+6%', unit: '$M' },
  totalCapex: { forecast: '14,910', budget: '16,649', variance: '-10%', unit: '$M' },
  cashGeneration: { forecast: '1,697', budget: '-394', variance: '+$2,091M', unit: '$M' },
  buContribution: [
    { bu: 'Urban Development & Smart Communities', impact: '-$1,743M' },
    { bu: 'Special Economic Zone & Investment Platform', impact: '+$1,294M' },
    { bu: 'Luxury Tourism & Hospitality', impact: '+$1,581M' },
  ] as const,
} as const

/* ── SECTION 4 — Price vs Cost Dynamics (Full Year) ── */

export const sellingPrices: PriceRow[] = [
  { item: 'Hotel ADR', forecast: '712', budget: '632', variance: '+13%', unit: 'SAR/night' },
  { item: 'Residential rent', forecast: '393', budget: '296', variance: '+33%', unit: 'SAR/m²/yr' },
  { item: 'Office lease rate', forecast: '330', budget: '364', variance: '-9%', unit: 'SAR/m²/yr' },
  { item: 'Visitor spend', forecast: '3,390', budget: '2,831', variance: '+20%', unit: 'SAR/visit' },
  { item: 'Industrial land lease', forecast: '4,508', budget: '3,843', variance: '+17%', unit: 'SAR/m²' },
  { item: 'Premium resort ADR', forecast: '4,569', budget: '3,800', variance: '+20%', unit: 'SAR/night' },
  { item: 'Green hydrogen price', forecast: '3.9', budget: '3.8', variance: '+3%', unit: 'USD/kg' },
]

export const rawMaterialPrices: PriceRow[] = [
  { item: 'Cement', forecast: '437', budget: '180', variance: '+143%', unit: 'SAR/t' },
  { item: 'Desalinated water cost', forecast: '2.15', budget: '2.50', variance: '-14%', unit: 'SAR/m³' },
  { item: 'Construction steel', forecast: '445', budget: '451', variance: '-1%', unit: 'SAR/t' },
  { item: 'Ready-mix concrete', forecast: '622', budget: '498', variance: '+28%', unit: 'SAR/m³' },
  { item: 'Façade glazing', forecast: '1,060', budget: '863', variance: '+22%', unit: 'SAR/m²' },
  { item: 'Power tariff', forecast: '32.4', budget: '34.6', variance: '-6%', unit: 'SAR/MWh' },
  { item: 'Diesel', forecast: '0.4', budget: '0.6', variance: '-25%', unit: 'SAR/L' },
  { item: 'Asphalt', forecast: '2,133', budget: '2,133', variance: '0%', unit: 'SAR/t' },
]

/* ── SECTION 5 — Cash Flow Bridge (Full Year) ── */

export const cashFlowBridge: WaterfallItem[] = [
  { label: 'Cash, beginning FY26', value: '10,809' },
  { label: 'EBITDA', value: '+15,922' },
  { label: 'Change in working capital', value: '-650' },
  { label: 'Others (operating)', value: '-3,889' },
  { label: 'Cash after operating activities', value: '22,191' },
  { label: 'Capital expenditure', value: '-14,910' },
  { label: 'Others (investing)', value: '-813' },
  { label: 'Cash after investing activities', value: '6,468' },
  { label: 'Financing activities', value: '+6,038' },
  { label: 'Cash, end FY26 Forecast', value: '12,506' },
  { label: 'Cash, end FY26 Budget (Rebase)', value: '10,415' },
]

export type CfBar = WaterfallBar & {
  group?: 'operating' | 'investing' | 'financing'
  bullets?: string[]
}

export const cashFlowWaterfall: CfBar[] = [
  { label: 'Cash, beg., FY26', lines: ['Cash, beg.,', 'FY26'], value: 10809, kind: 'total' },
  {
    label: 'EBITDA', lines: ['EBITDA'], value: 15922, kind: 'delta',
    group: 'operating',
    bullets: ['Price impact', 'Volume impact', 'OPEX', 'Others'],
  },
  {
    label: 'Change in working capital', lines: ['Change in', 'working', 'capital'], value: -650, kind: 'delta',
    group: 'operating',
    bullets: ['Receivables', 'Inventories', 'Payables', 'Adv. & Prepymt.'],
  },
  {
    label: 'Others', lines: ['Others'], value: -3889, kind: 'delta',
    group: 'operating',
    bullets: ['Finance cost', 'Zakat, tax, severance', 'EOSB payments', 'Others*'],
  },
  { label: 'Cash after operating activities', lines: ['Cash after', 'operating', 'activities'], value: 22191, kind: 'subtotal' },
  {
    label: 'Capital expenditure', lines: ['Capital', 'expenditure'], value: -14910, kind: 'delta',
    group: 'investing',
    bullets: ['Growth', 'Non-growth', 'ENOWA'],
  },
  {
    label: 'Others', lines: ['Others'], value: -813, kind: 'delta',
    group: 'investing',
  },
  { label: 'Cash after investing activities', lines: ['Cash after', 'investing', 'activities'], value: 6468, kind: 'subtotal' },
  {
    label: 'Financing activities', lines: ['Financing', 'activities'], value: 6038, kind: 'delta',
    group: 'financing',
    bullets: ['Loan repayment', 'New loan', 'Sukuk'],
  },
  { label: 'Cash, end., FY26 Forecast', lines: ['Cash, end.,', 'FY26', 'Forecast'], value: 12506, kind: 'total' },
  { label: 'Cash, end., FY26 Budget (Rebase)', lines: ['Cash, end.,', 'FY26 Budget', '(Rebase)'], value: 10415, kind: 'reference' },
]

export const cashFlowGroupTotals = {
  operating: { forecast: '+11,383', budget: '+11,347' },
  investing: { forecast: '-15,723', budget: '-17,979' },
  financing: { forecast: '6,038', budget: '6,239' },
} as const

/* ── SECTION 6 — Business Unit Financial Snapshot ── */

export const phosphateBu: BuKpi[] = [
  { label: 'Revenue', q1Actual: '3,813', q1Budget: '4,684', q1Var: '-19%', fyForecast: '21,693', fyBudget: '20,249', fyVar: '+7%', unit: 'SARm' },
  { label: 'EBITDA', q1Actual: '1,667', q1Budget: '2,113', q1Var: '-21%', fyForecast: '7,657', fyBudget: '9,400', fyVar: '-19%', unit: 'SARm' },
  { label: 'Net profit / (loss)', q1Actual: '821', q1Budget: '1,204', q1Var: '-32%', fyForecast: '4,120', fyBudget: '5,580', fyVar: '-26%', unit: 'SARm' },
  { label: 'Cash conversion cycle', q1Actual: '76', q1Budget: '70', q1Var: '+9%', fyForecast: '69', fyBudget: '70', fyVar: '-1%', unit: 'Days' },
]

export const aluminiumBu: BuKpi[] = [
  { label: 'Revenue', q1Actual: '2,779', q1Budget: '2,655', q1Var: '+5%', fyForecast: '13,896', fyBudget: '11,824', fyVar: '+18%', unit: 'SARm' },
  { label: 'EBITDA', q1Actual: '1,129', q1Budget: '797', q1Var: '+42%', fyForecast: '4,604', fyBudget: '3,309', fyVar: '+39%', unit: 'SARm' },
  { label: 'Net profit / (loss)', q1Actual: '517', q1Budget: '192', q1Var: '>100%', fyForecast: '2,278', fyBudget: '991', fyVar: '>100%', unit: 'SARm' },
  { label: 'Sustaining free cash flow', q1Actual: '1,036', q1Budget: '699', q1Var: '+48%', fyForecast: '3,947', fyBudget: '2,652', fyVar: '+49%', unit: 'SARm' },
]

export const bmnmBu: BuKpi[] = [
  { label: 'Revenue', q1Actual: '1,884', q1Budget: '1,692', q1Var: '+11%', fyForecast: '8,712', fyBudget: '7,272', fyVar: '+20%', unit: 'SARm' },
  { label: 'EBITDA', q1Actual: '1,414', q1Budget: '1,001', q1Var: '+41%', fyForecast: '5,980', fyBudget: '4,261', fyVar: '+40%', unit: 'SARm' },
  { label: 'Net profit / (loss)', q1Actual: '1,286', q1Budget: '780', q1Var: '+65%', fyForecast: '4,832', fyBudget: '3,281', fyVar: '+47%', unit: 'SARm' },
  { label: 'Sustaining free cash flow', q1Actual: '1,412', q1Budget: '951', q1Var: '+49%', fyForecast: '5,798', fyBudget: '4,069', fyVar: '+42%', unit: 'SARm' },
]

/* ── SECTION 7 — Working Capital ── */

export type WcRow = {
  label: string
  q1Actual: string
  q1Budget: string
  q1Var: string
  fyForecast: string
  fyBudget: string
  fyVar: string
  unit: string
}

export const aluminiumWc: WcRow[] = [
  { label: 'Inventories', q1Actual: '3,016', q1Budget: '2,614', q1Var: '-402', fyForecast: '2,544', fyBudget: '2,613', fyVar: '+69', unit: 'SARm' },
  { label: 'Inventory days', q1Actual: '129', q1Budget: '114', q1Var: '-15', fyForecast: '96', fyBudget: '102', fyVar: '+6', unit: 'Days' },
  { label: 'Trade receivables', q1Actual: '2,875', q1Budget: '1,767', q1Var: '-1,108', fyForecast: '2,376', fyBudget: '1,946', fyVar: '-430', unit: 'SARm' },
  { label: 'Accounts receivable days', q1Actual: '87', q1Budget: '72', q1Var: '-15', fyForecast: '64', fyBudget: '69', fyVar: '+5', unit: 'Days' },
  { label: 'Trade payables', q1Actual: '1,998', q1Budget: '1,903', q1Var: '-95', fyForecast: '1,689', fyBudget: '1,734', fyVar: '+45', unit: 'SARm' },
  { label: 'Accounts payable days', q1Actual: '88', q1Budget: '82', q1Var: '-6', fyForecast: '66', fyBudget: '70', fyVar: '+4', unit: 'Days' },
  { label: 'Cash conversion cycle', q1Actual: '128', q1Budget: '104', q1Var: '-24', fyForecast: '94', fyBudget: '100', fyVar: '+7', unit: 'Days' },
]

export const bmnmWc: WcRow[] = [
  { label: 'Inventories', q1Actual: '680', q1Budget: '—', q1Var: '—', fyForecast: '1,443', fyBudget: '1,152', fyVar: '-291', unit: 'SARm' },
  { label: 'Inventory days', q1Actual: '154', q1Budget: '—', q1Var: '—', fyForecast: '162', fyBudget: '149', fyVar: '-13', unit: 'Days' },
  { label: 'Trade receivables', q1Actual: '501', q1Budget: '—', q1Var: '—', fyForecast: '208', fyBudget: '175', fyVar: '-33', unit: 'SARm' },
  { label: 'Accounts receivable days', q1Actual: '22', q1Budget: '—', q1Var: '—', fyForecast: '11', fyBudget: '8', fyVar: '-3', unit: 'Days' },
  { label: 'Trade payables', q1Actual: '927', q1Budget: '—', q1Var: '—', fyForecast: '987', fyBudget: '862', fyVar: '-125', unit: 'SARm' },
  { label: 'Accounts payable days', q1Actual: '183', q1Budget: '—', q1Var: '—', fyForecast: '140', fyBudget: '128', fyVar: '-12', unit: 'Days' },
  { label: 'Cash conversion cycle', q1Actual: '8', q1Budget: '—', q1Var: '—', fyForecast: '33', fyBudget: '47', fyVar: '+14', unit: 'Days' },
]

/* ── SECTION 8 — CAPEX ── */

export type CapexRow = {
  label: string
  q1Actual: string
  q1Budget: string
  q1Var: string
  fyForecast: string
  fyBudget: string
  fyVar: string
  unit: string
}

export const consolidatedCapex: CapexRow[] = [
  { label: 'Total CAPEX', q1Actual: '—', q1Budget: '—', q1Var: '—', fyForecast: '14,910', fyBudget: '16,649', fyVar: '-10%', unit: '$M' },
]

export const aluminiumCapex: CapexRow[] = [
  { label: 'Growth CAPEX', q1Actual: '8', q1Budget: '29', q1Var: '-20', fyForecast: '1,244', fyBudget: '1,244', fyVar: '0', unit: 'SARm' },
  { label: 'Non-Growth CAPEX', q1Actual: '93', q1Budget: '98', q1Var: '-5', fyForecast: '657', fyBudget: '657', fyVar: '0', unit: 'SARm' },
]

export const bmnmCapex: CapexRow[] = [
  { label: 'Growth CAPEX', q1Actual: '182', q1Budget: '333', q1Var: '-151', fyForecast: '3,113', fyBudget: '3,461', fyVar: '-348', unit: 'SARm' },
  { label: 'Non-Growth CAPEX', q1Actual: '2', q1Budget: '50', q1Var: '-48', fyForecast: '190', fyBudget: '192', fyVar: '-2', unit: 'SARm' },
]

export const phosphateCapex: CapexRow[] = [
  { label: 'Non-Growth CAPEX', q1Actual: '373', q1Budget: '415', q1Var: '-10%', fyForecast: '1,050', fyBudget: '1,400', fyVar: '-25%', unit: 'SARm' },
]
