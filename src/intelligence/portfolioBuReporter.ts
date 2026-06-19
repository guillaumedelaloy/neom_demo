/** Growth portfolio page reports BU chip so TopBar “Ask anything” can inherit BU-scoped context. */
const portfolioBuFilterRef = { current: null as string | null }

export function reportPortfolioBuFilterForChat(bu: string) {
  portfolioBuFilterRef.current = bu === 'All' ? null : bu
}

export function getPortfolioBuFilterForChat(): string | null {
  return portfolioBuFilterRef.current
}
