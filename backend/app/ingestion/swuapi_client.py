"""Live swuapi.com fetch -- the real/ongoing-run data source.

Not exercised in CI (SWU_Catalog_Redesign_Spec.md §8.3: "no live
api.swuapi.com calls in CI"). The dev/test/CI input is the captured export
fixture loaded directly as a dict; this module exists only for the real
catalog-rebuild run.
"""

import httpx

EXPORT_ALL_URL = "https://api.swuapi.com/export/all"


def fetch_export(timeout: float = 60.0) -> dict:
    response = httpx.get(EXPORT_ALL_URL, timeout=timeout)
    response.raise_for_status()
    return response.json()
