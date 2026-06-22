type JobHandler = () => Promise<void>;

const queue: { name: string; handler: JobHandler }[] = [];
let processing = false;

export const enqueueJob = (name: string, handler: JobHandler): void => {
  queue.push({ name, handler });
  void processQueue();
};

const processQueue = async (): Promise<void> => {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const job = queue.shift();
    if (!job) continue;

    try {
      await job.handler();
    } catch (error) {
      console.error(`Background job failed [${job.name}]:`, error);
    }
  }

  processing = false;
};
