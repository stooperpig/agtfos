export interface ClientUser {
    name: string
    id: string
    admin: boolean
}

export const getUser = (document: Document): ClientUser | undefined => {
    if (document === undefined) {
        return undefined;
    }

    const cookies = document.cookie.split('; ');
    const cookie = cookies.find((c) => c.startsWith(`user=`));

    if (!cookie) {
        return undefined;
    }

    const value = cookie.split('=')[1];

    if (!value) {
        return undefined;
    }

    return JSON.parse(decodeURIComponent(value));
}