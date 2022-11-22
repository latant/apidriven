/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { z } from "zod";
import { ApiModel, EndpointModel, EndpointRequestParams } from "apidriven";

type EndpointRequestBody<E extends EndpointModel> = E["requestBody"] extends z.ZodType
  ? z.infer<E["requestBody"]>
  : unknown

type EndpointRequestConfig<E extends EndpointModel = any> = Omit<
  AxiosRequestConfig<EndpointRequestBody<E>>,
  "method" | "url" | "params"
> & {
    [K in "params" as {} extends EndpointRequestParams<E> ? never : K]: EndpointRequestParams<E>
  } & (E["requestBody"] extends z.ZodType ? { data: z.infer<E["requestBody"]> } : { data?: unknown })

type EndpointResponse<E extends EndpointModel> = AxiosResponse<
  E["responseBody"] extends z.ZodType ? z.infer<E["responseBody"]> : unknown,
  EndpointRequestBody<E>
>

export type ApiClient<A extends ApiModel> = ApiClientImpl<A["endpoints"]>

type ApiClientImpl<E extends ApiModel["endpoints"]> = {
  [K in keyof E]: (config: EndpointRequestConfig<E[K]>) => Promise<EndpointResponse<E[K]>>
}

type MakeRequest = (a: AxiosInstance, r: AxiosRequestConfig<any>) => Promise<AxiosResponse<any, any>>

export function apiClient<A extends ApiModel>(
  api: A, axiosInstance: AxiosInstance, makeRequest: MakeRequest = (a, r) => a.request(r)
): ApiClientImpl<A["endpoints"]> {
  const client = {} as Record<string, unknown>;
  for (const k in api.endpoints) {
    const endpoint = api.endpoints[k];
    client[k] = (config: EndpointRequestConfig) => {
      const { params } = config as { params: { [key: string]: unknown } };
      const { headers, ...conf } = config;
      const path = [...endpoint.params]
        .sort()
        .reduceRight(
          (acc, param) => acc.replace(`:${param}`, `${encodeURIComponent(params[param] as string)}`),
          endpoint.path,
        );
      const searchParams = new URLSearchParams(
        Object.keys(endpoint.query || {}).map((param) => [param, `${params[param]}`] as [string, string]),
      );
      const searchStr = searchParams.toString();
      const requestHeaders: Record<string, any> = {};
      if (endpoint.headers) {
        for (const k in endpoint.headers) {
          requestHeaders[k] = params[k];
        }
      }
      return makeRequest(axiosInstance, {
        ...conf,
        // needed because name-clash with axiosconfig.params:
        params: undefined,
        url: searchStr.length ? `${path}?${searchStr}` : path,
        method: endpoint.method,
        headers: { ...(headers || {}), ...requestHeaders },
      });
    };
  }
  return client as ApiClientImpl<A["endpoints"]>;
}
