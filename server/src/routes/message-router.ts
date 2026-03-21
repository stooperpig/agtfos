import express, { Request, Response } from 'express';
import Pusher from 'pusher';

let pusher: Pusher | undefined;

const router = express.Router();
export default router;

router.post('/', function (req: Request, res: Response) {
    try {
        const payload = req.body;
        console.log(JSON.stringify(payload));
        const socketId = payload.socketId;

        if (pushMessage(payload, socketId)) {
            res.status(200);
            res.send({ message: 'ack' });
        } else {
            console.log('Pusher is not initialized');
            res.status(500);
            res.send({ message: 'Error: Sending pusher message failed' });
            return;
        }
    } catch (error) {
        console.log(error);
        res.status(500);
        res.send({ message: 'Error: Sending pusher message failed' });
    }
});

export const initializePusher = (secretKey: string | undefined) => {
    try {
        if (secretKey === undefined) {
            console.log('Error: Pusher secret key not set');
        } else {
            pusher = new Pusher({
                appId: '1721364',
                key: 'f24e380aed4ddc2c0392',
                secret: secretKey,
                cluster: 'us2'
            });
            console.log('Pusher initialized');
        }
    } catch (error) {
        console.log('Error: Instantiation of Pusher failed');
        console.log(error);
    }
}

export const pushMessage = (message: string, socketId?: string): boolean => {
    if (pusher === undefined) {
        return false;
    }

    if (socketId) {
        pusher.trigger('chat', 'message', message, { socket_id: socketId });
    } else {
        pusher.trigger('chat', 'message', message, { socket_id: socketId });
    }

    return true;
}