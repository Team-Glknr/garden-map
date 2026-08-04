#!/usr/bin/env python3
"""
nc_extension_photos.py — Download, resize, and permanently host each plant's
primary photo in Supabase Storage.

Why this exists: NC Extension's photo URLs are S3 links signed with a
1-HOUR expiry, generated fresh on every page load. They cannot be scraped
once and reused later — by the time a batch scrape finishes and a separate
import runs, the URLs are already dead. So this script does everything for
one plant in a single pass — fetch page, download the primary photo,
resize, upload, update the DB row — well within that 1-hour window, then
moves to the next plant.

Only the primary photo per plant is stored (not the full gallery), resized
to fit within Supabase's free-tier 1 GB file storage limit. See
docs/plant-attribute-review.md or project memory for the storage math.

Usage:
  python3 scripts/nc_extension_photos.py [--limit N] [--slug SLUG] [--dry-run] [--force]

Options:
  --dry-run   Fetch, download, and resize, but skip upload and DB write
  --force     Reprocess plants that already have a hosted photo
  --limit N   Only process first N plants
  --slug S    Only process this plant

Requires: Pillow, psycopg2-binary
Env: DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
"""

import argparse
import io
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from nc_extension_scraper import fetch, parse_media, BASE, DELAY  # noqa: E402

MAX_DIM = 800          # max width/height in px
WEBP_QUALITY = 80
BUCKET = "plant-photos"
MAX_BYTES = 5 * 1024 * 1024  # matches bucket's file_size_limit


def download(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "garden-map-importer/1.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def resize_to_webp(raw: bytes) -> bytes:
    from PIL import Image

    img = Image.open(io.BytesIO(raw))
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    img.thumbnail((MAX_DIM, MAX_DIM), Image.LANCZOS)
    out = io.BytesIO()
    img.save(out, format="WEBP", quality=WEBP_QUALITY)
    return out.getvalue()


def upload_to_storage(supabase_url: str, service_key: str, path: str, data: bytes) -> str:
    req = urllib.request.Request(
        f"{supabase_url}/storage/v1/object/{BUCKET}/{path}",
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {service_key}",
            "apikey": service_key,
            "Content-Type": "image/webp",
            "x-upsert": "true",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        r.read()
    return f"{supabase_url}/storage/v1/object/public/{BUCKET}/{path}"


def already_hosted(cur, plant_id: str) -> bool:
    cur.execute(
        "SELECT 1 FROM plant_media WHERE plant_id = %s AND original_url LIKE %s LIMIT 1",
        (plant_id, "%/storage/v1/object/public/%"),
    )
    return cur.fetchone() is not None


def process_plant(cur, plant_id: str, slug: str, supabase_url: str, service_key: str,
                   dry_run: bool) -> str:
    html = fetch(f"{BASE}/plants/{slug}/")
    media = parse_media(html)
    if not media:
        return "no-photo"

    primary = next((m for m in media if m.get("is_primary")), media[0])
    raw = download(primary["original_url"])
    webp = resize_to_webp(raw)
    if len(webp) > MAX_BYTES:
        return f"too-large ({len(webp)} bytes)"

    if dry_run:
        print(f"    [dry-run] would upload {len(webp)} bytes for {slug}")
        return "dry-run-ok"

    path = f"{slug}.webp"
    public_url = upload_to_storage(supabase_url, service_key, path, webp)

    cur.execute("DELETE FROM plant_media WHERE plant_id = %s AND source = 'nc_extension'", (plant_id,))
    cur.execute(
        """INSERT INTO plant_media
           (plant_id, media_type, original_url, caption, photographer,
            license_name, license_url, is_primary, source)
           VALUES (%s, 'image', %s, %s, %s, %s, %s, TRUE, 'nc_extension')""",
        (plant_id, public_url, primary.get("caption"), primary.get("photographer"),
         primary.get("license_name"), primary.get("license_url")),
    )
    return f"ok ({len(webp)} bytes)"


def run(args):
    import psycopg2

    db_url = os.environ.get("DATABASE_URL")
    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not db_url:
        sys.exit("ERROR: DATABASE_URL not set")
    if not args.dry_run and not (supabase_url and service_key):
        sys.exit("ERROR: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set")

    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    where = "nc_extension_slug IS NOT NULL"
    params = []
    if args.slug:
        where += " AND nc_extension_slug = %s"
        params.append(args.slug)
    cur.execute(f"SELECT id, nc_extension_slug FROM plants WHERE {where} ORDER BY nc_extension_slug", params)
    rows = cur.fetchall()
    if args.limit:
        rows = rows[: args.limit]

    print(f"{len(rows)} plant(s) to consider")

    done = skipped = errors = total_bytes = 0
    for i, (plant_id, slug) in enumerate(rows, 1):
        if not args.force and not args.dry_run and already_hosted(cur, plant_id):
            skipped += 1
            continue
        try:
            result = process_plant(cur, plant_id, slug, supabase_url, service_key, args.dry_run)
            if not args.dry_run:
                conn.commit()
            if result.startswith("ok"):
                done += 1
                size = int(result.split("(")[1].split()[0])
                total_bytes += size
            else:
                skipped += 1
            if i % 50 == 0:
                print(f"  {i}/{len(rows)}  done={done} skipped={skipped} errors={errors} "
                      f"uploaded={total_bytes / 1024 / 1024:.1f} MB", flush=True)
        except Exception as e:
            errors += 1
            print(f"  ERROR [{slug}]: {e}")
            conn.rollback()
        time.sleep(DELAY)

    conn.close()
    print(f"\nDone: {done} uploaded, {skipped} skipped, {errors} errors, "
          f"{total_bytes / 1024 / 1024:.1f} MB uploaded")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int)
    ap.add_argument("--slug")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force", action="store_true")
    run(ap.parse_args())


if __name__ == "__main__":
    main()
