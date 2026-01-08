import { useState, useRef, useEffect, useCallback } from 'react';
import { Band, ControlObjectAll, DesignerOptions, DesignerState } from '../types/types';
import { defaultOptions, defaultBands, A4_WIDTH, A4_HEIGHT, PAGE_MARGINS } from '../types/constants';
import useHistory from '../hooks/useHistory';

interface UseBandDesignerProps {
    options?: Partial<DesignerOptions>;
    initialDesign?: Band[];
    onDesignChange?: (bands: Band[]) => void;
}

export const useBandDesigner = ({
    options = {},
    initialDesign,
    onDesignChange,
}: UseBandDesignerProps) => {
    const designerOptions = {
        ...defaultOptions,
        ...options
    };

    const {
        state: bands,
        setState: setBands,
        undo,
        redo,
        canUndo,
        canRedo,
        clearHistory
    } = useHistory<Band[]>(initialDesign || [...defaultBands], { maxHistory: 50 });

    const [state, setState] = useState<DesignerState>({
        draggingBoundary: null,
        selectedBand: null,
        selectedObject: null,
        showBands: true,
        showGrid: designerOptions.showGrid,
        showGuides: true,
        zoomLevel: 1,
        showRulers: true,
        showPageMargins: true,
    });

    const bandsRef = useRef(bands);
    
    useEffect(() => {
        bandsRef.current = bands;
    }, [bands]);

    // 初始化带区位置
    useEffect(() => {
        if (initialDesign) {
            setBands(initialDesign);
        } else {
            const updatedBands = [...defaultBands];
            let currentTop = 0;

            updatedBands.forEach((band) => {
                const initialHeight = 100;
                band.top = currentTop;
                band.bottom = currentTop + initialHeight;
                band.actualBottom = currentTop + initialHeight;
                currentTop = band.actualBottom + designerOptions.bandSpacing;
            });

            setBands(updatedBands);
        }
    }, [initialDesign, designerOptions.bandSpacing, setBands]);

    // 处理设计变化
    useEffect(() => {
        if (onDesignChange) {
            onDesignChange(bands);
        }
    }, [bands, onDesignChange]);

    const updateState = useCallback((updates: Partial<DesignerState>) => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    // 初始化时设置默认带区
    useEffect(() => {
        if (bands.length > 0 && state.selectedBand === null) {
            updateState({ selectedBand: bands[0].id });
        }
    }, [bands, state.selectedBand, updateState]);

    const updateBands = useCallback((updater: (prevBands: Band[]) => Band[]) => {
        setBands(updater);
    }, [setBands]);

    const selectBand = useCallback((bandId: string) => {
        updateState({
            selectedBand: bandId,
            selectedObject: null,
        });
    }, [updateState]);

    const selectObject = useCallback((objectId: string, bandId: string) => {
        updateState({
            selectedObject: objectId,
            selectedBand: bandId,
        });
    }, [updateState]);

    const updateObjectPosition = useCallback((objectId: string, newX: number, newY: number) => {
        setBands(prevBands => {
            return prevBands.map(band => {
                const objectIndex = band.objects.findIndex(obj => obj.id === objectId);
                if (objectIndex === -1) return band;
                
                // 创建新的对象引用，确保 React 能检测到变化
                return {
                    ...band,
                    objects: band.objects.map((obj, i) => 
                        i === objectIndex ? { ...obj, x: newX, y: newY } : obj
                    )
                };
            });
        });
    }, [setBands]);

    const deleteSelectedObject = useCallback(() => {
        if (!state.selectedObject) return;

        const updatedBands = [...bands];
        let deleted = false;

        for (const band of updatedBands) {
            const objectIndex = band.objects.findIndex(obj => obj.id === state.selectedObject);
            if (objectIndex !== -1) {
                band.objects.splice(objectIndex, 1);
                deleted = true;
                break;
            }
        }

        if (deleted) {
            setBands(updatedBands);
            updateState({ selectedObject: null });
        }
    }, [bands, state.selectedObject, updateState, setBands]);

    const handleSave = useCallback(() => {
        const designData = {
            bands: bands.map(band => ({
                ...band,
                objects: band.objects.map(obj => {
                    const objAll = obj as ControlObjectAll;
                    return {
                        ...obj,
                        text: objAll.text || '',
                        fieldName: objAll.fieldName || '',
                    };
                }),
            })),
            version: '1.0',
            createdAt: new Date().toISOString(),
        };
        return designData;
    }, [bands]);

    return {
        bands,
        setBands,
        state,
        updateState,
        designerOptions,
        selectBand,
        selectObject,
        updateObjectPosition,
        deleteSelectedObject,
        handleSave,
        updateBands,
        A4_WIDTH,
        A4_HEIGHT,
        PAGE_MARGINS,
        // 撤销/恢复功能
        undo,
        redo,
        canUndo,
        canRedo,
        clearHistory,
    };
};