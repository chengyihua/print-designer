// useHistory.ts - 撤销/恢复历史记录管理 Hook
import { useState, useCallback, useRef, useEffect } from 'react';

interface HistoryState<T> {
    past: T[];
    present: T;
    future: T[];
}

interface UseHistoryOptions {
    maxHistory?: number;  // 最大历史记录数
}

interface UseHistoryReturn<T> {
    state: T;
    setState: (newState: T | ((prev: T) => T), skipHistory?: boolean) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    clearHistory: () => void;
    saveSnapshot: () => void;  // 手动保存快照
}

function useHistory<T>(
    initialState: T,
    options: UseHistoryOptions = {}
): UseHistoryReturn<T> {
    const { maxHistory = 50 } = options;

    const [history, setHistory] = useState<HistoryState<T>>({
        past: [],
        present: initialState,
        future: []
    });

    // 用于防抖保存
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedRef = useRef<string>(JSON.stringify(initialState));

    // 设置状态（带历史记录）
    const setState = useCallback((
        newState: T | ((prev: T) => T),
        skipHistory: boolean = false
    ) => {
        setHistory(prevHistory => {
            const actualNewState = typeof newState === 'function'
                ? (newState as (prev: T) => T)(prevHistory.present)
                : newState;

            if (skipHistory) {
                return {
                    ...prevHistory,
                    present: actualNewState
                };
            }

            // 检查是否有实际变化
            const newStateStr = JSON.stringify(actualNewState);
            if (newStateStr === JSON.stringify(prevHistory.present)) {
                return prevHistory;
            }

            // 添加到历史记录
            const newPast = [...prevHistory.past, prevHistory.present];
            
            // 限制历史记录数量
            if (newPast.length > maxHistory) {
                newPast.shift();
            }

            return {
                past: newPast,
                present: actualNewState,
                future: []  // 新操作清空重做栈
            };
        });
    }, [maxHistory]);

    // 撤销
    const undo = useCallback(() => {
        setHistory(prevHistory => {
            if (prevHistory.past.length === 0) {
                return prevHistory;
            }

            const newPast = [...prevHistory.past];
            const previous = newPast.pop()!;

            return {
                past: newPast,
                present: previous,
                future: [prevHistory.present, ...prevHistory.future]
            };
        });
    }, []);

    // 恢复
    const redo = useCallback(() => {
        setHistory(prevHistory => {
            if (prevHistory.future.length === 0) {
                return prevHistory;
            }

            const newFuture = [...prevHistory.future];
            const next = newFuture.shift()!;

            return {
                past: [...prevHistory.past, prevHistory.present],
                present: next,
                future: newFuture
            };
        });
    }, []);

    // 清除历史记录
    const clearHistory = useCallback(() => {
        setHistory(prevHistory => ({
            past: [],
            present: prevHistory.present,
            future: []
        }));
    }, []);

    // 手动保存快照
    const saveSnapshot = useCallback(() => {
        const currentStr = JSON.stringify(history.present);
        if (currentStr !== lastSavedRef.current) {
            lastSavedRef.current = currentStr;
            setHistory(prevHistory => ({
                ...prevHistory,
                past: [...prevHistory.past, prevHistory.present].slice(-maxHistory),
            }));
        }
    }, [history.present, maxHistory]);

    // 清理定时器
    useEffect(() => {
        const timeoutId = saveTimeoutRef.current;
        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, []);

    return {
        state: history.present,
        setState,
        undo,
        redo,
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0,
        clearHistory,
        saveSnapshot
    };
}

export default useHistory;
