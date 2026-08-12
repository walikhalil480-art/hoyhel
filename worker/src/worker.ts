import { Worker } from 'bullmq';
import dotenv from 'dotenv';
import path from 'path';
import { processEmailJob } from './processors/email.processor';
import { processBookingExpiryJob } from './processors/bookingExpiry.processor';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
};

console.log('⚡ Starting LuxeHaven Background Worker Engine...');

const emailWorker = new Worker(
  'email-queue',
  async (job) => {
    console.log(`Processing email job ${job.id} (${job.name})`);
    await processEmailJob(job);
  },
  { connection }
);

emailWorker.on('completed', (job) => console.log(`Job ${job.id} completed`));
emailWorker.on('failed', (job, err) => console.error(`Job ${job?.id} failed:`, err.message));

// Periodically trigger expired booking cleanup every 5 minutes
setInterval(async () => {
  try {
    await processBookingExpiryJob();
  } catch (err: any) {
    console.error('Booking expiry cron error:', err.message);
  }
}, 5 * 60 * 1000);
