import { Entity, Schema } from "redis-om";
import { Color } from "./type/color.type";
import { Step } from "./type/step.type";


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

    private steps: string;

    setSteps(steps: Step[]) {
        // const jsonSteps = {};
        // jsonSteps['steps'] = [];
        // for (let step of steps) {
        //     jsonSteps['steps'].push({
        //         "name": step.name,
        //         "description": step.description,
        //         "pixels": step.pixels,
        //         "img": step.img,
        //     });
        // }
        // this.steps = JSON.stringify(jsonSteps['steps']);
        this.steps = JSON.stringify(steps);
    }

    getSteps(): Step[] {
        return JSON.parse(this.steps);
    }

    getStepsName(): String[] {
        let steps = [];
        for (let step of this.getSteps()) {
            steps.push(step.name);
        }
        return steps;
    }

    getStepFromPoints(points: number): Step {
        return this.getSteps().find((el) => el.pixels == points);
    }

    getStepsPoints(): number[] {
        const steps = this.getSteps().sort(function(a: Step, b: Step) {
            let keyA = a.pixels;
            let keyB = b.pixels;
            if (keyA < keyB) return -1;
            if (keyA > keyB) return 1;
            return 0;
        });
        const nbSteps = [];
        for (let step of steps) {
            nbSteps.push(step);
        }
        return nbSteps;
    }

    getPointsFromSteps(name: string): number {
        for (let step of this.getSteps()) {
            if(step.name == name) {
                return step.pixels;
            }
        }
    }

    private colors: string;

    setColors(colors: Color[]) {
        this.colors = JSON.stringify(colors);
    }

    getColors(): Color[] {
        return JSON.parse(this.colors);
    }

    getColorsName() {
        let colors = [];
        for (let color of this.getColors()) {
            colors.push(color.name);
        }
        return colors;
    }

    getColorsHex() {
        let colors = [];
        for (let color of this.getColors()) {
            colors.push(color.hex);
        }
        return colors;
    }

    getHexFromName(name: string) {
        for (let color of this.getColors()) {
            if(color.name == name) {
                return color.hex;
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

    steps: {type: 'text'},

    colors: {type: 'text'},

    isOperationReady: {type: 'boolean'},

    isMapReady: {type: 'boolean'}

});