import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { TreeProvider, useTree } from '@/context/TreeContext'
import type { ReactNode } from 'react'

const wrapper = ({ children }: { children: ReactNode }) => (
  <TreeProvider>{children}</TreeProvider>
)

describe('TreeContext – focusPersonId one-shot signal', () => {
  it('initializes focusPersonId as null', () => {
    const { result } = renderHook(() => useTree(), { wrapper })
    expect(result.current.focusPersonId).toBeNull()
  })

  it('setFocusPersonId stores the provided ID', () => {
    const { result } = renderHook(() => useTree(), { wrapper })

    act(() => {
      result.current.setFocusPersonId('@I5@')
    })

    expect(result.current.focusPersonId).toBe('@I5@')
  })

  it('setFocusPersonId(null) clears a previously set focusPersonId', () => {
    const { result } = renderHook(() => useTree(), { wrapper })

    act(() => {
      result.current.setFocusPersonId('@I5@')
    })
    expect(result.current.focusPersonId).toBe('@I5@')

    act(() => {
      result.current.setFocusPersonId(null)
    })
    expect(result.current.focusPersonId).toBeNull()
  })

  it('selectedPersonId changes do not affect focusPersonId', () => {
    const { result } = renderHook(() => useTree(), { wrapper })

    act(() => {
      result.current.setFocusPersonId('@I5@')
    })

    act(() => {
      result.current.setSelectedPersonId('@I9@')
    })

    expect(result.current.focusPersonId).toBe('@I5@')
    expect(result.current.selectedPersonId).toBe('@I9@')
  })

  it('focusPersonId can be cleared after an intervening selectedPersonId change', () => {
    const { result } = renderHook(() => useTree(), { wrapper })

    act(() => {
      result.current.setFocusPersonId('@I5@')
    })
    act(() => {
      result.current.setSelectedPersonId('@I9@')
    })
    act(() => {
      result.current.setFocusPersonId(null)
    })

    expect(result.current.focusPersonId).toBeNull()
    expect(result.current.selectedPersonId).toBe('@I9@')
  })

  it('setFocusPersonId is referentially stable across re-renders', () => {
    const { result, rerender } = renderHook(() => useTree(), { wrapper })
    const firstRef = result.current.setFocusPersonId

    act(() => {
      result.current.setSearchQuery('test')
    })
    rerender()

    expect(result.current.setFocusPersonId).toBe(firstRef)
  })
})
