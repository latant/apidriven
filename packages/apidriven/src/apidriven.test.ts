import { apiDefinition, GET } from "./apidriven";

describe("base tests", () => {
  it("should work with a single endpoint", () => {
    const getUser = GET("/user", {
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
    expect(api.endpoints.getUser.path).toEqual("/user");
  });
  
  it("should work with a single endpoint and a param", () => {
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
    expect(api.endpoints.getUser.params).toEqual(["userId"]);
  });
});