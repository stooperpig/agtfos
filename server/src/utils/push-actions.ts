import Pusher from 'pusher';

let pusher: Pusher | undefined;

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

export const pushAction = (action: string, socketId?: string): boolean => {
    try {
    console.log('Pushing action:', action);
    if (pusher === undefined) {
        console.log('Pusher not initialized');
        return false;
    }

    if (socketId) {
        pusher.trigger('chat', 'message', action, { socket_id: socketId });
    } else {
        pusher.trigger('chat', 'message', action);
    }
    } catch (error) {
        console.log('Error: Pushing action failed');
        console.log(error);
        return false;
    }
    
    return true;
}