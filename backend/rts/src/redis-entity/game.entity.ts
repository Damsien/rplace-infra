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

    // ["STEP_ONE:200", "STEP_TWO:500", "STEP_THREE:800", "STEP_FOUR:1000"]
    private steps: string[];

    setSteps(steps: string[]) {
        this.steps = steps;
    }

    getStepsMap() {
        return this.steps;
    }

    getStepsName() {
        let steps = [];
        for (let step of this.steps) {
            steps.push(step.split(':')[0]);
        }
        return steps;
    }

    getStepsPoints() {
        let steps = [];
        for (let step of this.steps) {
            steps.push(step.split(':')[1]);
        }
        return steps;
    }

    getPointsFromSteps(name: string) {
        for (let step of this.steps) {
            if(step.split(':')[0] == name) {
                return step.split(':')[1];
            }
        }
    }

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

    steps: {type: 'string[]'},

    colors: {type: 'string[]'},

    isOperationReady: {type: 'boolean'},

    isMapReady: {type: 'boolean'}

});