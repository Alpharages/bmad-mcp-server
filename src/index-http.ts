#!/usr/bin/env node
import { startHttpServer } from './http-server.js';

try {
  startHttpServer();
} catch (error) {
  console.error('Fatal error:', error);
  process.exit(1);
}
