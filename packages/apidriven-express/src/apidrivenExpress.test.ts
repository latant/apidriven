import { apiDefinition, GET, POST } from "apidriven";
import axios from "axios";
import express, { Application } from "express";
import { Server } from "http";
import { AddressInfo } from "net";
import { z } from "zod";
import { apiRoutes } from "./apidrivenExpress";

const createServer = (app: Application) =>
  new Promise<Server>((resolve, reject) => {
    const server = app
      .listen(0, () => {
        resolve(server);
      })
      .on("error", (e) => {
        reject(e);
      });
  });

const createClient = (server: Server) => {
  const address = server.address() as AddressInfo;
  return axios.create({
    baseURL: `http://localhost:${address.port}`,
    validateStatus() {
      return true;
    },
  });
};

const stopServer = (server: Server) =>
  new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) reject();
      else resolve();
    });
  });

describe("test apidriven express routes", () => {
  it("should take path parameters from the url", async () => {
    const USER_ID = "0";
    let getUserCalled = 0;
    const getUser = GET("/users/:userId", {
      status: 200,
    });
    const api = apiDefinition({
      docs: {
        info: {
          title: "",
          version: "",
        },
      },
      endpoints: { getUser },
    });
    const routes = apiRoutes(api);
    routes.getUser(async (call) => {
      getUserCalled++;
      expect(call.params.userId).toBe(USER_ID);
      await call.respond();
    });
    const app = express();
    app.use(routes);
    const server = await createServer(app);
    const client = createClient(server);
    expect(getUserCalled).toBe(0);
    const response = await client.get(`/users/${USER_ID}`);
    expect(response.status).toBe(200);
    expect(getUserCalled).toBe(1);
    await stopServer(server);
  });

  it("should take query parameters from the url", async () => {
    const USER_ID = "0";
    let getUserCalled = 0;
    const getUser = GET("/users", {
      status: 200,
      query: {
        userId: z.string(),
      },
    });
    const api = apiDefinition({
      docs: {
        info: {
          title: "",
          version: "",
        },
      },
      endpoints: { getUser },
    });
    const routes = apiRoutes(api);
    routes.getUser(async (call) => {
      getUserCalled++;
      expect(call.params.userId).toBe(USER_ID);
      await call.respond();
    });
    const app = express();
    app.use(routes);
    const server = await createServer(app);
    const client = createClient(server);
    expect(getUserCalled).toBe(0);
    const response = await client.get(`/users?userId=${USER_ID}`);
    expect(response.status).toBe(200);
    expect(getUserCalled).toBe(1);
    await stopServer(server);
  });

  it("should throw error when the query parameters don't match the definition", async () => {
    const USER_ID = "0";
    const getUser = GET("/users", {
      status: 200,
      query: {
        userId: z.string(),
      },
    });
    const api = apiDefinition({
      docs: {
        info: {
          title: "",
          version: "",
        },
      },
      endpoints: { getUser },
    });
    const routes = apiRoutes(api);
    routes.getUser(async () => fail());
    const app = express();
    app.use(routes);
    const server = await createServer(app);
    const client = createClient(server);
    const response = await client.get(`/users?useTyporId=${USER_ID}`);
    expect(response.status).toBe(500);
    await stopServer(server);
  });

  it("should take headers from the request headers", async () => {
    const USER_ID = "0";
    let getUserCalled = 0;
    const getUser = GET("/users", {
      status: 200,
      headers: {
        "User-ID": z.string(),
      },
    });
    const api = apiDefinition({
      docs: {
        info: {
          title: "",
          version: "",
        },
      },
      endpoints: { getUser },
    });
    const routes = apiRoutes(api);
    routes.getUser(async (call) => {
      getUserCalled++;
      expect(call.params["User-ID"]).toBe(USER_ID);
      await call.respond();
    });
    const app = express();
    app.use(routes);
    const server = await createServer(app);
    const client = createClient(server);
    expect(getUserCalled).toBe(0);
    const response = await client.get("/users", { headers: { "User-ID": USER_ID } });
    expect(response.status).toBe(200);
    expect(getUserCalled).toBe(1);
    await stopServer(server);
  });

  it("should throw error when there are missing headers", async () => {
    const getUser = GET("/users", {
      status: 200,
      headers: {
        "User-ID": z.string(),
      },
    });
    const api = apiDefinition({
      docs: {
        info: {
          title: "",
          version: "",
        },
      },
      endpoints: { getUser },
    });
    const routes = apiRoutes(api);
    routes.getUser(async () => fail());
    const app = express();
    app.use(routes);
    const server = await createServer(app);
    const client = createClient(server);
    const response = await client.get("/users");
    expect(response.status).toBe(500);
    await stopServer(server);
  });

  it("should take body from the request body", async () => {
    const USER_ID = "0";
    let getUserCalled = 0;
    const createUser = POST("/users", {
      status: 201,
      requestBody: z.strictObject({
        userId: z.string(),
      }),
    });
    const api = apiDefinition({
      docs: {
        info: {
          title: "",
          version: "",
        },
      },
      endpoints: { createUser },
    });
    const routes = apiRoutes(api);
    routes.createUser(async (call) => {
      getUserCalled++;
      expect(call.requestBody.userId).toBe(USER_ID);
      await call.respond();
    });
    const app = express();
    app.use(routes);
    const server = await createServer(app);
    const client = createClient(server);
    expect(getUserCalled).toBe(0);
    const response = await client.post("/users", { userId: USER_ID });
    expect(response.status).toBe(201);
    expect(getUserCalled).toBe(1);
    await stopServer(server);
  });

  it("should throw error when the request body is invalid", async () => {
    const createUser = POST("/users", {
      status: 201,
      requestBody: z.strictObject({
        userId: z.string(),
      }),
    });
    const api = apiDefinition({
      docs: {
        info: {
          title: "",
          version: "",
        },
      },
      endpoints: { createUser },
    });
    const routes = apiRoutes(api);
    routes.createUser(async () => fail());
    const app = express();
    app.use(routes);
    const server = await createServer(app);
    const client = createClient(server);
    const response = await client.post("/users", { userId: 1 });
    expect(response.status).toBe(500);
    await stopServer(server);
  });

  it("should send response body with 'respond' function", async () => {
    const USER_ID = "0";
    let getUserCalled = 0;
    const getUser = GET("/users", {
      status: 200,
      responseBody: z.object({
        userId: z.string(),
      }),
    });
    const api = apiDefinition({
      docs: {
        info: {
          title: "",
          version: "",
        },
      },
      endpoints: { getUser },
    });
    const routes = apiRoutes(api);
    routes.getUser(async (call) => {
      getUserCalled++;
      await call.respond({
        userId: USER_ID,
      });
    });
    const app = express();
    app.use(routes);
    const server = await createServer(app);
    const client = createClient(server);
    expect(getUserCalled).toBe(0);
    const response = await client.get("/users");
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ userId: USER_ID });
    expect(getUserCalled).toBe(1);
    await stopServer(server);
  });

  it("should throw error when the response body is invalid", async () => {
    let getUserCalled = 0;
    const getUser = GET("/users", {
      status: 200,
      responseBody: z.object({
        userId: z.string(),
      }),
    });
    const api = apiDefinition({
      docs: {
        info: {
          title: "",
          version: "",
        },
      },
      endpoints: { getUser },
    });
    const routes = apiRoutes(api);
    routes.getUser(async (call) => {
      getUserCalled++;
      await call.respond({ userId: 0 as any });
    });
    const app = express();
    app.use(routes);
    const server = await createServer(app);
    const client = createClient(server);
    expect(getUserCalled).toBe(0);
    const response = await client.get("/users");
    expect(response.status).toBe(500);
    expect(getUserCalled).toBe(1);
    await stopServer(server);
  });
});
