import { useEffect, useRef } from "react";
import { useConvex } from "convex/react";
import { useConvexApi } from "@/lib/convexApi";
import { getAnonymousProductSessionId } from "./productIdentity";

export function useProductBootstrap() {
  const api = useConvexApi();
  const convex = useConvex();
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (!api?.domains.product.bootstrap.ensureCanonicalProductBootstrap) return;
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    void convex
      .mutation(api.domains.product.bootstrap.ensureCanonicalProductBootstrap, {
        anonymousSessionId: getAnonymousProductSessionId(),
      })
      .catch((error) => {
        console.error("[product] bootstrap failed", error);
      });
  }, [api, convex]);
}
