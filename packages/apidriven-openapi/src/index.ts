import { z } from 'zod'
import zodToJsonSchema from 'zod-to-json-schema'
import { oas, ApiModel, EndpointModel, OpenApiSpec } from 'apidriven'

function schemaOf(zodType: z.ZodType) {
  const { $schema: _, ...schema } = zodToJsonSchema(zodType, {
    $refStrategy: 'none',
  })
  return schema
}

function createDefaultResponse(operation: oas.Operation, endpoint: EndpointModel) {
  const { responses } = operation
  responses[endpoint.status] = responses[endpoint.status] || {}
  const defaultResponse = operation.responses[endpoint.status] as oas.Response
  defaultResponse.description = defaultResponse.description || ''
  if (endpoint.responseBody) {
    defaultResponse.content = {
      'application/json': {
        schema: schemaOf(endpoint.responseBody),
      },
    }
  }
}

function createRequestBody(operation: oas.Operation, endpoint: EndpointModel) {
  if (endpoint.requestBody) {
    operation.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: schemaOf(endpoint.requestBody),
        },
      },
    }
  }
}

function createParams(operation: oas.Operation, endpoint: EndpointModel) {
  const params: oas.Parameter[] = operation.parameters || []
  operation.parameters = params
  endpoint.params.forEach((pathParam) => {
    params.push({
      name: pathParam,
      in: 'path',
      required: true,
      schema: { type: 'string' },
    })
  })
  Object.entries(endpoint.query || {}).forEach(([param, zodType]) => {
    params.push({
      name: param,
      in: 'query',
      required: !zodType.isOptional(),
      schema: schemaOf(zodType),
    })
  })
  Object.entries(endpoint.headers || {}).forEach(([header, zodType]) => {
    params.push({
      name: header,
      in: 'header',
      required: !zodType.isOptional(),
      schema: schemaOf(zodType),
    })
  })
}

function operationDocs(operationId: string, endpoint: EndpointModel): oas.Operation {
  const operation: oas.Operation = {
    operationId,
    ...(endpoint.docs || {}),
    responses: endpoint?.docs?.responses || {},
  }
  createDefaultResponse(operation, endpoint)
  createRequestBody(operation, endpoint)
  createParams(operation, endpoint)
  return operation
}

export function apiSpecification({ endpoints, docs }: ApiModel): OpenApiSpec {
  const oas: OpenApiSpec = {
    ...docs,
    openapi: '3.0.0',
    paths: {},
  }
  Object.entries(endpoints).forEach(([id, e]) => {
    oas.paths[e.path] = oas.paths[e.path] || {}
    oas.paths[e.path][e.method] = operationDocs(id, e)
  })
  return oas
}
