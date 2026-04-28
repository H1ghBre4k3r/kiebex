export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ContractRequest = {
  method: HttpMethod;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
};

export type ContractResponse = {
  status: number;
  headers: Record<string, string>;
  body: unknown;
};

export type ContractContext = {
  baseUrl: string;
};

export type ContractCase = {
  name: string;
  request: ContractRequest;
  assert: (response: ContractResponse, context: ContractContext) => void | Promise<void>;
  normalize?: (response: ContractResponse) => ContractResponse;
};
