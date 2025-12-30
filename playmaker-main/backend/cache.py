"""
Simple in-memory cache middleware for FastAPI endpoints.
In production, replace with Redis for distributed caching.
"""
from datetime import datetime, timedelta
from typing import Any, Optional, Dict
import hashlib
import json
import logging

logger = logging.getLogger(__name__)


class SimpleCache:
    """Simple in-memory cache with TTL support."""

    def __init__(self):
        self._cache: Dict[str, Any] = {}
        self._expiry: Dict[str, datetime] = {}

    def _generate_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate cache key from prefix and arguments."""
        key_data = f"{prefix}:{json.dumps(args, sort_keys=True)}:{json.dumps(kwargs, sort_keys=True)}"
        return hashlib.md5(key_data.encode()).hexdigest()

    def get(self, key: str) -> Optional[Any]:
        """Get cached value if not expired."""
        if key not in self._cache:
            return None

        if key in self._expiry and datetime.utcnow() > self._expiry[key]:
            # Expired - clean up
            del self._cache[key]
            del self._expiry[key]
            return None

        return self._cache[key]

    def set(self, key: str, value: Any, ttl_seconds: int = 300):
        """Set cache value with TTL."""
        self._cache[key] = value
        self._expiry[key] = datetime.utcnow() + timedelta(seconds=ttl_seconds)
        logger.debug(f"Cache set: {key} (TTL: {ttl_seconds}s)")

    def delete(self, key: str):
        """Delete cached value."""
        if key in self._cache:
            del self._cache[key]
        if key in self._expiry:
            del self._expiry[key]

    def clear(self):
        """Clear all cached values."""
        self._cache.clear()
        self._expiry.clear()
        logger.info("Cache cleared")

    def cleanup_expired(self):
        """Remove all expired entries."""
        now = datetime.utcnow()
        expired_keys = [
            key for key, expiry in self._expiry.items()
            if now > expiry
        ]
        for key in expired_keys:
            self.delete(key)
        if expired_keys:
            logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")


# Global cache instance
cache = SimpleCache()
