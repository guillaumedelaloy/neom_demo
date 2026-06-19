import type { CommodityPrice } from '../data/types'

export type Rag = 'green' | 'amber' | 'red'

export function commodityRag(c: CommodityPrice): Rag {
  if ('greenAbove' in c) {
    if (c.current >= c.greenAbove) return 'green'
    if (c.current <= c.redBelow) return 'red'
    return 'amber'
  }
  if (c.current <= c.greenBelow) return 'green'
  if (c.current >= c.redAbove + 50) return 'red'
  return 'amber'
}
