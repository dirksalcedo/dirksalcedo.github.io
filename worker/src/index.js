const MAX = { name: 100, email: 200, message: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim());
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    };
    const reply = (status, body) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...cors, "Content-Type": "application/json" },
      });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return reply(405, { ok: false, error: "Method not allowed." });
    if (!allowed.includes(origin)) return reply(403, { ok: false, error: "Forbidden." });

    let form;
    try {
      form = await request.formData();
    } catch {
      return reply(400, { ok: false, error: "Invalid form data." });
    }

    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const message = String(form.get("message") || "").trim();
    const token = String(form.get("cf-turnstile-response") || "");

    if (!name || !email || !message) return reply(400, { ok: false, error: "Please fill in every field." });
    if (name.length > MAX.name || email.length > MAX.email || message.length > MAX.message)
      return reply(400, { ok: false, error: "One of the fields is too long." });
    if (!EMAIL_RE.test(email)) return reply(400, { ok: false, error: "Please enter a valid email address." });
    if (!token) return reply(400, { ok: false, error: "Please complete the verification." });

    const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET,
        response: token,
        remoteip: request.headers.get("CF-Connecting-IP") || undefined,
      }),
    }).then((r) => r.json()).catch(() => ({ success: false }));

    const allowedHosts = allowed.map((o) => new URL(o).hostname);
    if (!verify.success || (verify.hostname && !allowedHosts.includes(verify.hostname)))
      return reply(403, { ok: false, error: "Verification failed. Please try again." });

    const sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        to: [env.TO_EMAIL],
        reply_to: email,
        subject: `Contact form: ${name.replace(/[\r\n]+/g, " ")}`,
        text: `From: ${name} <${email}>\n\n${message}`,
      }),
    }).catch(() => null);

    if (!sent || !sent.ok) return reply(502, { ok: false, error: "Couldn't send your message. Please try again later." });
    return reply(200, { ok: true });
  },
};
