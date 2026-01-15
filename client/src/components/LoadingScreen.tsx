import React from 'react';

interface LoadingScreenProps {
    progress: number; // 0 to 100
    onStart: () => void;
    loaded: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress, onStart, loaded }) => {
    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontFamily: 'monospace',
            zIndex: 9999
        }}>
            <h1 style={{ fontSize: '32px', marginBottom: '20px', color: loaded ? '#4f4' : '#fff' }}>
                {loaded ? "SYSTEM READY" : "INITIALIZING..."}
            </h1>

            <div style={{
                width: '300px',
                height: '20px',
                border: '2px solid #333',
                padding: '2px',
                marginBottom: '10px'
            }}>
                <div style={{
                    width: `${progress}%`,
                    height: '100%',
                    backgroundColor: loaded ? '#4f4' : '#ffaa00',
                    transition: 'width 0.2s'
                }} />
            </div>

            <div style={{ marginBottom: '30px', color: '#888' }}>
                {Math.floor(progress)}% ASSETS LOADED
            </div>

            {loaded && (
                <button
                    onClick={onStart}
                    style={{
                        padding: '15px 40px',
                        fontSize: '24px',
                        backgroundColor: '#4f4',
                        color: '#000',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        animation: 'pulse 2s infinite'
                    }}
                >
                    START OPERATION
                </button>
            )}

            <style jsx>{`
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};
