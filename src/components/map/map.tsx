import React from 'react';
import { ImageData } from '../../constants/game-constants';
import './map.css';
import { useAppSelector } from '../../constants/hooks';
import { RootState } from '../../constants/store';
import scenarioData from '../../constants/scenario-data';
import { CounterMap, StackMap } from '../../types/game-types';

const updateCanvas = (canvas: HTMLCanvasElement, boardName: string, stacks: StackMap, counters: CounterMap) => {
    const context: any | null = canvas ? canvas.getContext('2d') : null;
    if (context == null) {
        return;
    }

    let imageData = ImageData[boardName];
    if (imageData == null) {
        return;
    }

    const board = imageData.image;
    if (board == null) {
        return;
    }

    canvas.width = 3135;
    canvas.height = 1751;

    console.log('drawing board');
    context.drawImage(board, 0, 0);

    let counter = ImageData['1st-Officer'].image;
    context.drawImage(counter, 0, 0, 80, 80);
}

export const Map = () => {
    const boardImageName = scenarioData.board.imageName; 
    const counters = useAppSelector((state: RootState) => state.counters);
    const stacks = useAppSelector((state: RootState) => state.stacks);

    const canvasRef = React.createRef<HTMLCanvasElement>();

    React.useEffect(() => {
        if (canvasRef.current && boardImageName !== undefined) {
            const canvas: HTMLCanvasElement = canvasRef.current;
            updateCanvas(canvas, boardImageName, stacks, counters);
        }
    }, [canvasRef, boardImageName, stacks, counters]);

    return (
        <div className="map">
            <canvas ref={canvasRef} className="field-canvas"></canvas>
        </div>
    );
}