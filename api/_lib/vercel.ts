import type { IncomingMessage, ServerResponse } from "node:http";

export type ApiRequest = IncomingMessage & {
  query: Record<string, string | string[]>;
  cookies: Record<string, string>;
  body?: unknown;
};

export type ApiResponse = ServerResponse & {
  status(statusCode: number): ApiResponse;
  json(body: unknown): ApiResponse;
  send(body: Buffer | string): ApiResponse;
};

export type ApiHandler = (req: ApiRequest, res: ApiResponse) => void | Promise<void>;
