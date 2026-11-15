"""Command line tools.

  python -m app.cli donki-snapshot [--days 30] [--out PATH]
      Fetch the last N days of DONKI events through the same connector as the API and write the
      bundled offline snapshot (mode "snapshot", real retrievedAt). Fails loudly when DONKI is
      unreachable: no event is ever invented.

  python -m app.cli openapi [--out PATH]
      Write the OpenAPI schema (input of `npm run api:types` in frontend/web).
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

import httpx

from app.core.cache import TTLCache
from app.core.config import Settings, get_settings
from app.modules.nasa.donki import DonkiClient, UpstreamError

REPO = Path(__file__).resolve().parents[2]
DEFAULT_SNAPSHOT = REPO / "frontend" / "web" / "src" / "data" / "nasa" / "donki-snapshot.json"
DEFAULT_OPENAPI = REPO / "backend" / "openapi.json"


async def _snapshot(settings: Settings, days: int) -> dict:
    async with httpx.AsyncClient(timeout=max(settings.http_timeout_seconds, 60), headers={"User-Agent": "AHI-hackathon-prototype snapshot script"}) as http:
        client = DonkiClient(http, settings.donki_base_url, TTLCache(0))
        snap = await client.snapshot(days, mode="snapshot")
    return snap.model_dump(mode="json")


def _write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    sub = parser.add_subparsers(dest="cmd", required=True)
    p_snap = sub.add_parser("donki-snapshot", help="write the bundled DONKI snapshot")
    p_snap.add_argument("--days", type=int, default=30)
    p_snap.add_argument("--out", type=Path, default=DEFAULT_SNAPSHOT)
    p_api = sub.add_parser("openapi", help="write the OpenAPI schema")
    p_api.add_argument("--out", type=Path, default=DEFAULT_OPENAPI)
    args = parser.parse_args(argv)

    if args.cmd == "donki-snapshot":
        try:
            data = asyncio.run(_snapshot(get_settings(), args.days))
        except UpstreamError as exc:
            print(f"DONKI not reachable, snapshot NOT written: {exc}", file=sys.stderr)
            return 2
        _write_json(args.out, data)
        kinds: dict[str, int] = {}
        for e in data["events"]:
            kinds[e["kind"]] = kinds.get(e["kind"], 0) + 1
        print(f"wrote {args.out} ({len(data['events'])} events {kinds}, retrievedAt {data['retrievedAt']})")
        return 0

    from app.main import create_app

    schema = create_app(Settings(DATABASE_URL="sqlite://"), migrate=False).openapi()  # type: ignore[call-arg]
    _write_json(args.out, schema)
    print(f"wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
