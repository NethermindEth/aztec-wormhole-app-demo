// polyfills.ts - Must be imported before any Aztec.js code
import { Buffer } from 'buffer';
import process from 'process';

// Make Buffer available globally for browser environment
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
  window.process = process;
  window.global = window;
}

export {};
