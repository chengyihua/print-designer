import React from 'react';

interface HorizontalRulerProps {
    width: number;
    marginLeft: number;
    zoomLevel: number;
}

const HorizontalRuler: React.FC<HorizontalRulerProps> = ({
    width,
    marginLeft,
    zoomLevel,
}) => {
    const pixelsPerInch = 96;
    const pixelsPerCm = pixelsPerInch / 2.54;
    const majorTickInterval = 100;
    const minorTickInterval = 10;

    const ticks = [];
    
    for (let i = 0; i <= width; i += minorTickInterval) {
        const isMajor = i % majorTickInterval === 0;
        const isHalf = i % (majorTickInterval / 2) === 0;
        
        ticks.push(
            <div
                key={`tick-${i}`}
                className="ruler-tick"
                style={{
                    position: 'absolute',
                    left: `${i}px`,
                    bottom: 0,
                    width: '1px',
                    height: isMajor ? '15px' : isHalf ? '10px' : '5px',
                    backgroundColor: isMajor ? '#333' : '#999',
                    transform: `scale(${zoomLevel})`,
                    transformOrigin: 'bottom left',
                }}
            >
                {isMajor && (
                    <div
                        className="ruler-label"
                        style={{
                            position: 'absolute',
                            left: '2px',
                            bottom: '6px',
                            fontSize: '10px',
                            color: '#333',
                            whiteSpace: 'nowrap',
                            transform: `scale(${1/zoomLevel})`,
                            transformOrigin: 'bottom left',
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
            className="horizontal-ruler"
            style={{
                position: 'absolute',
                top: `${-20}px`,
                left: `${0}px`,
                width: `${width}px`,
                height: '20px',
                backgroundColor: '#f8f8f8',
                borderBottom: '1px solid #ddd',
                overflow: 'hidden',
                zIndex: 100,
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

export default HorizontalRuler;