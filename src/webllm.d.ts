declare module '@mlc-ai/web-llm' {
  export interface InitProgressReport {
    progress: number;
    text: string;
  }

  export type InitProgressCallback = (report: InitProgressReport) => void;

  export interface MLCEngineConfig {
    appConfig?: object;
    initProgressCallback?: InitProgressCallback;
    logLevel?: string;
  }

  export interface ChatCompletionMessageParam {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }

  export interface ChatCompletionRequestBase {
    messages: ChatCompletionMessageParam[];
    temperature?: number | null;
    top_p?: number | null;
    max_tokens?: number | null;
    stream?: false | null;
  }

  export interface ChatCompletion {
    choices: Array<{
      message: { content: string | null };
      finish_reason: string | null;
    }>;
  }

  export interface Completions {
    create(request: ChatCompletionRequestBase): Promise<ChatCompletion>;
  }

  export interface Chat {
    completions: Completions;
  }

  export interface MLCEngineInterface {
    chat: Chat;
  }

  export class MLCEngine implements MLCEngineInterface {
    chat: Chat;
  }

  export function CreateMLCEngine(
    modelId: string,
    config?: MLCEngineConfig,
  ): Promise<MLCEngine>;

  export class WebWorkerMLCEngineHandler {
    engine: MLCEngine;
    constructor();
    onmessage(event: MessageEvent): void;
  }

  export class WebWorkerMLCEngine implements MLCEngineInterface {
    chat: Chat;
    constructor(worker: { onmessage: unknown; postMessage: (message: unknown) => void }, engineConfig?: MLCEngineConfig);
    setInitProgressCallback(callback?: InitProgressCallback): void;
    interruptGenerate(): void;
  }

  export function CreateWebWorkerMLCEngine(
    worker: Worker,
    modelId: string | string[],
    engineConfig?: MLCEngineConfig,
  ): Promise<WebWorkerMLCEngine>;
}
