import "reflect-metadata";
import { Client, Repository } from "redis-om";
import 'dotenv/config'
import { exit } from "process";
import { PixelAnon } from "./pixel-anon.dto";
const clc = require("cli-color");

const client = new Client();

async function getJsonPixel(pxl: string) {

    const json = await client.jsonget(pxl);

    const pixel = new PixelAnon();
    pixel.coord_x = json['coord_x'];
    pixel.coord_y = json['coord_y'];
    pixel.color = json['color'];
    
    return pixel;
}

async function fetchMapRaw() {
    let pixels = new Array<PixelAnon>();

    let all;
    all = await client.execute([
        'KEYS', 'Pixel:*'
    ]);

    console.log(`Start fetching`);
    let per: string;
    for(let i=0; i<all.length; i++) {
        if (all[i] != 'Pixel:index:hash') {
            pixels.push(await getJsonPixel(all[i]));
            per = (((i)/all.length)*100).toFixed();
            process.stdout.write(`${i}/${all.length-1} pixels ${per}%\r`);
        }
    }

    return pixels;
}


async function updateRedisMap() {
    await client.open(process.env.REDIS_HOST);
    const json = JSON.stringify(await fetchMapRaw());
    const base64 = btoa(json);
    await client.execute([
      'SET', 'Map', base64
    ]);
    process.stdout.write(`\n\n`)
    console.log(clc.green('Operation done !'));
    exit(0);
}

updateRedisMap();


function exitHandler(options, exitCode) {
    if (exitCode || exitCode === 0) process.stdout.write(`\n\n`); console.log(exitCode);
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{exit:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {cleanup:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {cleanup:true}));
process.on('SIGUSR2', exitHandler.bind(null, {cleanup:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {cleanup:true}));