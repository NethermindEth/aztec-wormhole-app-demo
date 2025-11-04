// globals.d.ts - Type declarations for polyfilled globals
import { Buffer } from 'buffer';

declare global {
  interface Window {
    Buffer: typeof Buffer;
    process: NodeJS.Process;
    global: typeof globalThis;
  }
}

export {};
