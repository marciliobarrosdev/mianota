import { queryOptions } from "@tanstack/react-query";
import { getPublicPlans } from "./public-plans.functions";

export const publicPlansQuery = () => queryOptions({
  queryKey: ["public-plans"],
  queryFn: () => getPublicPlans(),
  staleTime: 30_000,
});