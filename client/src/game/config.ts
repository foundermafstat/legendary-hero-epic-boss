// Game constants and configuration

export const GAME_CONFIG = {
    // World settings
    WORLD_WIDTH: 3000,
    WORLD_HEIGHT: 3000,
    TILE_SIZE: 64,

    // Player settings
    PLAYER_RADIUS: 20,
    PLAYER_SPEED: 4,
    PLAYER_COLOR: 0x4a90d9,

    // Mob settings
    MOB_COUNT: 15,
    MOB_RADIUS: 18,
    MOB_SPEED: 1.5,
    MOB_COLOR: 0xd94a4a,
    MOB_DIRECTION_CHANGE_INTERVAL: 2000, // ms

    // Wall settings
    WALL_COUNT: 40,
    WALL_MIN_SIZE: 60,
    WALL_MAX_SIZE: 200,
    WALL_COLOR: 0x555555,

    // Lighting settings
    FLASHLIGHT_RANGE: 350,
    FLASHLIGHT_ANGLE: Math.PI / 4, // 45 degrees half-angle
    FLASHLIGHT_COLOR: 0xfffae6,

    LAMP_COUNT: 12,
    LAMP_RANGE: 200,
    LAMP_COLOR: 0xffcc66,

    FOG_COLOR: 0x000000,
    FOG_ALPHA: 0.95,

    // Floor settings
    FLOOR_COLOR: 0x2a2a2a,
    GRID_COLOR: 0x333333,
};
