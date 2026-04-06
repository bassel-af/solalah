import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Must mock before import
vi.mock('@/lib/utils/search', () => ({
  stripArabicDiacritics: (s: string) => s,
}));

import { CascadeDeleteModal } from '@/components/tree/CascadeDeleteModal/CascadeDeleteModal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  personName: 'محمد',
  affectedCount: 2,
  affectedNames: ['أحمد', 'فاطمة'],
  truncated: false,
  branchPointerCount: 0,
  loading: false,
};

function renderModal(overrides: Partial<typeof defaultProps> = {}) {
  return render(<CascadeDeleteModal {...defaultProps} {...overrides} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CascadeDeleteModal', () => {
  beforeEach(() => vi.clearAllMocks());

  // =========================================================================
  // Rendering
  // =========================================================================

  test('renders nothing when isOpen is false', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('renders dialog when isOpen is true', () => {
    renderModal();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  test('displays total delete count in confirm button', () => {
    renderModal({ affectedCount: 3 });
    // Button should show total count: target + affected = 4
    const confirmBtn = screen.getByRole('button', { name: /حذف/ });
    expect(confirmBtn.textContent).toContain('4');
  });

  test('displays affected names list', () => {
    renderModal({ affectedNames: ['أحمد', 'فاطمة'] });
    expect(screen.getByText('أحمد')).toBeInTheDocument();
    expect(screen.getByText('فاطمة')).toBeInTheDocument();
  });

  test('shows truncation message when truncated', () => {
    renderModal({
      affectedCount: 25,
      affectedNames: Array(20).fill('شخص'),
      truncated: true,
    });
    // Should show "و5 آخرين"
    expect(screen.getByText(/و5 آخرين/)).toBeInTheDocument();
  });

  test('does not show truncation when not truncated', () => {
    renderModal({ truncated: false });
    expect(screen.queryByText(/آخرين/)).not.toBeInTheDocument();
  });

  test('shows branch pointer count when > 0', () => {
    renderModal({ branchPointerCount: 3 });
    expect(screen.getByText(/رابط فرعي/)).toBeInTheDocument();
  });

  // =========================================================================
  // No name confirmation for < 5 affected
  // =========================================================================

  test('confirm button is enabled without name input when affectedCount < 5', () => {
    renderModal({ affectedCount: 3 });
    const confirmBtn = screen.getByRole('button', { name: /حذف/ });
    expect(confirmBtn).not.toBeDisabled();
  });

  test('no name input shown when affectedCount < 5', () => {
    renderModal({ affectedCount: 3 });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  // =========================================================================
  // Name confirmation for >= 5 affected
  // =========================================================================

  test('shows name input when affectedCount >= 5', () => {
    renderModal({ affectedCount: 5, affectedNames: Array(5).fill('شخص') });
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  test('confirm button is disabled until name matches when affectedCount >= 5', () => {
    renderModal({
      affectedCount: 5,
      personName: 'محمد',
      affectedNames: Array(5).fill('شخص'),
    });
    const confirmBtn = screen.getByRole('button', { name: /حذف/ });
    expect(confirmBtn).toBeDisabled();
  });

  test('confirm button becomes enabled when name matches', () => {
    renderModal({
      affectedCount: 5,
      personName: 'محمد',
      affectedNames: Array(5).fill('شخص'),
    });
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'محمد' } });
    const confirmBtn = screen.getByRole('button', { name: /حذف/ });
    expect(confirmBtn).not.toBeDisabled();
  });

  // =========================================================================
  // Actions
  // =========================================================================

  test('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn();
    renderModal({ affectedCount: 2, onConfirm });
    const confirmBtn = screen.getByRole('button', { name: /حذف/ });
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when cancel button clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    const cancelBtn = screen.getByRole('button', { name: /إلغاء/ });
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('confirm button shows loading state', () => {
    renderModal({ loading: true });
    const confirmBtn = screen.getByRole('button', { name: /جارٍ/ });
    expect(confirmBtn).toBeDisabled();
  });

  test('confirm button is disabled when loading', () => {
    renderModal({ loading: true });
    const buttons = screen.getAllByRole('button');
    const confirmBtn = buttons.find(b => b.textContent?.includes('جارٍ'));
    expect(confirmBtn).toBeDisabled();
  });
});
