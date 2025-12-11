// polyfills.ts - Must be imported before any Aztec.js code
import { Buffer } from 'buffer';
import process from 'process';

// Make Buffer available globally for browser environment
if (typeof window !== 'undefined') {
  window.Buffer = Buffer;
  window.process = process;
  window.global = window;
  
  // Add missing BigInt methods to Buffer if they don't exist
  // These are needed by Wormhole SDK and other dependencies
  if (!Buffer.prototype.writeBigUInt64BE) {
    Buffer.prototype.writeBigUInt64BE = function(value: bigint, offset: number = 0): number {
      const buf = this as Buffer;
      const lo = Number(value & 0xffffffffn);
      const hi = Number((value >> 32n) & 0xffffffffn);
      buf.writeUInt32BE(hi, offset);
      buf.writeUInt32BE(lo, offset + 4);
      return offset + 8;
    };
  }
  
  if (!Buffer.prototype.writeBigUInt64LE) {
    Buffer.prototype.writeBigUInt64LE = function(value: bigint, offset: number = 0): number {
      const buf = this as Buffer;
      const lo = Number(value & 0xffffffffn);
      const hi = Number((value >> 32n) & 0xffffffffn);
      buf.writeUInt32LE(lo, offset);
      buf.writeUInt32LE(hi, offset + 4);
      return offset + 8;
    };
  }
  
  if (!Buffer.prototype.readBigUInt64BE) {
    Buffer.prototype.readBigUInt64BE = function(offset: number = 0): bigint {
      const buf = this as Buffer;
      const hi = buf.readUInt32BE(offset);
      const lo = buf.readUInt32BE(offset + 4);
      return (BigInt(hi) << 32n) | BigInt(lo);
    };
  }
  
  if (!Buffer.prototype.readBigUInt64LE) {
    Buffer.prototype.readBigUInt64LE = function(offset: number = 0): bigint {
      const buf = this as Buffer;
      const lo = buf.readUInt32LE(offset);
      const hi = buf.readUInt32LE(offset + 4);
      return (BigInt(hi) << 32n) | BigInt(lo);
    };
  }
}

export {};
