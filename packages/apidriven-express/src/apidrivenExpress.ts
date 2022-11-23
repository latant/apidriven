/* eslint-disable @typescript-eslint/ban-types */
import { ApiModel, EndpointModel, EndpointRequestParams } from "apidriven";
import { NextFunction, Request, Response, Router } from "express";
import "express-async-errors";
import bodyParser from "body-parser";
import { z } from "zod";

type EndpointCall<E extends EndpointModel = any> = {
  request: Request
  response: Response
  params: EndpointRequestParams<E>
} & (E["requestBody"] extends z.ZodType ? { requestBody: z.infer<E["requestBody"]> } : {}) & {
    respond: E["responseBody"] extends z.ZodType
      ? (data: z.infer<E["responseBody"]>) => Promise<void>
      : (body?: unknown) => Promise<void>
  }

export type ApiRoutes<A extends ApiModel> = EndpointsRoutes<A["endpoints"]> 
  & ((req: Request, res: Response, next: NextFunction) => void)

type EndpointsRoutes<E extends ApiModel["endpoints"]> = {
  [K in keyof E]: (handler: (call: EndpointCall<E[K]>) => void) => void
}

class ApiError extends Error {
  zodError: z.ZodError;
  constructor(msg: string, zodError: z.ZodError) {
    super(msg);
    this.zodError = zodError;
  }
}

export class InvalidUrlQueryError extends ApiError {
  constructor(zodError: z.ZodError) {
    super("Invalid URL query", zodError);
  }
}

export class InvalidRequestHeadersError extends ApiError {
  constructor(zodError: z.ZodError) {
    super("Invalid headers", zodError);
  }
}

export class InvalidRequestBodyError extends ApiError {
  constructor(zodError: z.ZodError) {
    super("Invalid request body", zodError);
  }
}

export class InvalidResponseBodyError extends ApiError {
  constructor(zodError: z.ZodError) {
    super("Invalid response body", zodError);
  }
}

const getQueryParams = (endpoint: EndpointModel, request: Request) => {
  const parseResult = z.strictObject(endpoint.query ?? {}).safeParse(request.query);
  if (!parseResult.success) {
    throw new InvalidUrlQueryError(parseResult.error);
  }
  return parseResult.data;
};

const getHeaders = (endpoint: EndpointModel, request: Request) => {
  // request.headers has only lowercase keys
  const originalHeaders = Object.fromEntries(
    Object.keys(endpoint.headers ?? {}).map((header) => [header, request.header(header)]),
  );
  const parseResult = z.strictObject(endpoint.headers ?? {}).safeParse(originalHeaders);
  if (!parseResult.success) {
    throw new InvalidRequestHeadersError(parseResult.error);
  }
  return parseResult.data;
};

const getRequestBody = (endpoint: EndpointModel, request: Request) => {
  if (!endpoint.requestBody) {
    return undefined;
  }
  const parseResult = endpoint.requestBody.safeParse(request.body);
  if (!parseResult.success) {
    throw new InvalidRequestBodyError(parseResult.error);
  }
  return parseResult.data;
};

const respondWithBody = async (endpoint: EndpointModel, response: Response, body: unknown): Promise<void> => {
  if (!endpoint.responseBody) {
    response.status(endpoint.status).end(body);
    return;
  }
  const parseResult = endpoint.responseBody.safeParse(body);
  if (!parseResult.success) {
    throw new InvalidResponseBodyError(parseResult.error);
  }
  response.status(endpoint.status).json(parseResult.data);
};

export function apiRoutes<A extends ApiModel>(api: A, opts?: {router?: Router}): ApiRoutes<A> {
  const router = opts?.router ?? Router();
  router.use(bodyParser.json());
  const result = ((req: Request, res: Response, next: NextFunction) => router(req, res, next)) as any;
  Object.entries(api.endpoints).forEach(([id, e]) => {
    result[id] = (handler: (call: EndpointCall) => Promise<void>) => {
      const routerMatcher = router[e.method].bind(router);
      routerMatcher(e.path, async (req, resp) => {
        await handler({
          request: req,
          response: resp,
          params: {
            ...req.params,
            ...getQueryParams(e, req),
            ...getHeaders(e, req),
          },
          requestBody: getRequestBody(e, req),
          respond: async (body: unknown) => {
            await respondWithBody(e, resp, body);
          },
        });
      });
    };
  });
  return result as ApiRoutes<A>;
}
