/**
 * Unit tests for useUndoRedo hook.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUndoRedo } from '@/hooks/useUndoRedo';

describe('useUndoRedo', () => {
  it('initial state is correct', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));

    expect(result.current.state).toEqual({ count: 0 });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historyLength).toBe(1);
  });

  it('setState updates state', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));

    act(() => {
      result.current.setState({ count: 1 });
    });

    expect(result.current.state).toEqual({ count: 1 });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historyLength).toBe(2);
  });

  it('undo reverts to previous state', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));

    act(() => {
      result.current.setState({ count: 1 });
    });
    act(() => {
      result.current.setState({ count: 2 });
    });

    expect(result.current.state).toEqual({ count: 2 });

    act(() => {
      result.current.undo();
    });

    expect(result.current.state).toEqual({ count: 1 });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);
  });

  it('redo restores future state', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));

    act(() => {
      result.current.setState({ count: 1 });
    });
    act(() => {
      result.current.setState({ count: 2 });
    });
    act(() => {
      result.current.undo();
    });

    expect(result.current.state).toEqual({ count: 1 });

    act(() => {
      result.current.redo();
    });

    expect(result.current.state).toEqual({ count: 2 });
    expect(result.current.canRedo).toBe(false);
  });

  it('canUndo/canRedo reflect history position', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.setState({ count: 1 });
    });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.undo();
    });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('history capped at maxHistory', () => {
    const { result } = renderHook(() => useUndoRedo(0, { maxHistory: 3 }));

    act(() => result.current.setState(1));
    act(() => result.current.setState(2));
    act(() => result.current.setState(3));
    act(() => result.current.setState(4));

    expect(result.current.historyLength).toBeLessThanOrEqual(3);
    expect(result.current.state).toBe(4);
  });

  it('setState after undo clears redo stack', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));

    act(() => {
      result.current.setState({ count: 1 });
    });
    act(() => {
      result.current.setState({ count: 2 });
    });
    act(() => {
      result.current.undo();
    });

    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.setState({ count: 99 });
    });

    expect(result.current.state).toEqual({ count: 99 });
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historyLength).toBe(3);
  });

  it('does not push duplicate states', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));

    act(() => {
      result.current.setState({ count: 1 });
    });
    act(() => {
      result.current.setState({ count: 1 });
    });

    expect(result.current.historyLength).toBe(2);
  });

  it('supports functional setState', () => {
    const { result } = renderHook(() => useUndoRedo(5));

    act(() => {
      result.current.setState((prev) => prev + 3);
    });

    expect(result.current.state).toBe(8);
  });
});
