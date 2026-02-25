import EasyPostClient from '@easypost/api';

if (!process.env.EASYPOST_API_KEY) {
  throw new Error('EASYPOST_API_KEY environment variable is not set.');
}

export const easypost = new EasyPostClient(process.env.EASYPOST_API_KEY);