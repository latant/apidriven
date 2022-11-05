import { z } from 'zod'
import * as oas from "./openapiTypes"

export { oas }

export type OpenApiSpec = oas.HttpsSpecOpenapisOrgOas30Schema20210928

export type ApiModel = {
  endpoints: { [key: string]: EndpointModel }
  docs: Omit<OpenApiSpec, 'openapi' | 'paths'>
}

export type EndpointModel = {
  method: HttpMethod
  path: string
  params: string[]
  status: number
  query?: { [key: string]: z.ZodType }
  headers?: { [headers: string]: z.ZodType }
  requestBody?: z.ZodType
  responseBody?: z.ZodType
  docs?: Partial<oas.Operation>
}

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head'

export type EndpointRequestParams<E extends EndpointModel> = EndpointModel extends E
  ? Record<string, unknown>
  : ({} extends RouteParameters<E['path']> ? {} : RouteParameters<E['path']>) &
      (E['query'] extends { [key: string]: z.ZodType } ? { [K in keyof E['query']]: z.infer<E['query'][K]> } : {}) &
      (E['headers'] extends { [key: string]: z.ZodType } ? { [K in keyof E['headers']]: z.infer<E['headers'][K]> } : {})

function endpointFactory<M extends HttpMethod>(method: M) {
  return function <E extends Omit<EndpointModel, 'method' | 'path' | 'params'>, P extends string>(
    path: P,
    opts: E,
  ): E & { method: M; path: P; params: string[] } {
    return {
      ...opts,
      method,
      path,
      params: (path.match(/:[^/]+/) || []).map((m) => m.toString().substring(1)),
    }
  }
}

export const GET = endpointFactory('get')
export const POST = endpointFactory('post')
export const PUT = endpointFactory('put')
export const DELETE = endpointFactory('delete')
export const PATCH = endpointFactory('patch')
export const OPTIONS = endpointFactory('options')
export const HEAD = endpointFactory('head')

export function apiDefinition<A extends ApiModel>(api: A): A {
  return api
}

// based on express library

type RemoveTail<S extends string, Tail extends string> = S extends `${infer P}${Tail}` ? P : S
type GetRouteParameter<S extends string> = RemoveTail<
  RemoveTail<RemoveTail<S, `/${string}`>, `-${string}`>,
  `.${string}`
>

export type RouteParameters<Route extends string> = string extends Route
  ? {}
  : Route extends `${string}(${string}`
  ? {}
  : Route extends `${string}:${infer Rest}`
  ? (GetRouteParameter<Rest> extends never
      ? {}
      : GetRouteParameter<Rest> extends `${infer ParamName}?`
      ? { [P in ParamName]?: string }
      : { [P in GetRouteParameter<Rest>]: string }) &
      (Rest extends `${GetRouteParameter<Rest>}${infer Next}` ? RouteParameters<Next> : unknown)
  : {}
