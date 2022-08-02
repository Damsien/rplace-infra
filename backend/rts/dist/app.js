"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const redis_om_1 = require("redis-om");
const typeorm_1 = require("typeorm");
const game_entity_1 = require("./redis-entity/game.entity");
const pixel_entity_1 = require("./sql-entity/pixel.entity");
const pixel_history_entity_1 = require("./sql-entity/pixel-history.entity");
const user_entity_1 = require("./sql-entity/user.entity");
require("dotenv/config");
const process_1 = require("process");
const clc = require("cli-color");
const startDate = new Date();
const client = new redis_om_1.Client();
client.open(process.env.REDIS_HOST);
let gameRepo;
const AppDataSource = new typeorm_1.DataSource({
    type: 'mariadb',
    host: process.env.MARIADB_HOST,
    port: parseInt(process.env.DATABASE_PORT),
    username: process.env.MARIADB_USER,
    password: process.env.MARIADB_PASSWORD,
    database: process.env.MARIADB_DATABASE,
    entities: [pixel_history_entity_1.PixelHistoryEntity, pixel_entity_1.PixelEntity, user_entity_1.UserEntity],
    synchronize: false,
});
AppDataSource.initialize()
    .then(() => {
    console.log(clc.green('Database connexion done!'));
    pushOnMySQL();
})
    .catch((error) => console.log(error));
function delStreams() {
    return __awaiter(this, void 0, void 0, function* () {
        let streams;
        streams = yield client.execute([
            'KEYS', 'PixelHistory:*'
        ]);
        for (let stream of streams) {
            yield client.execute([
                'DEL', stream
            ]);
        }
    });
}
function getSinglePixelStream(pixelStream) {
    return __awaiter(this, void 0, void 0, function* () {
        let stream;
        stream = yield client.execute([
            'XRANGE', pixelStream,
            '-', '+'
        ]);
        const history = new Array();
        for (let i = 0; i < stream.length; i++) {
            const pixelHistoryRedis = stream[i][1];
            const pixelHistory = new pixel_history_entity_1.PixelHistoryEntity();
            pixelHistory.pixelId = (yield AppDataSource.manager.findOne(pixel_entity_1.PixelEntity, { where: { coord_x: pixelHistoryRedis[1], coord_y: pixelHistoryRedis[3] } })).pixelId;
            pixelHistory.date = new Date(pixelHistoryRedis[9]);
            pixelHistory.userId = pixelHistoryRedis[7];
            pixelHistory.color = pixelHistoryRedis[5];
            history.push(pixelHistory);
        }
        return history;
    });
}
function getPixels() {
    return __awaiter(this, void 0, void 0, function* () {
        let pixelHistory = new Array();
        let streams;
        streams = yield client.execute([
            'KEYS', 'PixelHistory:*'
        ]);
        console.log(`Number of pixels to be retrieved : ` + clc.magenta(`${streams.length}`));
        for (let i = 0; i < streams.length; i++) {
            pixelHistory.push(yield getSinglePixelStream(streams[i]));
            if (i % 500 == 0)
                process.stdout.write(`${i} `);
        }
        process.stdout.write(`\n\n`);
        return pixelHistory;
    });
}
function pushOnMySQL() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Pushing redis history into the SQL database...');
        try {
            gameRepo = yield client.fetchRepository(game_entity_1.game_schema);
            const game = yield gameRepo.search().where('name').eq('Game').return.first();
            const isOperationReady = game.isOperationReady;
            console.log(clc.green(`Game found.`) + clc.white(` Is another operation in progress ? `) + clc.magenta(`${!isOperationReady}`));
            if (isOperationReady) {
                game.isOperationReady = false;
                yield gameRepo.save(game);
                console.log('Start operation');
                const qRunner = AppDataSource.createQueryRunner();
                yield qRunner.connect();
                yield qRunner.startTransaction();
                console.log('Get all pixels history from Redis');
                const pixels = yield getPixels();
                console.log(`Number of pixels retrieved : ` + clc.magenta(`${pixels.length}`));
                yield new Promise(r => setTimeout(r, 1000));
                try {
                    console.log('Save in the SQL database');
                    for (let i = 0; i < pixels.length; i++) {
                        for (let j = 0; j < pixels[i].length; j++) {
                            const pixel = pixels[i][j];
                            yield qRunner.manager.save(pixel);
                            if (i % 500 == 0 && j % 500 == 0)
                                process.stdout.write(`x:${i}-y:${j} `);
                        }
                    }
                    process.stdout.write(`\n\n`);
                    yield qRunner.commitTransaction();
                    console.log('Delete old pixels from the Redis database');
                    yield delStreams();
                    game.isOperationReady = true;
                    if (pixels.length > 0)
                        game.isMapReady = true;
                    yield gameRepo.save(game);
                    const stopTimer = new Date((new Date()).getTime() - startDate.getTime());
                    console.log(clc.green('Operation done in ') + stopTimer.getSeconds() + clc.green(' seconds!'));
                }
                catch (err) {
                    console.error(err);
                    // since we have errors lets rollback the changes we made
                    yield qRunner.rollbackTransaction();
                    yield delStreams();
                    yield gameRepo.save(game);
                }
                finally {
                    // you need to release a queryRunner which was manually instantiated
                    yield qRunner.release();
                }
            }
            else {
                console.log(clc.red('Abort'));
            }
        }
        catch (err) {
            console.log(clc.red('Game not initialized'));
            console.log(clc.red('Abort'));
        }
        (0, process_1.exit)(0);
    });
}
process.on('SIGINT', function () {
    (gameRepo.search().where('name').eq('Game').return.first()).then(game => {
        game.isOperationReady = true;
        (gameRepo.save(game)).then(val => {
            (0, process_1.exit)(1);
        });
    });
});
