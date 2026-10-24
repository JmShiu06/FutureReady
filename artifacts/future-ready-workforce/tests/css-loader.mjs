/** Treat stylesheet imports as side-effect-free during Node-only domain tests. */
export async function load(url, context, nextLoad) {
  if (new URL(url).pathname.endsWith(".css")) {
    return {
      format: "module",
      source: "export default undefined;",
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
