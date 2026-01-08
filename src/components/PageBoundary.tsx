import React from 'react';

interface PageBoundaryProps {
    width: number;
    height: number;
    margins: { top: number; bottom: number; left: number; right: number };
    zoomLevel: number;
}

const PageBoundary: React.FC<PageBoundaryProps> = ({
    width,
    height,
    margins={top:40, bottom:40, left:40, right:40},
    zoomLevel,
}) => {
    const pageStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${margins.left}px`,
        top: `${margins.top}px`,
        width: `${width}px`,
        height: `${height}px`,
        transform: `scale(${zoomLevel})`,
        transformOrigin: 'top left',
        zIndex: 1,
    };

    return (
        <>
            {/* 纸张背景 */}
            <div
                className="page-background"
                style={pageStyle}
            />
        </>
    );
};

export default PageBoundary;