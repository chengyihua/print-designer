import React from 'react';

interface VerticalRulerProps {
    height: number;
    marginTop: number;
    zoomLevel: number;
}

const VerticalRuler: React.FC<VerticalRulerProps> = ({
    height,
    marginTop,
    zoomLevel,
}) => {
    const pixelsPerInch = 96;
    const pixelsPerCm = pixelsPerInch / 2.54;
    const majorTickInterval = 100;
    const minorTickInterval = 10;

    const ticks = [];
    
    for (let i = 0; i <= height; i += minorTickInterval) {
        const isMajor = i % majorTickInterval === 0;
        const isHalf = i % (majorTickInterval / 2) === 0;
        
        ticks.push(
            <div
                key={`tick-${i}`}
                className="ruler-tick"
                style={{
                    position: 'absolute',
                    top: `${i}px`,
                    left: 0,
                    height: '1px',
                    width: isMajor ? '15px' : isHalf ? '10px' : '5px',
                    backgroundColor: isMajor ? '#333' : '#999',
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'top left',
                }}
            >
                {isMajor && (
                    <div
                        className="ruler-label"
                        style={{
                            position: 'absolute',
                            top: '2px',
                            left: '8px',
                            fontSize: '10px',
                            color: '#333',
                            whiteSpace: 'nowrap',
                            transform: `rotate(-90deg) scale(${1/zoomLevel})`,
                            transformOrigin: 'top left',
                        }}
                    >
                        {Math.round(i / pixelsPerCm)}cm
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            className="vertical-ruler"
            style={{
                position: 'absolute',
                left: `${-20}px`,
                top: `${0}px`,
                width: '20px',
                height: `${height}px`,
                backgroundColor: '#f8f8f8',
                borderRight: '1px solid #ddd',
                overflow: 'hidden',
                zIndex: 100,
                // display:"none"
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'top left',
                }}
            >
                {ticks}
            </div>
        </div>
    );
};

export default VerticalRuler;