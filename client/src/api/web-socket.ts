import store from '../constants/store';
import Pusher from 'pusher-js';
import { postData } from './api-utils';
import { ActionType } from '../shared/types/action-types';

export let socketId: string | undefined = undefined;

//todo: is that a key? Should it be in env file instead?
const pusher = new Pusher('f24e380aed4ddc2c0392', {
    cluster: 'us2'
});

pusher.connection.bind("connected", () => {
    socketId = pusher.connection.socket_id;
});

export const connect = (gameId: string) => {
    console.log(`Connecting to gameId: ${gameId}`);
    const channel = pusher.subscribe('chat');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel.bind('message', (data: any) => {
        console.log(`Received message from Pusher: ${JSON.stringify(data)}`);
        store.dispatch({ ...data, suppressBroadcast: true });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel.bind("pusher:subscription_count", (data: any) => {
        store.dispatch({ type: ActionType.UPDATE_CONNECTED_CLIENT_COUNT, payload: data.subscription_count });
    });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sendMessage = (message: any) => {
    push(message);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const push = (message: any) => {
    postData('/api/message', { socketId, ...message })
        .then(function () {
            //console.log(res.data);
        })
        .catch(function (err) {
            console.log(err.data);
        });
}