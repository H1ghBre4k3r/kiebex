import Module from "node:module";

const cookieValues = new Map();
const originalLoad = Module._load;

async function cookies() {
  return {
    get(name) {
      const value = cookieValues.get(name);

      if (!value) {
        return undefined;
      }

      return { name, value };
    },
    set(name, value) {
      cookieValues.set(name, value);
    },
    delete(name) {
      cookieValues.delete(name);
    },
  };
}

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "server-only") {
    return {};
  }

  if (request === "next/headers") {
    return { cookies };
  }

  return originalLoad.call(this, request, parent, isMain);
};
