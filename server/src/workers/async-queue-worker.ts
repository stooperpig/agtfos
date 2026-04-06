//be very careful not to create a circular dependency between the worker and queue by 
//importing a file that also has a dependency on the queue.

import { parentPort } from "worker_threads";
import { consoleLogger, stringifyArgs } from "../utils/logger";
import type { Job, WorkerMessage } from "../types/server-types";
import { TaskFunctionMap } from "../tasks/tasks";

if (!parentPort) {
  throw new Error("This file should be run as a Worker Thread.");
}

parentPort?.on("message", (job: Job) => {
  console.log = (...args) => consoleLogger.debug(stringifyArgs(args));
  console.info = (...args) => consoleLogger.info(stringifyArgs(args));
  console.warn = (...args) => consoleLogger.warn(stringifyArgs(args));
  console.error = (...args) => consoleLogger.error(stringifyArgs(args));
  console.debug = (...args) => consoleLogger.debug(stringifyArgs(args));

  console.log(`Worker received job ${job.id} from queue.  Job type ${job.type}`); //, JSON.stringify(job));

  const passThroughCallBack = (message: any) => {
    //console.log(`Worker received message from task ${job.id} ${JSON.stringify(message)}`);
    parentPort?.postMessage({ status: "callback", jobId: job.id, message } as WorkerMessage);
  };

  const task = TaskFunctionMap[job.type as keyof typeof TaskFunctionMap];
  if (task) {
    task(job.payload, passThroughCallBack);
    parentPort?.postMessage({ status: "done", jobId: job.id } as WorkerMessage);
  } else {
    console.error("Unknown task type:", job.type);
    parentPort?.postMessage({ status: "error", jobId: job.id, message: "Unknown task type" } as WorkerMessage);
  }
});