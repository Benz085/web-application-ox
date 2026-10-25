import '@/web-app-ox/test/setup'
import { describe, expect, it } from 'vitest'
import { board } from '@/web-app-ox/test/fixtures'
import { WIN_LINES, findWinLine } from '@/web-app-ox/components/Board.utils'

describe('findWinLine (AC-8)', () => {
  it('knows all 8 lines', () => {
    expect(WIN_LINES).toHaveLength(8)
  })

  it.each(WIN_LINES.flatMap((line) => (['X', 'O'] as const).map((mark) => [line, mark] as const)))(
    'detects line %j for %s',
    (line, mark) => {
      const cells = Array.from({ length: 9 }, (_, i) => (line.includes(i) ? mark : '.')).join('')
      expect(findWinLine(board(cells))).toEqual(line)
    },
  )

  it('returns null for an empty board', () => {
    expect(findWinLine(board(''))).toBeNull()
  })

  it('returns null for a full board with no line (draw)', () => {
    expect(findWinLine(board('XOXXOOOXX'))).toBeNull()
  })

  it('does not treat three different marks or two in a row as a win', () => {
    expect(findWinLine(board('XXO......'))).toBeNull()
    expect(findWinLine(board('XO.XO....'))).toBeNull()
  })
})
