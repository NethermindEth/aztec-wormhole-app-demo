// globals.d.ts - Type declarations for polyfilled globals
import { Buffer } from 'buffer';

declare global {
  interface Window {
    Buffer: typeof Buffer;
    process: NodeJS.Process;
    global: typeof globalThis;
  }
  
  // Extend Buffer interface to include BigInt methods that may not be in the polyfill
  interface Buffer {
    writeBigUInt64BE?(value: bigint, offset?: number): number;
    writeBigUInt64LE?(value: bigint, offset?: number): number;
    readBigUInt64BE?(offset?: number): bigint;
    readBigUInt64LE?(offset?: number): bigint;
  }
}

export {};
