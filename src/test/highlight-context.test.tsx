import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { TreeProvider, useTree } from '@/context/TreeContext'
import type { ReactNode } from 'react'

const wrapper = ({ children }: { children: ReactNode }) => (
  <TreeProvider>{children}</TreeProvider>
)

describe('TreeContext – highlightedPersonId', () => {
  it('initializes highlightedPersonId as null', () => {
    const { result } = renderHook(() => useTree(), { wrapper })
    expect(result.current.highlightedPersonId).toBeNull()
  })

  it('sets highlightedPersonId and clears it back to null', () => {
    const { result } = renderHook(() => useTree(), { wrapper })

    act(() => {
      result.current.setHighlightedPersonId('@I42@')
    })
    expect(result.current.highlightedPersonId).toBe('@I42@')

    act(() => {
      result.current.setHighlightedPersonId(null)
    })
    expect(result.current.highlightedPersonId).toBeNull()
  })

  it('replaces a previously highlighted person when a new one is set', () => {
    const { result } = renderHook(() => useTree(), { wrapper })

    act(() => {
      result.current.setHighlightedPersonId('@I1@')
    })
    act(() => {
      result.current.setHighlightedPersonId('@I2@')
    })

    expect(result.current.highlightedPersonId).toBe('@I2@')
  })
})
