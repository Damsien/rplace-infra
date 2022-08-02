"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.game_schema = exports.Game = void 0;
const redis_om_1 = require("redis-om");
class Game extends redis_om_1.Entity {
    setColors(colors) {
        this.colors = colors;
    }
    getColorsMap() {
        return this.colors;
    }
    getColorsName() {
        let colors = [];
        for (let color of this.colors) {
            colors.push(color.split(':')[0]);
        }
        return colors;
    }
    getColorsHex() {
        let colors = [];
        for (let color of this.colors) {
            colors.push(color.split(':')[1]);
        }
        return colors;
    }
    getHexFromName(name) {
        for (let color of this.colors) {
            if (color.split(':')[0] == name) {
                return color.split(':')[1];
            }
        }
    }
}
exports.Game = Game;
exports.game_schema = new redis_om_1.Schema(Game, {
    name: { type: 'string' },
    user: { type: 'string' },
    startSchedule: { type: 'date' },
    stopSchedule: { type: 'date' },
    width: { type: 'number' },
    timer: { type: 'number' },
    colors: { type: 'string[]' },
    isOperationReady: { type: 'boolean' },
    isMapReady: { type: 'boolean' }
});
