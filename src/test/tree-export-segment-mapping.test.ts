import { describe, test, expect } from 'vitest';
import {
  segmentFromFlags,
  flagsFromSegment,
  type ExportVisibilitySegment,
} from '@/lib/workspace/tree-export-visibility';

describe('tree-export visibility — segment ↔ flags mapping', () => {
  test('flagsFromSegment("off") → both false', () => {
    expect(flagsFromSegment('off')).toEqual({
      enableTreeExport: false,
      allowMemberExport: false,
    });
  });

  test('flagsFromSegment("admins-only") → parent true, child false', () => {
    expect(flagsFromSegment('admins-only')).toEqual({
      enableTreeExport: true,
      allowMemberExport: false,
    });
  });

  test('flagsFromSegment("all-members") → both true', () => {
    expect(flagsFromSegment('all-members')).toEqual({
      enableTreeExport: true,
      allowMemberExport: true,
    });
  });

  test('segmentFromFlags({false,false}) → "off"', () => {
    expect(segmentFromFlags({ enableTreeExport: false, allowMemberExport: false })).toBe('off');
  });

  test('segmentFromFlags({true,false}) → "admins-only"', () => {
    expect(segmentFromFlags({ enableTreeExport: true, allowMemberExport: false })).toBe('admins-only');
  });

  test('segmentFromFlags({true,true}) → "all-members"', () => {
    expect(segmentFromFlags({ enableTreeExport: true, allowMemberExport: true })).toBe('all-members');
  });

  test('segmentFromFlags treats undefined as schema default (parent=true, child=false)', () => {
    // Matches Prisma defaults: enableTreeExport=true, allowMemberExport=false
    expect(
      segmentFromFlags({ enableTreeExport: undefined, allowMemberExport: undefined }),
    ).toBe('admins-only');
  });

  test('segmentFromFlags collapses the impossible (false, true) state to "off"', () => {
    // Server cascade should make this state unreachable, but if an old row
    // or a hand-crafted PATCH ever produces it, it reads as fully disabled:
    // `enableTreeExport=false` is the hard gate, so the UI reflects that.
    expect(segmentFromFlags({ enableTreeExport: false, allowMemberExport: true })).toBe('off');
  });

  test('round-trip: every segment round-trips through flags and back', () => {
    const segments: ExportVisibilitySegment[] = ['off', 'admins-only', 'all-members'];
    for (const segment of segments) {
      expect(segmentFromFlags(flagsFromSegment(segment))).toBe(segment);
    }
  });
});
