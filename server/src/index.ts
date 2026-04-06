import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import dotenv from 'dotenv';
import { consoleLogger } from './utils/logger';

import gamesRouter from './routes/games-router';
import scenariosRouter from './routes/scenarios-router';
import { initializePusher } from './utils/push-actions';

console.log(`node_env: ${process.env.NODE_ENV}`);
const configPath = (process.env.NODE_ENV !== undefined && process.env.NODE_ENV.trim().length > 0) ? `.env.${process.env.NODE_ENV}` : '.env';

dotenv.config({
    path: path.resolve(process.cwd(), configPath)
});

initializePusher(process.env.PUSHER_SECRET_KEY);

const app = express();

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(logger('dev'));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.use(cookieParser() as any);
app.use(express.static(path.join(process.cwd(), 'public')));
app.use(express.static(path.join(process.cwd(), 'dist')));

app.use('/api/games', gamesRouter);
app.use('/api/scenarios', scenariosRouter);

console.log(`consoleLogger levels ${JSON.stringify(consoleLogger.levels)}`);