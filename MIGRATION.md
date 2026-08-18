# Moving off Vercel

Staging onto Homelab, production onto Prodlab.

One piece of the app has to be rewritten. Everything else is copying patterns already
running on both boxes.

Figures measured 2026-08-18. Environment details from the Home Lab vault; storage and
waiver counts read from the live production database.

---

## Where it lands

| | Staging — Homelab | Production — Prodlab |
|---|---|---|
| Host | 192.168.1.250 | `prodlab-1`, us-west-2 |
| Free | 28 GB RAM, 821 GB disk | 2.6 GB RAM, 63 GB disk |
| URL | `fightclub.rbennion.net` | `fightclub.cloudbiz.com` |
| Port | 3008 (3000–3007 taken) | internal 3000 on `edge` |
| Ingress | `atlashr-tunnel` | `prodlab-tunnel` |
| Database | `fightclub-db`, already running on 5435 | new container, `wlcms-db` pattern |

Everything else the app needs already exists on both machines: GitHub Actions runners,
a Cloudflare tunnel, and a working Postgres-in-Docker pattern.

Current storage footprint: 35 files, 23 MB.

---

## What actually changes

The app is a stock Next.js 14 site talking to Postgres with its own sign-in. Login,
email through Microsoft 365, PDF generation, and every database call are already
portable — they move untouched.

One dependency is Vercel-only: file storage. Ten files use it, for certification
documents and waiver PDFs. That is the whole of the code work.

---

## The plan

### 1. Replace Vercel file storage

Swap in MinIO, which speaks the S3 protocol. That matters because the browser currently
uploads straight to storage using a short-lived signed link, and S3 signed links work the
same way — the upload flow keeps its shape instead of being redesigned.

- Write one storage module covering the four things the app does: store, delete, check
  existence, and stream a private file back through the app.
- Point the ten call sites at it and drop the `@vercel/blob` dependency.
- Copy the existing 35 files across. Paths stay identical, so nothing in the database
  needs rewriting.

Keep the 10 MB ceiling. It is enforced in the browser today and should stay — not because
MinIO needs it, but because a 15 MB phone photo of a form is still a bad thing to store
forever.

### 2. Containerise

A Dockerfile plus a compose file per environment, matching the layout every other project
on these boxes already uses.

- Turn on Next.js standalone output so the image stays small.
- Bundle the Postgres client tools — the backup and restore scripts shell out to them.

**Database migrations have to move.** Today they run during the build, which works only
because Vercel builds with the production database reachable. In this setup the image is
built in CI with no database in sight. Run them from the container's startup script
instead, before the app boots.

### 3. Stand up staging (Homelab)

The easiest phase — the database is already there and already holds a working copy of the
data.

```sh
# extend the compose file that already runs fightclub-db
~/fightclub/docker-compose.yml   # → add app (3008) + minio

# join the shared tunnel so the public hostname resolves
docker network connect fightclub_default atlashr-tunnel
```

- Add the hostname to the tunnel, and a DNS rewrite so it resolves over Traefik on the
  LAN too.
- Staging keeps its own storage bucket and its own database. Nothing is shared with
  production.

### 4. Stand up production (Prodlab)

- New Postgres container following the `wlcms-db` pattern — including binding it to the
  private Tailscale address rather than the public interface.
- App and MinIO on the `edge` network so the tunnel can reach them.
- One ingress line added to `~/.cloudflared/config.yml`, then restart the tunnel.
- Move the data across from Neon. This needs the version 17 Postgres client — the older
  one on the Mac cannot dump from Neon.

### 5. Wire the pipeline

Copy what Lomack already does. Both machines have runners, so nothing new is needed.

- One workflow builds the image, pushes it to the registry, and deploys staging
  automatically on every push to main.
- A second workflow promotes a chosen commit to production, triggered by hand. Promotion
  re-tags an image that has already been running on staging, so production always gets the
  exact build you tested.

### 6. Cut over

**Five waiver links will break.** Production has five waivers sent but not yet signed.
Each link was built from the app's address at the time it was emailed, so it points at the
Vercel domain. Changing the domain kills them. Either keep the Vercel deployment alive
purely as a redirect until those five are signed or expire, or re-send them after the
move. Re-sending is cleaner.

- Run both side by side first — production data restored onto Prodlab, Vercel still
  serving — and confirm the app behaves before flipping the hostname.
- Flip the tunnel entry. No DNS change, no visible gap.
- Leave Vercel deployed but unrouted for a week before deleting anything.

---

## Settings that change

Most of the app's configuration carries over untouched. These are the ones that move:

| Setting | Now | After |
|---|---|---|
| `POSTGRES_URL` | Neon | Container on the same host |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob | Replaced by S3 endpoint, bucket, and key pair |
| `NEXT_PUBLIC_APP_URL` | `cms-eight-silk.vercel.app` | `fightclub.rbennion.net` / `fightclub.cloudbiz.com` — waiver links are built from this |
| `NEXTAUTH_URL` | `cms-eight-silk.vercel.app` | Same, per environment |
| Microsoft 365 and mail settings | — | Unchanged, same six values in both environments |

---

## What you give up

Neon gives you point-in-time recovery over the last 24 hours. That is currently the
rollback net for a bad migration, and self-hosting removes it.

Lightsail snapshots run daily and keep seven days, which covers losing the machine but not
an unwanted change made an hour ago. Close the gap with a scheduled database dump off-box —
nightly at minimum — before production carries real data.

The second cost is blast radius. One 4 GB machine already runs three other client
workloads, and this adds a database and a storage service to it. A runaway query now has
neighbours.

---

## Decisions (settled 2026-08-18)

**Production address — `fightclub.cloudbiz.com`.**
Matches every other Prodlab hostname (`lomack.`, `zentownwellness.`, `algolia.`). Staging
stays `fightclub.rbennion.net`. Same name in both places, only the domain differs.

**The database moves.**
Off Neon, into a container on the same host as the app. Leaving it on Neon would mean every
page load crossing the internet to fetch data, and this app runs several queries per page.

**Files go in a storage service, not a plain folder.**
The browser currently uploads straight to storage without passing through the app — that is
what allows 10 MB files. A plain folder cannot accept a browser upload directly, so every
file would route back through the app and reintroduce the size ceiling. MinIO speaks the
same protocol as Amazon's storage and keeps the existing upload path intact, for about
100 MB of memory.

**Start now.**
One thing goes out ahead of it: the certification fix, which is written and waiting on QA.
Production cannot save anything in that section today, and this migration will take longer
than the staff can wait. Ship that to Vercel first, then migrate.
