let detectedVersion = '2.0.1';

try {
  if (typeof __TOKENTRIM_VERSION__ === 'string' && __TOKENTRIM_VERSION__.length > 0) {
    detectedVersion = __TOKENTRIM_VERSION__;
  }
} catch {
  // Build-time define may be unavailable in direct Node execution.
}

export const TOKENTRIM_VERSION = detectedVersion;
