type CookieValue = {
  name: string;
  value: string;
};

type CookieStore = {
  get: (name: string) => CookieValue | undefined;
  set: (
    name: string,
    value: string,
    options?: {
      httpOnly?: boolean;
      sameSite?: "lax" | "strict" | "none";
      secure?: boolean;
      path?: string;
      expires?: Date;
    },
  ) => void;
  delete: (name: string) => void;
};

const values = new Map<string, string>();

function makeStore(): CookieStore {
  return {
    get(name) {
      const value = values.get(name);

      if (!value) {
        return undefined;
      }

      return {
        name,
        value,
      };
    },
    set(name, value) {
      values.set(name, value);
    },
    delete(name) {
      values.delete(name);
    },
  };
}

export async function cookies(): Promise<CookieStore> {
  return makeStore();
}
