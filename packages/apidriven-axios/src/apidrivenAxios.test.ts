import { apiDefinition, GET } from "apidriven";
import { apiClient } from "./apidrivenAxios";
import axios, { AxiosInstance, AxiosResponse } from "axios";
import { z } from "zod";

describe("axios client tests", () => {
  it("should put path parameters in the url", async () => {
    const USER_ID = "0";
    const getUser = GET("/users/:userId", {
      status: 200
    });
    const api = apiDefinition({
      docs: {
        info: {
          title: "",
          version: ""
        }
      },
      endpoints: {getUser}
    });
    const client = apiClient(api, axios.create(), async (a, r) => {
      expect(r.url).toBe(`/users/${USER_ID}`);
      return {} as any;
    });
    await client.getUser({
      params: {userId: USER_ID}
    });
  });

  it("should put query parameters in the url", async () => {
    const USER_ID = "0";
    const getUser = GET("/users", {
      status: 200,
      query: {
        userId: z.string(),
      }
    });
    const api = apiDefinition({
      docs: {
        info: {
          title: "",
          version: ""
        }
      },
      endpoints: {getUser}
    });
    const client = apiClient(api, axios.create(), async (a, r) => {
      expect(r.url).toBe(`/users?userId=${USER_ID}`);
      return {} as any;
    });
    await client.getUser({
      params: {userId: USER_ID}
    });
  });

  it("should put header parameters in the headers", async () => {
    const USER_ID = "0";
    const getUser = GET("/users", {
      status: 200,
      headers: {
        "User-ID": z.string(),
      }
    });
    const api = apiDefinition({
      docs: {
        info: {
          title: "",
          version: ""
        }
      },
      endpoints: {getUser}
    });
    const client = apiClient(api, axios.create(), async (a, r) => {
      expect(r.url).toBe("/users");
      expect(r.headers?.["User-ID"]).toBe(USER_ID);
      return {} as any;
    });
    await client.getUser({
      params: {"User-ID": USER_ID}
    });
  });

  it("should make basic request on axios instance when no implementation is given", async () => {
    const USER_ID = "0";
    let axiosInstanceCalled = 0;
    const getUser = GET("/users", {
      status: 200,
      query: {
        userId: z.string(),
      }
    });
    const api = apiDefinition({
      docs: {
        info: {
          title: "",
          version: ""
        }
      },
      endpoints: {getUser}
    });
    const client = apiClient(api, {
      request: async (req) => {
        axiosInstanceCalled++;
        return {} as AxiosResponse;
      }
    } as AxiosInstance);
    expect(axiosInstanceCalled).toBe(0);
    await client.getUser({
      params: {userId: USER_ID}
    });
    expect(axiosInstanceCalled).toBe(1);
  });
});