import "reflect-metadata";
import { Client, Repository } from "redis-om";
import { DataSource } from "typeorm";
import { Game, game_schema } from "./redis-entity/game.entity";
import { PixelEntity } from "./sql-entity/pixel.entity";
import { PixelHistoryEntity } from "./sql-entity/pixel-history.entity";
import { UserEntity } from "./sql-entity/user.entity";
import 'dotenv/config'
import { exit } from "process";
const clc = require("cli-color");
var cron = require('node-cron');

// const startDate = new Date();

const client = new Client();
client.open(`redis://rplace:${process.env.REDIS_PASSWORD}@redis:6379`);
let gameRepo: Repository<Game>;

const AppDataSource = new DataSource({
    type: 'mariadb',
    host: process.env.MARIADB_HOST,
    port: parseInt(process.env.DATABASE_PORT),
    username: process.env.MARIADB_USER,
    password: process.env.MARIADB_PASSWORD,
    database: process.env.MARIADB_DATABASE,
    entities: [PixelHistoryEntity, PixelEntity, UserEntity],
    synchronize: false,
});

main();

async function main() {
    await AppDataSource.initialize();
    console.log(clc.green('Database connexion done!'));
    await cron.schedule(`*/${process.env['TIMER']} * * * * *`, () => {
    
        pushOnMySQL();
    
    });
}

async function delStreams() {
    let streams;
    streams = await client.execute([
        'KEYS', 'PixelHistory:*'
    ]);

    for(let stream of streams) {
        let loop = true;
        while (loop) {
            try {
                await client.execute([
                    'DEL', stream
                ]);
                loop = false;
            } catch (err) {
                loop = true;
            }
        }
    }
}

async function getSinglePixelStream(pixelStream): Promise<Array<PixelHistoryEntity>> {
    let stream;
    stream = await client.execute([
        'XRANGE', pixelStream,
        '-', '+'
    ]);

    const history = new Array<PixelHistoryEntity>();

    for(let i=0; i<stream.length; i++) {
        const pixelHistoryRedis = stream[i][1];
        const pixelHistory = new PixelHistoryEntity();
        pixelHistory.pixelId = (await AppDataSource.manager.findOne(PixelEntity, {where: {coord_x: pixelHistoryRedis[1], coord_y: pixelHistoryRedis[3]}})).pixelId;
        pixelHistory.date = new Date(pixelHistoryRedis[9]);
        pixelHistory.userId = pixelHistoryRedis[7];
        pixelHistory.color = pixelHistoryRedis[5];
        pixelHistory.isSticked = pixelHistoryRedis[9] == true ? 1 : 0;
        history.push(pixelHistory);
    }

    return history;
}

async function getPixels(): Promise<Array<PixelHistoryEntity[]>> {

    let pixelHistory = new Array<PixelHistoryEntity[]>();

    let streams;
    streams = await client.execute([
        'KEYS', 'PixelHistory:*'
    ]);

    let per: string;
    console.log(`Number of pixels to be retrieved : `+clc.magenta(`${streams.length}`));
    for(let i=0; i<streams.length; i++) {
        pixelHistory.push(await getSinglePixelStream(streams[i]));
        per = (((i+1)/streams.length)*100).toFixed();
        process.stdout.write(`${i+1}/${streams.length} pixels ${per}%\r`);
    }
    process.stdout.write(`\n\n`);

    return pixelHistory;
}

async function pushOnMySQL() {
    console.log('Pushing redis history into the SQL database...');

    try {


        gameRepo = await client.fetchRepository(game_schema);
        const game: Game = await gameRepo.search().where('name').eq('Game').return.first();
        const isOperationReady = game.isOperationReady;
        console.log(clc.green(`Game found.`)+clc.white(` Is another operation in progress ? `)+clc.magenta(`${!isOperationReady}`));

        if (isOperationReady) {

            game.isOperationReady = false;
            let loop = true;
            while (loop) {
                try {
                    await gameRepo.save(game);
                    loop = false
                } catch (err) {
                    loop = true;
                }
            }
            console.log('Start operation');

            const qRunner = AppDataSource.createQueryRunner();
            await qRunner.connect();
            await qRunner.startTransaction();
        
            console.log('Get all pixels history from Redis');
            const pixels = await getPixels();
            console.log(`Number of pixels retrieved : `+clc.magenta(`${pixels.length}`));
            await new Promise(r => setTimeout(r, 1000));

            try {
                let per: string;
                console.log('Save in the SQL database');
        
                for(let i=0; i<pixels.length; i++) {
                    for(let j=0; j<pixels[i].length; j++) {
                        const pixel: PixelHistoryEntity = pixels[i][j];
            
                        await qRunner.manager.save(pixel);

                        per = (((i+1)/pixels.length)*100).toFixed();
                        process.stdout.write(`${i+1} ${per}%\r`);
                    }
                }
                process.stdout.write(`\n\n`)
            
                await qRunner.commitTransaction();
        
                console.log('Delete old pixels from the Redis database');
                await delStreams();

                game.isOperationReady = true;
                if (pixels.length > 0) game.isMapReady = true;
                await gameRepo.save(game);
                
                // const stopTimer = new Date((new Date()).getTime()-startDate.getTime());
                // console.log(clc.green('Operation done in ')+stopTimer.getSeconds()+clc.green(' seconds!'));
                console.log(clc.green('Operation done !'));
            } catch (err) {
                console.error(err);
                // since we have errors lets rollback the changes we made
                await qRunner.rollbackTransaction();
                await delStreams();
                await gameRepo.save(game);
            } finally {
                // you need to release a queryRunner which was manually instantiated
                await qRunner.release();
            }

            // exit(0);

        } else {
            console.log(clc.red('Abort'));
        }


    } catch (err) {
        console.log(clc.red('Game not initialized'));
        console.log(err);
        console.log(clc.red('Abort'));
    }

    const game = await gameRepo.search().where('name').eq('Game').return.first()
    game.isOperationReady = true;
    await gameRepo.save(game)
    

    // exit(1);
}


/*
function exitHandler(options, exitCode) {
    if (options.cleanup) {
        (gameRepo.search().where('name').eq('Game').return.first()).then(game => {
            game.isOperationReady = true;
            (gameRepo.save(game)).then(val => {
                process.exit(1);
            });
        });
    }
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
*/