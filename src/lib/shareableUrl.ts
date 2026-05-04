import type { CompressionMode, CompressionProfile, RiskLevel, TokenizerKind } from '../compression/types';

export interface ShareableState {
  mode?: CompressionMode;
  profile?: CompressionProfile;
  maxRisk?: RiskLevel;
  tokenizer?: TokenizerKind;
  targetTokens?: string;
  allowUnsafeTransforms?: boolean;
  input?: string;
  customTransforms?: string[];
}

const INPUT_SIZE_LIMIT = 4000;

function utf8ToBase64(str: string): string {
  try {
    return btoa(encodeURIComponent(str));
  } catch {
    return '';
  }
}

function base64ToUtf8(str: string): string {
  try {
    return decodeURIComponent(atob(str));
  } catch {
    return '';
  }
}

export function encodeState(state: ShareableState): string {
  const params = new URLSearchParams();
  if (state.mode) params.set('m', state.mode);
  if (state.profile) params.set('p', state.profile);
  if (state.maxRisk) params.set('r', state.maxRisk);
  if (state.tokenizer) params.set('t', state.tokenizer);
  if (state.targetTokens) params.set('b', state.targetTokens);
  if (state.allowUnsafeTransforms) params.set('u', '1');
  if (state.customTransforms && state.customTransforms.length > 0) {
    params.set('c', state.customTransforms.join(','));
  }
  if (state.input && state.input.length <= INPUT_SIZE_LIMIT) {
    params.set('i', utf8ToBase64(state.input));
  }
  return params.toString();
}

export function decodeState(search: string): Partial<ShareableState> | null {
  const params = new URLSearchParams(search);
  if (!params.has('m') && !params.has('p') && !params.has('i')) return null;

  const result: Partial<ShareableState> = {};
  const mode = params.get('m');
  if (mode && ['light', 'normal', 'heavy', 'ultra', 'custom'].includes(mode)) {
    result.mode = mode as CompressionMode;
  }
  const profile = params.get('p');
  if (profile && ['general', 'agent-context', 'repo-context', 'logs', 'markdown-docs', 'chat-history'].includes(profile)) {
    result.profile = profile as CompressionProfile;
  }
  const risk = params.get('r');
  if (risk && ['safe', 'low', 'medium', 'high'].includes(risk)) {
    result.maxRisk = risk as RiskLevel;
  }
  const tokenizer = params.get('t');
  if (tokenizer && ['approx-generic', 'openai-cl100k', 'openai-o200k'].includes(tokenizer)) {
    result.tokenizer = tokenizer as TokenizerKind;
  }
  const targetTokens = params.get('b');
  if (targetTokens && /^\d+$/.test(targetTokens)) {
    result.targetTokens = targetTokens;
  }
  result.allowUnsafeTransforms = params.get('u') === '1';
  const customTransforms = params.get('c');
  if (customTransforms) {
    result.customTransforms = customTransforms.split(',').filter(Boolean);
  }
  const input = params.get('i');
  if (input) {
    const decoded = base64ToUtf8(input);
    if (decoded) result.input = decoded;
  }
  return result;
}

export function getShareableUrl(state: ShareableState): string {
  const encoded = encodeState(state);
  if (!encoded) return window.location.href.split('?')[0];
  return `${window.location.origin}${window.location.pathname}?${encoded}`;
}

export function updateBrowserUrl(state: ShareableState): void {
  const encoded = encodeState(state);
  const url = encoded
    ? `${window.location.pathname}?${encoded}`
    : window.location.pathname;
  window.history.replaceState(null, '', url);
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.reject(new Error('Clipboard API not available'));
}
