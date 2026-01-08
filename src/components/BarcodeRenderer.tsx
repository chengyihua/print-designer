/**
 * 条码和二维码渲染组件
 */
import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

interface BarcodeRendererProps {
    value: string;
    type?: 'CODE128' | 'CODE39' | 'EAN13' | 'EAN8' | 'UPC' | 'ITF14';
    width?: number;
    height?: number;
    showText?: boolean;
    background?: string;
    lineColor?: string;
}

export const BarcodeRenderer: React.FC<BarcodeRendererProps> = ({
    value,
    type = 'CODE128',
    width,
    height,
    showText = true,
    background = '#FFFFFF',
    lineColor = '#000000',
}) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (svgRef.current && value) {
            try {
                // 清除旧内容
                while (svgRef.current.firstChild) {
                    svgRef.current.removeChild(svgRef.current.firstChild);
                }
                JsBarcode(svgRef.current, value, {
                    format: type,
                    width: 2,
                    // 显示文本时需要给文本留出空间（约20px）
                    height: height ? (showText ? Math.max(height - 20, 20) : height) : 40,
                    displayValue: showText,
                    background: background,
                    lineColor: lineColor,
                    margin: 2,
                    fontSize: 12,
                    textMargin: 2,
                });
            } catch (err: any) {
                console.error('条码生成失败:', err);
            }
        }
    }, [value, type, height, showText, background, lineColor]);

    if (!value) {
        return (
            <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: background,
                color: '#999',
                fontSize: '12px',
            }}>
                [条码]
            </div>
        );
    }

    // 用 key 强制类型切换时重新挂载
    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: background,
            overflow: 'hidden',
        }}>
            <svg
                key={`${type}-${value}-${showText}`}
                ref={svgRef}
                preserveAspectRatio="none"
                style={{
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                }}
            />
        </div>
    );
};

interface QRCodeRendererProps {
    value: string;
    width?: number;
    height?: number;
    errorLevel?: 'L' | 'M' | 'Q' | 'H';
    background?: string;
    foreground?: string;
}

export const QRCodeRenderer: React.FC<QRCodeRendererProps> = ({
    value,
    width,
    height,
    errorLevel = 'M',
    background = '#FFFFFF',
    foreground = '#000000',
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (canvasRef.current && value) {
            const size = Math.min(width || 100, height || 100);
            QRCode.toCanvas(canvasRef.current, value, {
                width: size,
                margin: 1,
                errorCorrectionLevel: errorLevel,
                color: {
                    dark: foreground,
                    light: background,
                },
            }).catch((err: Error) => {
                console.error('二维码生成失败:', err);
            });
        }
    }, [value, width, height, errorLevel, background, foreground]);

    if (!value) {
        return (
            <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: background,
                color: '#999',
                fontSize: '12px',
            }}>
                [二维码]
            </div>
        );
    }

    return (
        <canvas
            key={`${value}-${errorLevel}`}
            ref={canvasRef}
            style={{
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
            }}
        />
    );
};

const BarcodeExports = { BarcodeRenderer, QRCodeRenderer };
export default BarcodeExports;
