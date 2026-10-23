import { createHash } from "node:crypto";
import { prepareAiContext } from "../src/lib/aiEvidence";
import { parseFeatureAnswer } from "../src/lib/aiOutput";

const prepared = await prepareAiContext({ feature: "learning-roadmap", sampleId: "data-starter" });
const hash = createHash("sha256").update(JSON.stringify(prepared)).digest("hex");
// Offline mock: exercises the same schema and catalogue reference validator, without a provider call.
parseFeatureAnswer(JSON.stringify({
  explanation: "Practice the fictional learner's missing skills using the supplied learning records.",
  resources: prepared.resources.slice(0, 1).map(r => ({ resourceId: r.id, reason: "Practice a missing skill." })),
}), prepared);
console.log(JSON.stringify({ hash, context: prepared.context, evidence: prepared.evidence, resourceCount: prepared.resources.length }));
