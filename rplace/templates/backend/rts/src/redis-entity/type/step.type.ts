
export enum StepType {
    STICKED_PIXEL = 'STICKED_PIXELS',
    BOMB = 'BOMB',
    GOLD_NAME = 'GOLD_NAME',
    TIMER = 'TIMER',
    COLOR = 'COLOR'
}

export type Step = {
    name: string;
    description: string;
    pixels: number;
    img: string;
    type: StepType,
    value: {}
};