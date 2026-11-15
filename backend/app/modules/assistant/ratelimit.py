"""In memory sliding window rate limiter, per client address. Enough for a single process demo."""

import time
from collections import deque
from collections.abc import Callable
from threading import Lock


class RateLimiter:
    def __init__(self, per_minute: int, per_hour: int, clock: Callable[[], float] = time.monotonic) -> None:
        self._windows = ((60.0, per_minute), (3600.0, per_hour))
        self._clock = clock
        self._hits: dict[str, deque[float]] = {}
        self._lock = Lock()

    def check(self, key: str) -> float | None:
        """Records a hit and returns None, or returns the seconds to wait when the key is over a limit."""
        now = self._clock()
        with self._lock:
            hits = self._hits.setdefault(key, deque())
            while hits and now - hits[0] >= 3600.0:
                hits.popleft()
            for window, limit in self._windows:
                recent = [t for t in hits if now - t < window]
                if len(recent) >= limit:
                    return max(1.0, window - (now - recent[0]))
            hits.append(now)
            if len(self._hits) > 10_000:  # never grow without bound
                self._hits = {k: v for k, v in self._hits.items() if v and now - v[-1] < 3600.0}
            return None
