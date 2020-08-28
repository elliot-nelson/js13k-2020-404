'use strict';

export const Constants = {
    R0: 0,
    R20: Math.PI  *  20 / 180,
    R70: Math.PI  *  70 / 180,
    R90: Math.PI  *  90 / 180,
    R180: Math.PI * 180 / 180,
    R270: Math.PI * 270 / 180,
    R360: Math.PI * 360 / 180,

    // Size in pixels of tiles in the game maze
    TILE_WIDTH: 32,
    TILE_HEIGHT: 32,

    // Tile constants
    TILE_FLOOR1:            0,
    TILE_FLOOR2:            1,
    TILE_WALL1:             2,
    TILE_WALL2:             3,

    // Wall bits, for rendering wall edges
    WALL_TOP:      0b0000_1000,
    WALL_RIGHT:    0b0000_0100,
    WALL_BOTTOM:   0b0000_0010,
    WALL_LEFT:     0b0000_0001,

    // Room openings into rooms from corridors
    OPEN_TOP:      0b1000_0000,
    OPEN_RIGHT:    0b0100_0000,
    OPEN_BOTTOM:   0b0010_0000,
    OPEN_LEFT:     0b0001_0000,

    PLAYER_BOUND_RADIUS: 9,

    DIALOG_START_A: 1,
    DIALOG_START_B: 2,
    DIALOG_HINT_1:  3,
    DIALOG_HINT_2:  4,
    DIALOG_HINT_3:  5
};
