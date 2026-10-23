import { Router, type IRouter } from "express";
import { GetAiInfoResponse } from "@workspace/api-zod";
import { getAiDisclosure } from "../lib/aiDisclosure";

export function createAiInfoRouter(env: Record<string, string | undefined> = process.env): IRouter {
  const router = Router();
  router.get("/ai-info", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json(GetAiInfoResponse.parse(getAiDisclosure(env)));
  });
  return router;
}

export default createAiInfoRouter();
