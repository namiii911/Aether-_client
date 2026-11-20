AETHER CLIENT — PRIVATE APPROVAL PORTAL
========================================

IMPORTANT
This is a front-end portal plus Supabase database/storage setup. A static website alone cannot securely approve people or protect a downloadable file. This package uses Supabase Auth, Postgres Row Level Security, and a PRIVATE Storage bucket. Do not publish the client ZIP in the public website folder/repository.

WHAT IT DOES
- Visitors create an account with email/password.
- New accounts are pending by default.
- Only the owner/admin can approve or revoke accounts.
- Approved users receive a short-lived signed download URL from a private Storage bucket.
- Owner dashboard lists accounts and provides Approve/Revoke controls.

YOU NEED
- A GitHub account (or another static hosting provider).
- A Supabase account/project.
- The AETHER CLIENT source ZIP.
- Your owner email address.

CURRENT STATUS
The GitHub Pages frontend is published. The Supabase owner bootstrap, private Storage bucket, client ZIP upload, and end-to-end test still need to be completed before members can use downloads.

SETUP
1. Create a Supabase project.
2. In Supabase, open SQL Editor and run `supabase-setup.sql`.
3. In Storage, create a bucket named `aether-downloads` and make sure it is PRIVATE (not public).
4. Upload `AETHER_CLIENT_1.21.11_v1.4_Mace_Spear_Crystal.zip` to that bucket with exactly that filename.
   The source ZIP is included in this package if it was available at build time.
5. Open Project Settings > API. Copy the Project URL and publishable/anon key.
6. Edit `config.js`:
   - supabaseUrl = your Project URL
   - supabaseAnonKey = your publishable/anon key
   - ownerEmail = your email (informational; owner permissions are set in SQL)
   Never use or expose a service_role/secret key in the website.
7. Upload the website files (index.html, styles.css, app.js, config.js) to a GitHub repository.
   Do NOT upload the client ZIP to the public GitHub repository. Keep it in the private Supabase bucket only.
8. Enable GitHub Pages: repository Settings > Pages > Deploy from a branch > main > /(root) > Save.
9. Open your published site and sign up using your owner email.
10. After you register on the site using `gjha4456@gmail.com`, run the uncommented owner bootstrap query at the bottom of `supabase-setup.sql`. It grants admin access only to that registered account.
11. Sign in again on the site. You should see the Owner Console.
12. Send the website URL to people. They can request accounts; you approve or revoke them from the owner console.

SECURITY NOTES
- Supabase anon/publishable key is designed to be exposed in browser apps; RLS policies are the security boundary.
- Never put a service_role key in config.js or any browser file.
- A Supabase secret key was previously committed to this public repository. Rotate/revoke that key in Supabase immediately; deleting it from the latest file does not remove it from Git history.
- Keep the Storage bucket private. Do not create a public bucket or public object URL.
- If you enable email confirmation in Supabase Auth, users must confirm their email before signing in.
- Configure Supabase Auth URL settings with your deployed website URL and local preview URL if needed.
- This starter setup does not provide rate limiting, CAPTCHA, audit logs, or automated email notifications. For a large public audience, add those before launch.
- Test with a second email: verify it is pending, cannot download, then approve it as owner and verify download works. Revoke it and verify access is blocked.
- Only share gameplay automation for private worlds/servers where the owner and participants agree. Respect server rules.
- The included client source is not compiled or game-tested and contains placeholder modules; disclose that to users.
