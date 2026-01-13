// Game configuration constants
export const GAME_CONFIG = {
    // World settings
    WORLD_WIDTH: 3000,
    WORLD_HEIGHT: 3000,
    TILE_SIZE: 64,

    // World Generation
    WALL_COUNT: 40,
    LAMP_COUNT: 12,
    WALL_MIN_SIZE: 100,
    WALL_MAX_SIZE: 400,

    // Player settings
    PLAYER_RADIUS: 20,
    PLAYER_SPEED: 4,
    PLAYER_HP: 100,

    // Mob settings
    MOB_COUNT: 15,
    MOB_RADIUS: 18,
    MOB_SPEED: 1.5,
    MOB_DIRECTION_CHANGE_INTERVAL: 2000,
    MOB_HP: 5,

    // Combat settings
    BULLET_SPEED: 15,
    BULLET_RADIUS: 3,
    BULLET_LIFETIME: 3000,
    FIRE_RATE: 120,

    // Server settings
    TICK_RATE: 60,
    TICK_INTERVAL: 1000 / 60,
};
