import { CorsOptions } from 'cors';
import { SessionOptions } from 'express-session';

export interface Config {
  env: string;
  port: number;
  host: string;
  session: SessionOptions;
  cors: CorsOptions;
  database: {
    url: string | undefined;
  };
} 