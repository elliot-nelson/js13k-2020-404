'use strict';

import { Constants as C } from './Constants';
import { Canvas } from './Canvas';
import { SpriteSheet } from './SpriteSheet-gen';

// The spritesheet is produced during the gulp build
const SPRITESHEET_URI = 'sprites.png';

/**
 * Sprites!
 *
 * For this game, a "sprite" is a little object that has an attached image, an anchor
 * point, a bounding box, and an optional hit box. This keeps pixel-level data about
 * the image all in one place (by passing a Sprite around, we know what image to draw,
 * what point in the image to rotate around, what areas of the image can get hit by
 * things, and what areas can hit other things).
 *
 * Whether the bounding box or hitbox do anything isn't up to the Sprite, it would be
 * up to the Frame that references it. (This is helpful because it's convenient for
 * a simple game like this to have only one hit frame, but the animation may call
 * for showing the sword swipe for 5-6 frames.)
 */
export const Sprite = {
  async init() {
    this.images = {};
    await this.loadImage(SPRITESHEET_URI);

    // Base Pixel Font (see `Text.init` for additional manipulation)
    Sprite.font = this.initBasicSprite(SpriteSheet.font[0]);

    // Player
    Sprite.player = [
      this.initBasicSprite(SpriteSheet.player2[0], { anchor: { x: 10, y: 21 } }),
      this.initBasicSprite(SpriteSheet.player2[1], { anchor: { x: 10, y: 21 } })
    ];
    Sprite.player_recoil = this.initBasicSprite(SpriteSheet.player2[2], { anchor: { x: 10, y: 21 } });

    Sprite.shotgun_blast = SpriteSheet.shotgun_blast.map(data =>
      this.initBasicSprite(data, { anchor: { x: 12, y: 41 } })
    );

    Sprite.shot_particle = this.initBasicSprite(SpriteSheet.shot_particle[0]);

    // Bullets
    Sprite.bullet = this.initBasicSprite(SpriteSheet.bullet[0]);

    // Enemy
    Sprite.monster = this.initBasicSprite(SpriteSheet.monster2[0]);
    Sprite.monster_dead = this.initBasicSprite(SpriteSheet.monster2[0]);

    // GUI
    Sprite.hud_shells_empty = this.initBasicSprite(SpriteSheet.hud_shells[0]);
    Sprite.hud_shells_full = this.initBasicSprite(SpriteSheet.hud_shells[1]);
    Sprite.hud_health_frame = this.initBasicSprite(SpriteSheet.hud_healthbar[0]);
    Sprite.hud_health_fill = this.initBasicSprite(SpriteSheet.hud_healthbar[1]);
    Sprite.hud_health_chunk = this.initBasicSprite(SpriteSheet.hud_healthbar[2]);
    Sprite.hud_crosshair = this.initBasicSprite(SpriteSheet.hud_crosshair[0]);
    Sprite.hud_crosshair_wait = this.initBasicSprite(SpriteSheet.hud_crosshair[1]);

    Sprite.icon_mouse_lmb = this.initBasicSprite(SpriteSheet.icon_mouse[0]);
    Sprite.icon_mouse_rmb = this.initBasicSprite(SpriteSheet.icon_mouse[1]);
    Sprite.icon_keys_w = this.initBasicSprite(SpriteSheet.icon_keys[0]);
    Sprite.icon_keys_a = this.initBasicSprite(SpriteSheet.icon_keys[1]);
    Sprite.icon_keys_s = this.initBasicSprite(SpriteSheet.icon_keys[2]);
    Sprite.icon_keys_d = this.initBasicSprite(SpriteSheet.icon_keys[3]);

    Sprite.sawblade = this.initBasicSprite(SpriteSheet.sawblade[0]);
    Sprite.sawblade_eyes = this.initBasicSprite(SpriteSheet.sawblade[1]);

    // Pages
    Sprite.page = this.initBasicSprite(SpriteSheet.page[1]);
    Sprite.page_glow = this.initBasicSprite(SpriteSheet.page[2]);

    Sprite.battle_stream = SpriteSheet.battle_stream.map(data => this.initBasicSprite(data));
    Sprite.battle_spray = SpriteSheet.walls2.slice(4, 7).map(data => this.initBasicSprite(data));
    Sprite.battle_door = SpriteSheet.walls2.slice(1, 4).map(data => this.initBasicSprite(data));

    // Tiles
    Sprite.tiles = [];
    Sprite.tiles[C.TILE_FLOOR1] = this.initBasicSprite(SpriteSheet.tileset[2]);
    Sprite.tiles[C.TILE_WALL1] = this.initBasicSprite(SpriteSheet.tileset[0]);
    Sprite.tiles[C.TILE_WALL2] = this.initBasicSprite(SpriteSheet.tileset[1]);

    // Walls
    Sprite.walls = this.initBasicSprite(SpriteSheet.walls2[0]);

    // Dialog
    //Sprite.dialog_speech = this.initBasicSprite(SpriteSheet.dialog[0]);
    //Sprite.dialog_hint = this.initBasicSprite(SpriteSheet.dialog[1]);
    Sprite.dialog_speech = this.initDynamicSprite(this.createDialogSpeech());
    Sprite.dialog_hint = this.initDynamicSprite(this.createDialogHint());

    Sprite.battle_bg = this.initDynamicSprite(this.createBattleBackground());
  },

  /**
   * Initialize a sprite by loading it from a particular slice of the given image. Provides
   * "sensible" defaults for bounding box and anchor point if not provided.
   */
  initBasicSprite(data, opts) {
    return this.initDynamicSprite(this.loadCacheSlice(SPRITESHEET_URI, data.x, data.y, data.w, data.h), opts);
  },

  rotateImage(source, rad) {
    let canvas = new Canvas(source.width, source.height);
    canvas.ctx.translate(source.width / 2, source.height / 2);
    canvas.ctx.rotate(rad);
    canvas.ctx.translate(-source.width / 2, -source.height / 2);
    canvas.ctx.drawImage(source, 0, 0);
    return canvas.canvas;
  },

  overlay(...sources) {
    let canvas = new Canvas(sources[0].width, sources[0].height);
    for (let source of sources) {
      canvas.ctx.drawImage(source, 0, 0);
    }
    return canvas.canvas;
  },

  /**
   * Initialize a sprite by passing it a pre-defined image source (probably generated dynamically).
   * Provides "sensible" defaults for bounding box and anchor point if not provided.
   */
  initDynamicSprite(source, opts) {
    let w = source.width, h = source.height;

    return {
      img: source,
      anchor: (opts && opts.anchor) || { x: Math.floor(w / 2), y: Math.floor(h / 2) },
    };
  },

  /**
   * This helper method retrieves a cached image, cuts the specified slice out of it, and returns it.
   */
  loadCacheSlice(uri, x, y, w, h) {
    //const source = await this.loadImage(uri);
    const source = this.images[uri];
    const sliceCanvas = new Canvas(w, h);
    sliceCanvas.ctx.drawImage(source, x, y, w, h, 0, 0, w, h);
    return sliceCanvas.canvas;
  },

  /**
   * Load the image from the given URI and cache it.
   */
  async loadImage(uri) {
    if (this.images[uri]) return this.images[uri];

    return await new Promise((resolve, reject) => {
      let image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (err) => reject(err);
      image.src = uri;
      this.images[uri] = image;
    });
  },

  createBattleBackground() {
    let canvas = new Canvas(500, 300);
    let gradient = canvas.ctx.createLinearGradient(0, 0, 0, 270);
    gradient.addColorStop(0, 'rgba(128,20,20,1)');
    gradient.addColorStop(1, 'rgba(191,31,31,1)');
    canvas.ctx.fillStyle = gradient;
    canvas.ctx.fillRect(0, 0, 500, 300);
    for (let i = 0; i < 500; i++) {
      canvas.ctx.clearRect(i, 299 - Math.random() * 20, 3, 30);
    }
    return canvas.canvas;
  },

  createDialogSpeech() {
    let canvas = new Canvas(127, 39);
    canvas.ctx.fillStyle = '#e6e6b8';
    canvas.ctx.fillRect(12, 1, 110, 37);
    canvas.ctx.fillRect(10, 2, 114, 35);
    canvas.ctx.fillRect(9, 3, 116, 34);
    canvas.ctx.fillRect(8, 5, 118, 29);
    return canvas.canvas;
  },

  createDialogHint() {
    let canvas = new Canvas(127, 39);
    canvas.ctx.fillStyle = '#000000';
    canvas.ctx.fillRect(0, 0, 120, 35);
    canvas.ctx.fillStyle = '#e6e6b8';
    canvas.ctx.fillRect(1, 1, 118, 33);
    return canvas.canvas;
  },

  /**
   * A small helper that draws a sprite onto a canvas, respecting the anchor point of
   * the sprite. Note that the canvas should be PRE-TRANSLATED and PRE-ROTATED, if
   * that's appropriate!
   */
  drawSprite(ctx, sprite, u, v) {
    ctx.drawImage(sprite.img, u - sprite.anchor.x, v - sprite.anchor.y);
  },

  drawViewportSprite(viewport, sprite, spritePos, cameraPos, rotation) {
    let { u, v } = this.viewportSprite2uv(viewport, sprite, spritePos, cameraPos);
    if (rotation) {
      viewport.ctx.save();
      viewport.ctx.translate(u + sprite.anchor.x, v + sprite.anchor.y);
      viewport.ctx.rotate(rotation);
      viewport.ctx.drawImage(sprite.img, -sprite.anchor.x, -sprite.anchor.y);
      viewport.ctx.restore();
    } else {
      viewport.ctx.drawImage(sprite.img, u, v);
    }
  },

  viewportSprite2uv(viewport, sprite, spritePos, cameraPos) {
    return {
      u: spritePos.x - sprite.anchor.x - cameraPos.x + viewport.center.u,
      v: spritePos.y - sprite.anchor.y - cameraPos.y + viewport.center.v
    };
  }
};
