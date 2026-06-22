"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueueJob = void 0;
const queue = [];
let processing = false;
const enqueueJob = (name, handler) => {
    queue.push({ name, handler });
    void processQueue();
};
exports.enqueueJob = enqueueJob;
const processQueue = async () => {
    if (processing)
        return;
    processing = true;
    while (queue.length > 0) {
        const job = queue.shift();
        if (!job)
            continue;
        try {
            await job.handler();
        }
        catch (error) {
            console.error(`Background job failed [${job.name}]:`, error);
        }
    }
    processing = false;
};
