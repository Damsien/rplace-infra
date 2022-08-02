import { Entity, Schema } from "redis-om";


export class Game extends Entity {

    name: string;

    user: string;

    startSchedule: Date;

    stopSchedule: Date;

    width: number;

    // In seconds
    timer: number;

    isOperationReady: boolean;

    isMapReady: boolean;

    private colors: string[];

    setColors(colors: string[]) {
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

    getHexFromName(name: string) {
        for (let color of this.colors) {
            if(color.split(':')[0] == name) {
                return color.split(':')[1];
            }
        }
    }

}

export const game_schema = new Schema(Game, {

    name: {type: 'string'},

    user: {type: 'string'},

    startSchedule: {type: 'date'},

    stopSchedule: {type: 'date'},

    width: {type: 'number'},

    timer: {type: 'number'},

    colors: {type: 'string[]'},

    isOperationReady: {type: 'boolean'},

    isMapReady: {type: 'boolean'}

});