export interface Image {
    src: string,
    image?: HTMLImageElement
}

export interface ImageMap {
    [key: string]: Image
}