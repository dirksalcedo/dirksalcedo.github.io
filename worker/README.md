# Contact form Worker

Cloudflare Worker behind the form on `/contact`. It checks the Cloudflare
Turnstile token, then sends the message through [Resend](https://resend.com)
to the address in the `TO_EMAIL` secret. The visitor's address is set as
Reply-To, so you can answer straight from your inbox.

## Setup

1. **Turnstile**: in the Cloudflare dashboard, go to Turnstile → Add widget.
   Add the hostnames `dirksalcedo.com` and `www.dirksalcedo.com` and choose
   the Managed mode. Note the site key (public, goes in `contact.html`) and
   the secret key.
2. **Resend**: create an account, add the domain `dirksalcedo.com`, and add
   the DNS records it lists at your registrar. They live on `send.` and
   `resend._domainkey.`, so they don't affect the Proton Mail records. Then
   create an API key with "Sending access".
3. **Deploy the Worker** from this folder:

   ```sh
   npx wrangler login
   npx wrangler secret put TURNSTILE_SECRET
   npx wrangler secret put RESEND_API_KEY
   npx wrangler secret put TO_EMAIL
   npx wrangler deploy
   ```

   The deploy prints the Worker URL, e.g.
   `https://dirksalcedo-contact.<your-subdomain>.workers.dev`.
4. In `contact.html`, set the form `action` to the Worker URL and
   `data-sitekey` to the Turnstile site key.
