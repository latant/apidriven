import Ajv from "ajv";
import { apiDefinition, POST } from "apidriven";
import { readFileSync } from "fs";
import { z } from "zod";
import { apiSpecification } from "./apidrivenOpenapi";

const ajv = new Ajv({strict: false});
const specValidator = ajv.compile(readFileSync("oas-chema-3.0.json"));
const expectValidSpec = (spec: unknown) => {
  expect(specValidator(spec)).toBeTruthy();
};

describe("test openapi generation", () => {
  it("should generate valid openapi for a minimal API", () => {
    const api = apiDefinition({
      docs: {
        info: {
          title: "",
          version: ""
        }
      },
      endpoints: {}
    });
    const spec = apiSpecification(api);
    expectValidSpec(spec);
  });

  it("should generate valid openapi for an API having an endpoint without parameters", () => {
    const operation = POST("/operation/:pathParam", {
      status: 200,
    });
    const api = apiDefinition({
      docs: {
        info: {
          title: "",
          version: ""
        }
      },
      endpoints: {
        operation
      }
    });
    const spec = apiSpecification(api);
    expectValidSpec(spec);
  });

  it("should generate valid openapi for an API using path/query/header parameters and request/response body", () => {
    const operation = POST("/operation/:pathParam", {
      status: 200,
      query: {
        queryParam: z.string(),
      },
      headers: {
        headerParam: z.string(),
      },
      requestBody: z.object({
        bodyParam: z.string(),
      }),
      responseBody: z.object({
        bodyParam: z.string()
      })
    });
    const api = apiDefinition({
      docs: {
        info: {
          title: "",
          version: ""
        }
      },
      endpoints: {
        operation
      }
    });
    const spec = apiSpecification(api);
    expectValidSpec(spec);
  });
});