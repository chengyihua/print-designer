import { useState, useRef, useEffect, useCallback } from 'react';
import { Band, ControlObjectAll, DesignerOptions, DesignerState, PageSettings } from '../types/types';
import { defaultOptions, defaultBands, defaultPageSettings, pageSizePresets } from '../types/constants';
import useHistory from '../hooks/useHistory';

interface UseBandDesignerProps {
    options?: Partial<DesignerOptions>;
    initialDesign?: Band[];
    onDesignChange?: (bands: Band[]) => void;
    initialPageSettings?: PageSettings;
    onPageSettingsChange?: (settings: PageSettings) => void;
}

export const useBandDesigner = ({
    options = {},
    initialDesign,
    onDesignChange,
    initialPageSettings,
    onPageSettingsChange,
}: UseBandDesignerProps) => {
    const designerOptions = {
        ...defaultOptions,
        ...options
    };

    // 页面设置状态
    const [pageSettings, setPageSettingsState] = useState<PageSettings>(
        initialPageSettings || { ...defaultPageSettings }
    );

    // 根据页面设置计算纸张尺寸（始终返回 mm 值）
    const getPageDimensions = useCallback(() => {
        let { width, height, unit, orientation } = pageSettings;
        
        // 如果是 inch，转换为 mm
        if (unit === 'in') {
            width = width * 25.4;
            height = height * 25.4;
        }
        
        // 处理纸张方向
        if (orientation === 'landscape') {
            return { width: height, height: width };
        }
        return { width, height };
    }, [pageSettings]);

    // 计算当前页面尺寸（mm）
    const pageDimensions = getPageDimensions();
    const PAGE_WIDTH = pageDimensions.width;
    const PAGE_HEIGHT = pageDimensions.height;
    const PAGE_MARGINS = pageSettings.margins;

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
            pageSettings,
            version: '1.0',
            createdAt: new Date().toISOString(),
        };
        return designData;
    }, [bands, pageSettings]);

    // 更新页面设置
    const setPageSettings = useCallback((settings: PageSettings | ((prev: PageSettings) => PageSettings)) => {
        setPageSettingsState(prev => {
            const newSettings = typeof settings === 'function' ? settings(prev) : settings;
            if (onPageSettingsChange) {
                onPageSettingsChange(newSettings);
            }
            return newSettings;
        });
    }, [onPageSettingsChange]);

    // 快捷设置纸张类型
    const setPaperSize = useCallback((paperSize: keyof typeof pageSizePresets) => {
        const preset = pageSizePresets[paperSize];
        if (preset) {
            setPageSettings(prev => ({
                ...prev,
                paperSize,
                width: preset.width,
                height: preset.height,
                unit: preset.unit as 'mm' | 'in',
            }));
        }
    }, [setPageSettings]);

    // 设置边距
    const setMargins = useCallback((margins: PageSettings['margins']) => {
        setPageSettings(prev => ({
            ...prev,
            margins,
        }));
    }, [setPageSettings]);

    // 设置纸张方向
    const setOrientation = useCallback((orientation: 'portrait' | 'landscape') => {
        setPageSettings(prev => ({
            ...prev,
            orientation,
        }));
    }, [setPageSettings]);

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
        PAGE_WIDTH,
        PAGE_HEIGHT,
        PAGE_MARGINS,
        // 页面设置
        pageSettings,
        setPageSettings,
        setPaperSize,
        setMargins,
        setOrientation,
        // 撤销/恢复功能
        undo,
        redo,
        canUndo,
        canRedo,
        clearHistory,
    };
};