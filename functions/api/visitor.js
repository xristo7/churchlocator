import worker from "../../src/worker.js";

export async function onRequest({ request, env }) {
  return worker.fetch(request, env);
}
