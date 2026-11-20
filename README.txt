AETHER CLIENT — PRIVATE APPROVAL PORTAL
========================================

WHAT IS IN THIS REPOSITORY
- index.html / styles.css: responsive AETHER CLIENT member portal.
- app.js: Supabase registration, sign-in, approval status, owner console and signed-download flow.
- config.js: browser-safe Supabase URL and publishable key.
- supabase-setup.sql: database, row-level security, private Storage bucket and owner bootstrap.
- AETHER_CLIENT_Private_Approval_Website (2).zip: an earlier website package.

ACCESS FLOW
1. A visitor registers with email and password.
2. Supabase creates a profile with status=pending.
3. The owner signs in and approves or revokes accounts in the Owner Console.
4. Only approved accounts and the owner can request a short-lived signed download URL.
5. The client ZIP must live in the private Supabase Storage bucket, never in the public website repository.

SUPABASE PROJECT CONFIGURATION
The current config.js points to project qvpjbpjwnmefidfwpafe and uses its publishable key. Publishable keys are intended for browser use; never put a Supabase secret/service_role key in config.js.

OWNER
Current owner email: gjha75363@gmail.com.
The owner profile was bootstrapped in the connected Supabase project. If setting up a fresh project, register this email first, then run the owner UPDATE at the bottom of supabase-setup.sql.

CLIENT DOWNLOAD FILE — STILL REQUIRED
The website expects this exact object in the PRIVATE bucket aether-downloads:
AETHER_CLIENT_1.21.11_v1.5_Practice_Source.zip

That client ZIP is not present in the connected repository or the accessible project files, so it has NOT been uploaded and downloads will remain unavailable until the actual ZIP is added. Do not substitute the website ZIP for the Minecraft client ZIP. Upload the actual client package to Supabase Storage with the exact filename above.

DEPLOYMENT
The frontend files are committed to the main branch. A live hosting URL has not been verified from this repository connection. To publish with GitHub Pages: open repository Settings > Pages > Deploy from a branch > select main and /(root) > Save. Then add the resulting site URL to Supabase Authentication > URL Configuration (Site URL and allowed Redirect URLs).

FINAL TEST
- Register and confirm the owner account if email confirmation is enabled.
- Sign in as gjha75363@gmail.com and confirm the Owner Console appears.
- Register a second test email. It should be pending and unable to download.
- Approve it from the owner console and verify a signed download is generated after the client ZIP is uploaded.
- Revoke it and verify the download is blocked.

SECURITY
- Keep aether-downloads PRIVATE.
- Never commit the client ZIP to this public repository.
- Never expose a service_role/secret key in browser code.
- Configure Supabase Auth email confirmation and redirect URLs.
- The current setup does not include CAPTCHA, rate limiting, or email notifications.
