'use client';

import React from 'react';
import { WeaponType } from '../game/player/AnimationConfig';
import { WEAPON_STATS, WEAPON_ORDER } from '../game/items/WeaponConfig';

interface GameHUDProps {
    hp: number;
    maxHp: number;
    currentWeapon: WeaponType;
    ammo: number;
    maxAmmo: number;
    isReloading: boolean;
    onWeaponSelect: (weapon: WeaponType) => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
    hp,
    maxHp,
    currentWeapon,
    ammo,
    maxAmmo,
    isReloading,
    onWeaponSelect,
}) => {
    const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
    const weaponStats = WEAPON_STATS[currentWeapon];

    const getHpColor = () => {
        if (hpPercent > 60) return '#00ff00';
        if (hpPercent > 30) return '#ffff00';
        return '#ff0000';
    };

    return (
        <div style={styles.container}>
            {/* HP Bar - Top Left */}
            <div style={styles.topLeftGroup}>
                <div style={styles.hpContainer}>
                    <div style={styles.hpLabel}>HP</div>
                    <div style={styles.hpBarOuter}>
                        <div
                            style={{
                                ...styles.hpBarInner,
                                width: `${hpPercent}%`,
                                backgroundColor: getHpColor(),
                            }}
                        />
                    </div>
                    <div style={styles.hpText}>{Math.ceil(hp)} / {maxHp}</div>
                </div>

                {/* Ammo Display - Below HP */}
                {weaponStats.canShoot && (
                    <div style={styles.ammoContainer}>
                        {isReloading ? (
                            <div style={styles.reloadingText}>RELOADING...</div>
                        ) : (
                            <div style={styles.ammoText}>
                                <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{ammo}</span>
                                <span style={{ fontSize: '16px', color: '#888' }}> / {maxAmmo}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Weapon Selection - Bottom Center */}
            <div style={styles.weaponContainer}>
                {WEAPON_ORDER.map((weapon, index) => {
                    const stats = WEAPON_STATS[weapon];
                    const isSelected = weapon === currentWeapon;
                    return (
                        <div
                            key={weapon}
                            onClick={() => onWeaponSelect(weapon)}
                            style={{
                                ...styles.weaponSlot,
                                ...(isSelected ? styles.weaponSlotSelected : {}),
                            }}
                            title={`${stats.name} (${index + 1})`}
                        >
                            <div style={styles.weaponKey}>{index + 1}</div>
                            <div style={styles.weaponIcon}>{stats.icon}</div>
                            <div style={styles.weaponName}>{stats.name}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        fontFamily: "'Orbitron', 'Segoe UI', sans-serif",
        zIndex: 100,
    },
    topLeftGroup: {
        position: 'absolute',
        top: 20,
        left: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
    },
    // HP Bar styles
    hpContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
    },
    hpLabel: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
        textShadow: '0 0 5px rgba(0,0,0,0.8)',
    },
    hpBarOuter: {
        width: 200,
        height: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    hpBarInner: {
        height: '100%',
        transition: 'width 0.2s ease, background-color 0.3s ease',
        boxShadow: '0 0 10px currentColor',
    },
    hpText: {
        color: '#ffffff',
        fontSize: 14,
        textShadow: '0 0 5px rgba(0,0,0,0.8)',
        minWidth: 70,
    },
    // Ammo display styles - Moved under HP
    ammoContainer: {
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 35, // Align with bar roughly
    },
    ammoText: {
        color: '#fff',
        textShadow: '0 0 5px #000',
    },
    reloadingText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffaa00',
        animation: 'pulse 0.5s infinite',
        textShadow: '0 0 10px rgba(255, 170, 0, 0.5)',
    },
    // Weapon selection styles
    weaponContainer: {
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 8,
        pointerEvents: 'auto',
    },
    weaponSlot: {
        width: 70,
        height: 70,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        border: '2px solid rgba(255, 255, 255, 0.2)',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        position: 'relative',
    },
    weaponSlotSelected: {
        backgroundColor: 'rgba(100, 200, 255, 0.3)',
        border: '2px solid rgba(100, 200, 255, 0.8)',
        boxShadow: '0 0 15px rgba(100, 200, 255, 0.5)',
        transform: 'scale(1.1)',
    },
    weaponKey: {
        position: 'absolute',
        top: 4,
        left: 6,
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: 'bold',
    },
    weaponIcon: {
        fontSize: 24,
        marginBottom: 2,
    },
    weaponName: {
        fontSize: 9,
        color: 'rgba(255, 255, 255, 0.8)',
        textTransform: 'uppercase',
    },

    reloadingText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffaa00',
        animation: 'pulse 0.5s infinite',
        textShadow: '0 0 10px rgba(255, 170, 0, 0.5)',
    },
};

export default GameHUD;
