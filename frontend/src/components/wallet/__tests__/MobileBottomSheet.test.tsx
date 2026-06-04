/**
 * Unit tests for MobileBottomSheet component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MobileBottomSheet } from '@/components/wallet/studio/MobileBottomSheet';

describe('MobileBottomSheet', () => {
  const baseProps = {
    isOpen: false,
    onClose: vi.fn(),
    children: <div data-testid="sheet-child">Sheet Content</div>,
    title: 'Test Sheet',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<MobileBottomSheet {...baseProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders title and children when isOpen is true', () => {
    render(<MobileBottomSheet {...baseProps} isOpen />);
    expect(screen.getByText('Test Sheet')).toBeDefined();
    expect(screen.getByTestId('sheet-child')).toBeDefined();
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<MobileBottomSheet {...baseProps} isOpen />);
    const backdrop = screen.getByTestId('bottom-sheet-backdrop');
    fireEvent.click(backdrop);
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('renders drag handle', () => {
    render(<MobileBottomSheet {...baseProps} isOpen />);
    expect(screen.getByTestId('bottom-sheet-handle')).toBeDefined();
  });

  it('renders scrollable content area', () => {
    render(<MobileBottomSheet {...baseProps} isOpen />);
    expect(screen.getByTestId('bottom-sheet-content')).toBeDefined();
  });

  it('has max-height of 85vh on the sheet', () => {
    render(<MobileBottomSheet {...baseProps} isOpen />);
    const sheet = screen.getByTestId('bottom-sheet-content').parentElement;
    expect(sheet).toBeDefined();
    expect(sheet!.style.maxHeight).toBe('85vh');
  });
});
