'use strict';

import { Constants as C } from './Constants'
import { game } from './Game';

/**
 * Geometry
 *
 * A horrible grab bag of math-related nonsense.
 */
export const Geometry = {
  RAD: (() => {
    let radianTable = [];
    for (let i = 0; i <= 360; i++) {
      radianTable[i] = Math.PI * 2 * i / 360;
    }
    return radianTable;
  })(),

  normalizeVector(p) {
    let m = Math.sqrt(p.x * p.x + p.y * p.y);
    return (m === 0) ? { x: 0, y: 0, m: 0 } : { x: p.x / m, y: p.y / m, m };
  },

  vectorBetween(p1, p2) {
    return Geometry.normalizeVector({ x: p2.x - p1.x, y: p2.y - p1.y });
  },

  angle2vector(r) {
    return { x: Math.cos(r), y: Math.sin(r), m: 1 };
  },

  vector2angle(v) {
    return Math.atan2(v.y, v.x);
  },

  xy2qr(pos) {
    return { q: (pos.x / C.TILE_WIDTH) | 0, r: (pos.y / C.TILE_HEIGHT) | 0 };
  },

  qr2xy(pos) {
    return { x: pos.q * C.TILE_WIDTH, y: pos.r * C.TILE_HEIGHT };
  },

  clamp(value, min, max) {
    return value < min ? min : (value > max ? max : value);
  },

  // The parameters to this function are (Q, Q) or (R, R) - i.e. horizontal or
  // vertical coordinates in tile space.
  calculateRayIntersectionAndStep(startPos, endPos) {
    let next, step, diff = endPos - startPos;

    if (diff === 0) {
        step = NaN;
        next = +Infinity;
    } else if (diff > 0) {
        step = 1 / diff;
        next = (1 - (startPos - Math.floor(startPos))) * step;
    } else {
        step = -1 / diff;
        next = (startPos - Math.floor(startPos)) * step;
    }

    return { next, step };
  },

  // https://www.genericgamedev.com/general/shooting-rays-through-tilemaps/
  *tilesHitBetween(p1, p2) {
    let startQ = p1.x / C.TILE_WIDTH, startR = p1.y / C.TILE_HEIGHT;
    let endQ = p2.x / C.TILE_WIDTH, endR = p2.y / C.TILE_HEIGHT;
    let tileCount = Math.abs(Math.floor(startQ) - Math.floor(endQ)) + Math.abs(Math.floor(startR) - Math.floor(endR));

    yield { q: startQ | 0, r: startR | 0, m: 0 };

    // If there's only 1 or 2 hit tiles, we don't need the math to compute the middle.
    if (tileCount > 1) {
      let q = startQ, r = startR, m = 0;
      let stepQ = Math.sign(endQ - startQ);
      let stepR = Math.sign(endR - startR);
      let intersectionQ = Geometry.calculateRayIntersectionAndStep(startQ, endQ);
      let intersectionR = Geometry.calculateRayIntersectionAndStep(startR, endR);

      for (let i = 0; i < tileCount - 1; i++) {
        if (intersectionQ.next < intersectionR.next) {
          q += stepQ;
          m += stepQ;
          intersectionQ.next += intersectionQ.step;
        } else {
          r += stepR;
          m += stepR;
          intersectionR.next += intersectionR.step;
        }
        yield { q: q | 0, r: r | 0, m };
      }
    }

    if (tileCount > 0) {
      yield { q: endQ | 0, r: endR | 0, m: 1 };
    }
  },

  *tilesHitBy(p, v) {
    yield *Geometry.tilesHitBetween(p, { x: p.x + v.x, y: p.y + v.y });
  },

  /**
   * @param {XY[]} bounds  the upper-left and lower-right bounds
   * @yields {QR}
   */
  *tilesHitInBounds(bounds) {
    for (let r = Math.floor(bounds[0].y / C.TILE_HEIGHT); r * C.TILE_HEIGHT < bounds[1].y; r++) {
      for (let q = Math.floor(bounds[0].x / C.TILE_WIDTH); q * C.TILE_WIDTH < bounds[1].x; q++) {
        yield { q, r };
      }
    }
  },

  /**
   * @param {XY} p1  the starting position
   * @param {XY} p2  the ending position
   * @param {number} r  the radius of the moving circle
   * @yields {QR}
   */
  *tilesHitBetweenCircle(p1, p2, r) {
    let bounds = [
      { x: Math.min(p1.x, p2.x) - r, y: Math.min(p1.y, p2.y) - r },
      { x: Math.max(p1.x, p2.x) + r, y: Math.max(p1.y, p2.y) + r }
    ];
    yield *Geometry.tilesHitInBounds(bounds);
  },

  /**
   * @param {XY} p  the starting position
   * @param {XY} v  the velocity (movement)
   * @param {number} r  the radius of the moving circle
   * @yields {QR}
   */
  *tilesHitByCircle(p, v, r) {
    yield *Geometry.tilesHitBetweenCircle(p, { x: p.x + v.x, y: p.y + v.y }, r);
  },

  // https://stackoverflow.com/a/18790389/80630
  intersectCircleRectangle(p1, p2, r, bounds) {
    // If the bounding box around the start and end points (+radius on all
    // sides) does not intersect with the rectangle, definitely not an
    // intersection
    if (Math.max(p1.x, p2.x) + r < bounds[0].x ||
        Math.min(p1.x, p2.x) - r > bounds[1].x ||
        Math.max(p1.y, p2.y) + r < bounds[0].y ||
        Math.min(p1.y, p2.y) - r > bounds[1].y)
      return;

    let dx = p2.x - p1.x;
    let dy = p2.y - p1.y;
    let invdx = (dx === 0 ? 0 : 1 / dx);
    let invdy = (dy === 0 ? 0 : 1 / dy);
    let cornerX = Infinity;
    let cornerY = Infinity;

    // Check each side of the rectangle for a single-side intersection
    // Left Side
    if (p1.x - r < bounds[0].x && p2.x + r > bounds[0].x) {
      let ltime = ((bounds[0].x - r) - p1.x) * invdx;
      if (ltime >= 0 && ltime <= 1) {
        let ly = dy * ltime + p1.y;
        if (ly >= bounds[0].y && ly <= bounds[1].y) {
          return { x: dx * ltime + p1.x, y: ly, t: ltime, nx: -1, ny: 0, ix: bounds[0].x, iy: ly };
        }
      }
      cornerX = bounds[0].x;
    }
    // Right Side
    if (p1.x + r > bounds[1].x && p2.x - r < bounds[1].x) {
      let rtime = (p1.x - (bounds[1].x + r)) * -invdx;
      if (rtime >= 0 && rtime <= 1) {
        let ry = dy * rtime + p2.y;
        if (ry >= bounds[0].y && ry <= bounds[1].y) {
          return { x: dx * rtime + p1.x, y: ry, t: rtime, nx: 1, ny: 0, ix: bounds[1].x, iy: ry };
        }
      }
      cornerX = bounds[1].x;
    }
    // Top Side
    if (p1.y - r < bounds[0].y && p2.y + r > bounds[0].y) {
      let ttime = ((bounds[0].y - r) - p1.y) * invdy;
      if (ttime >= 0 && ttime <= 1) {
        let tx = dx * ttime + p1.x;
        if (tx >= bounds[0].x && tx <= bounds[1].x) {
          return { x: tx, y: dy * ttime + p1.y, t: ttime, nx: 0, ny: -1, ix: tx, iy: bounds[0].y };
        }
      }
      cornerY = bounds[0].y;
    }
    // Bottom Side
    if (p1.y + r > bounds[1].y && p2.y - r < bounds[1].y) {
      let btime = (p1.y - (bounds[1].y + r)) * -invdy;
      if (btime >= 0 && btime <= 1) {
        let bx = dx * btime + p1.x;
        if (bx >= bounds[0].x && bx <= bounds[1].x) {
          return { x: bx, y: dy * btime + p1.y, t: btime, nx: 0, ny: 1, ix: bx, iy: bounds[0].y };
        }
      }
      cornerY = bounds[1].y;
    }

    // If we haven't touched anything, there is no collision
    if (cornerX === Infinity && cornerY === Infinity) return;

    // We didn't pass through a side but may be hitting the corner
    if (cornerX !== Infinity && cornerY === Infinity) {
      cornerY = dy > 0 ? bounds[1].y : bounds[0].y;
    }
    if (cornerY !== Infinity && cornerX === Infinity) {
      cornerX = dx > 0 ? bounds[1].x : bounds[0].x;
    }

    /* Solve the triangle between the start, corner, and intersection point.
     *
     *           +-----------T-----------+
     *           |                       |
     *          L|                       |R
     *           |                       |
     *           C-----------B-----------+
     *          / \
     *         /   \r     _.-E
     *        /     \ _.-'
     *       /    _.-I
     *      / _.-'
     *     S-'
     *
     * S = start of circle's path
     * E = end of circle's path
     * LTRB = sides of the rectangle
     * I = {ix, iY} = point at which the circle intersects with the rectangle
     * C = corner of intersection (and collision point)
     * C=>I (r) = {nx, ny} = radius and intersection normal
     * S=>C = cornerdist
     * S=>I = intersectionDistance
     * S=>E = lineLength
     * <S = innerAngle
     * <I = angle1
     * <C = angle2
     */
    let inverseRadius = 1 / r;
    let lineLength = Math.sqrt(dx * dx + dy * dy);
    let cornerdx = cornerX - p1.x;
    let cornerdy = cornerY - p1.y;
    let cornerDistance = Math.sqrt(cornerdx * cornerdx + cornerdy * cornerdy);
    let innerAngle = Math.acos((cornerdx * dx + cornerdy * dy) / (lineLength * cornerDistance));

    // If the circle is too close, no intersection
    if (cornerDistance < r) return;

    // If inner angle is zero, it's going to hit the corner straight on.
    if (innerAngle === 0) {
      let time = (cornerDistance - r) / lineLength;

        // Ignore if time is outside boundaries of (p1, p2)
        if (time > 1 || time < 0) return;

        let ix = time * dx + p1.x;
        let iy = time * dy + p1.y;
        let nx = cornerdx / cornerDistance;
        let ny = cornerdy / cornerDistance;

        return isNaN(ix) ? undefined : { x: ix, y: iy, t: time, nx, ny, ix: cornerX, iy: cornerY };
    }

    let innerAngleSin = Math.sin(innerAngle);
    let angle1Sin = innerAngleSin * cornerDistance * inverseRadius;

    // If the angle is too large, there is no collision
    if (Math.abs(angle1Sin) > 1) return;

    let angle1 = Math.PI - Math.asin(angle1Sin);
    let angle2 = Math.PI - innerAngle - angle1;
    let intersectionDistance = r * Math.sin(angle2) / innerAngleSin;
    let time = intersectionDistance / lineLength;

    // Ignore if time is outside boundaries of (p1, p2)
    if (time > 1 || time < 0) return;

    let ix = time * dx + p1.x;
    let iy = time * dy + p2.y;
    let nx = (ix - cornerX) * inverseRadius;
    let ny = (iy - cornerY) * inverseRadius;

    return isNaN(ix) ? undefined : { x: ix, y: iy, t: time, nx, ny, ix: cornerX, iy: cornerY };
  },

  flood(maze, pos) {
    let result = Geometry.array2d(maze[0].length, maze.length, 100);
    console.log(result[0][0]);
    let stack = [{ ...pos, cost: 0 }];
    while (stack.length > 0) {
      let { q, r, cost } = stack.shift();
      if (result[r][q] <= cost) continue;
      result[r][q] = cost++;
      if (maze[r][q + 1] && result[r][q + 1] > cost) stack.push({ q: q + 1, r, cost });
      if (maze[r][q - 1] && result[r][q - 1] > cost) stack.push({ q: q - 1, r, cost });
      if (maze[r + 1][q] && result[r + 1][q] > cost) stack.push({ q, r: r + 1, cost });
      if (maze[r - 1][q] && result[r - 1][q] > cost) stack.push({ q, r: r - 1, cost });
    }
    console.log(["---", result, "---"]);
    return result;
  },

  array2d(width, height, value) {
    let fn = typeof value === 'function' ? value : () => value;
    return Array.from({ length: height }, () => Array.from({ length: width }, fn));
  },

  tileIsPassable(q, r) {
    return game.maze.maze[r][q];
  }
};
