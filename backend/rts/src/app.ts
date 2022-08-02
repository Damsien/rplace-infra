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

const startDate = new Date();

const client = new Client();
client.open(process.env.REDIS_HOST);
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

AppDataSource.initialize()
    .then(() => {
        console.log(clc.green('Database connexion done!'));
        pushOnMySQL();
    })
    .catch((error) => console.log(error));

async function delStreams() {
    let streams;
    streams = await client.execute([
        'KEYS', 'PixelHistory:*'
    ]);

    for(let stream of streams) {
        await client.execute([
            'DEL', stream
        ]);
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

    console.log(`Number of pixels to be retrieved : `+clc.magenta(`${streams.length}`));
    for(let i=0; i<streams.length; i++) {
        pixelHistory.push(await getSinglePixelStream(streams[i]));
        if(i % 500 == 0) process.stdout.write(`${i} `);
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
            await gameRepo.save(game);
            console.log('Start operation');

            const qRunner = AppDataSource.createQueryRunner();
            await qRunner.connect();
            await qRunner.startTransaction();
        
            console.log('Get all pixels history from Redis');
            const pixels = await getPixels();
            console.log(`Number of pixels retrieved : `+clc.magenta(`${pixels.length}`));
            await new Promise(r => setTimeout(r, 1000));

            try {
                console.log('Save in the SQL database');
        
                for(let i=0; i<pixels.length; i++) {
                    for(let j=0; j<pixels[i].length; j++) {
                        const pixel: PixelHistoryEntity = pixels[i][j];
            
                        await qRunner.manager.save(pixel);

                        if(i % 500 == 0 && j % 500 == 0) process.stdout.write(`i:${i}-j:${j} `);
                    }
                }
                process.stdout.write(`\n\n`)
            
                await qRunner.commitTransaction();
        
                console.log('Delete old pixels from the Redis database');
                await delStreams();

                game.isOperationReady = true;
                if (pixels.length > 0) game.isMapReady = true;
                await gameRepo.save(game);
                
                const stopTimer = new Date((new Date()).getTime()-startDate.getTime());
                console.log(clc.green('Operation done in ')+stopTimer.getSeconds()+clc.green(' seconds!'));
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

        } else {
            console.log(clc.red('Abort'));
        }


    } catch (err) {
        console.log(clc.red('Game not initialized'));
        console.log(clc.red('Abort'));
    }
    

    exit(0);
}


process.on('SIGINT', function() {
    (gameRepo.search().where('name').eq('Game').return.first()).then(game => {
        game.isOperationReady = true;
        (gameRepo.save(game)).then(val => {
            exit(1);
        });
    });
});