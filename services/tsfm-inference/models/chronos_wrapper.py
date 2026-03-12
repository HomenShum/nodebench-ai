"""
Wrapper for Amazon Chronos-T5 zero-shot forecasting.

Loads ChronosPipeline from pretrained weights when available.
Falls back gracefully if chronos-forecasting or torch is not installed.
"""

import logging
from typing import Optional

import numpy as np

logger = logging.getLogger("tsfm-inference.chronos")

# ---------------------------------------------------------------------------
# Optional imports
# ---------------------------------------------------------------------------
_ChronosPipeline = None
_torch = None

try:
    import torch as _torch_mod

    _torch = _torch_mod
except ImportError:
    logger.info("torch not installed — Chronos unavailable")

if _torch is not None:
    try:
        from chronos import ChronosPipeline as _CP  # type: ignore[import-untyped]

        _ChronosPipeline = _CP
    except ImportError:
        logger.info("chronos-forecasting not installed — Chronos unavailable")


# ---------------------------------------------------------------------------
# Wrapper
# ---------------------------------------------------------------------------
class ChronosWrapper:
    """Thin wrapper around Amazon Chronos-T5."""

    MODEL_ID = "amazon/chronos-t5-large"
    NUM_SAMPLES = 20  # posterior samples for confidence intervals

    def __init__(self) -> None:
        self._pipeline: Optional[object] = None
        self.available = False

        if _ChronosPipeline is None or _torch is None:
            logger.info("Chronos model not available (missing deps)")
            return

        try:
            device = "cuda" if _torch.cuda.is_available() else "cpu"
            self._pipeline = _ChronosPipeline.from_pretrained(
                self.MODEL_ID,
                device_map=device,
                torch_dtype=_torch.float32,
            )
            self.available = True
            logger.info("Chronos loaded on %s", device)
        except Exception as exc:
            logger.warning("Failed to load Chronos: %s", exc)

    # ------------------------------------------------------------------
    def forecast(
        self,
        values: np.ndarray,
        horizon: int,
        confidence_level: float = 0.9,
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Return (predicted, lower, upper) arrays of length *horizon*."""
        if not self.available or self._pipeline is None or _torch is None:
            raise RuntimeError("Chronos not available")

        context = _torch.tensor(values, dtype=_torch.float32).unsqueeze(0)
        raw = self._pipeline.predict(context, prediction_length=horizon, num_samples=self.NUM_SAMPLES)
        # raw shape: (1, num_samples, horizon)
        samples = raw.squeeze(0).numpy()  # (num_samples, horizon)

        predicted = np.median(samples, axis=0)
        alpha = (1.0 - confidence_level) / 2.0
        lower = np.quantile(samples, alpha, axis=0)
        upper = np.quantile(samples, 1.0 - alpha, axis=0)

        return predicted, lower, upper
