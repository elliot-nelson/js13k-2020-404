'use strict';

import { Sprite } from './Sprite';
import { Canvas } from './Canvas';

const C_WIDTH = 3;
const C_HEIGHT = 5;

// Very simple variable-width font implementation. The characters in the font strip
// are left-aligned in their 3x5 pixel boxes, so in order to have variable width,
// we just need to note the characters that AREN'T full width. Anything not in
// this list has full shift (3+1 = 4 pixels).
const C_SHIFT = {
    10: 0,          // LF (\n)
    32: 3,          // Space ( )
    33: 3,          // Bang (!)
    39: 2,          // Apostrophe (')
    44: 3,          // Comma (,)
    46: 3,          // Period (.)
    73: 2           // I
};

const C_ICONS = {};

/**
 * Text
 *
 * Utilities for drawing text using in-game pixel font.
 */
export const Text = {
    async init() {
        this.default = Sprite.font.img;

        let icons = [
            [108, Sprite.icon_mouse_lmb],
            [114, Sprite.icon_mouse_rmb],
            [119, Sprite.icon_keys_w],
            [97, Sprite.icon_keys_a],
            [115, Sprite.icon_keys_s],
            [100, Sprite.icon_keys_d]
        ];
        for (let icon of icons) {
            C_ICONS[icon[0]] = icon[1];
            C_SHIFT[icon[0]] = icon[1].img.width + 1;
        }

        this.black = this.recolor(this.default, 'rgba(0, 0, 0, 1)');
        this.black_shadow = this.recolor(this.default, 'rgba(90, 20, 90, 0.15)');
        this.fire = this.recolor(this.default, ctx => {
            let gradient = ctx.createLinearGradient(0, 0, 0, this.default.height);
            gradient.addColorStop(0, 'rgba(240,134,51,1)');
            gradient.addColorStop(1, 'rgba(250,220,74,1)');
            return gradient;
        });
        this.shadow = this.recolor(this.default, 'rgba(240, 240, 255, 0.25)');
    },

    drawText(ctx, text, u, v, scale = 1, font = this.default, shadow) {
        for (let idx = 0; idx < text.length; idx++) {
            let c = text.charCodeAt(idx);
            if (C_ICONS[c]) {
                ctx.drawImage(C_ICONS[c].img, u, v - (C_ICONS[c].img.height - 5) / 2);
            } else {
                if (shadow) {
                    ctx.drawImage(
                        shadow,
                        (c - 32) * (C_WIDTH + 1), 0, C_WIDTH, C_HEIGHT,
                        u + 1, v + 1, C_WIDTH * scale, C_HEIGHT * scale
                    );
                }
                ctx.drawImage(
                    font,
                    (c - 32) * (C_WIDTH + 1), 0, C_WIDTH, C_HEIGHT,
                    u, v, C_WIDTH * scale, C_HEIGHT * scale
                );
            }
            u += (C_SHIFT[c] || (C_WIDTH + 1)) * scale;
        }
    },

    drawRightText(ctx, text, u, v, scale = 1, font = this.default, shadow) {
        u -= this.measureWidth(text, scale);
        this.drawText(ctx, text, u, v, scale, font, shadow);
    },

    drawParagraph(ctx, text, u, v, w, h, scale = 1, font = this.default, shadow) {
        let cu = u, cv = v, phrases = text.split(' ');

        for (let phrase of phrases) {
            while (phrase[0] === '\n') {
                phrase = phrase.slice(1);
                cu = u;
                cv += (C_HEIGHT + 2) * scale;
            }
            let phraseWidth = this.measureWidth(phrase, scale);
            if (cu + phraseWidth - u > w) {
                cu = u;
                cv += (C_HEIGHT + 2) * scale;
            }
            this.drawText(ctx, phrase, cu, cv, scale, font, shadow);
            cu += phraseWidth + (C_SHIFT[32] || 4);
        }
    },

    measureWidth(text, scale) {
        return text.split('').reduce((sum, c) => sum + (C_SHIFT[c.charCodeAt(0)] || 4), 0) * scale;
    },

    recolor(font, color) {
        let canvas = new Canvas(font.width, font.height);
        canvas.ctx.fillStyle = typeof color === "function" ? color(canvas.ctx) : color;
        canvas.ctx.fillRect(0, 0, font.width, font.height);
        console.log(font.width, font.height, color, canvas);
        canvas.ctx.globalCompositeOperation = 'destination-in';
        canvas.ctx.drawImage(font, 0, 0);
        return canvas.canvas;
    },
};
