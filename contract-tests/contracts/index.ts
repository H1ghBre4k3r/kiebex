import { healthContract } from "./health";
import { routeInventoryContracts } from "./inventory";
import type { ContractCase } from "../types";

export const contracts: ContractCase[] = [healthContract, ...routeInventoryContracts];
