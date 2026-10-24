import { checkRequest } from "../lib/check.js";

async function bodyOf(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

export default async function handler(req, res) {
  const send = (out) => res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }).end(JSON.stringify(out));
  if (req.method !== "POST") return send({ ok: false, reason: "The check is a POST." });
  try {
    const body = await bodyOf(req);
    const out = await checkRequest({
      count: body.count,
      direction: body.direction,
      observations: body.observations,
      lang: body.lang === "pt" ? "pt" : "en",
    });
    send(out);
  } catch {
    send({ ok: false, reason: "The check could not be read." });
  }
}
