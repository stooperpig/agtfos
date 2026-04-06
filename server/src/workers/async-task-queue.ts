import { Worker } from 'worker_threads';
import path from 'path';
import { randomUUID } from 'crypto';
import { Job, Task, WorkerMessage } from '../types/server-types';

const isDev = process.env.NODE_ENV === "dev";
const workerPath = isDev
    ? path.join(process.cwd(), "/src/workers", "async-queue-worker.ts") // Dev mode (use ts-node)
    : path.join(process.cwd(), "/dist/workers", "async-queue-worker.js"); // Prod mode (use compiled JS)

const worker = new Worker(workerPath, {
   execArgv: isDev ? ["--require", "ts-node/register"] : []
});

worker.on('exit', (code) => {
    if (code !== 0) {
        console.error(`Worker stopped with exit code ${code}`);
    }
});

let busy = false;
const queue: Job[] = [];
const taskMap = new Map<string, Task>();

export const startTask = (task: Task): void => {
    const id = randomUUID();
    const job: Job = { id, type: task.type, payload: task.payload };
    taskMap.set(id, task);
    queue.push(job);
    processQueue();
}

const processQueue = (): void => {
    if (busy || queue.length === 0) {
        return;
    }

    busy = true;
    const job = queue.shift()!;

    console.log(`Processing queue: ${queue.length} items queued`);
    console.log(`Current job: job.id=${job.id}, type=${job.type}`);

    const cleanup = () => {
        worker.off('message', handleMessage);
        worker.off('error', handleError);
        busy = false;
        processQueue();
    };

    const handleMessage = (msg: WorkerMessage) => {
        console.log(`Queue received message from worker message. status: ${msg.status}`);
        if (msg.status === "done") {
            //console.log(`Job ${msg.jobId} completed`);
            taskMap.delete(msg.jobId);
            cleanup();
        } else if (msg.status === "callback") {
            //console.log(`Job ${msg.jobId} sent callback message`); //: ${JSON.stringify(msg.message)}`);
            const task = taskMap.get(msg.jobId);
            if (task && task.callBack) {
                task.callBack(msg.message);
            } else {
                console.log(`No callback for job ${msg.jobId}`);
            }
        } else if (msg.status === "error") {
            //console.log(`Job ${msg.jobId} failed with error`);
            taskMap.delete(msg.jobId);
            cleanup();
        }
    };

    const handleError = (err: Error) => {
        console.log(err);
        console.log(`Job ${job.id} failed with error`);
        taskMap.delete(job.id);
        cleanup();
    };

    worker.on('message', handleMessage);
    worker.on('error', handleError);

    console.log(`Sending task ${job.id} to worker`);
    worker.postMessage(job);
}