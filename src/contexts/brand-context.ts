import { createContext, useContext } from "react";

import { brand, type CloneBrand } from "@/config/brand";

export const BrandContext = createContext<CloneBrand>(brand);

export function useBrand(): CloneBrand {
  return useContext(BrandContext);
}
