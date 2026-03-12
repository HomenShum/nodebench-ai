"""
Wrapper for Google TimesFM zero-shot forecasting.

Loads the TimesFM checkpoint when available.
Falls back gracefully if timesfm is not installed.
"""

import logging
from typing import Optional

import numpy as np

logger = logging.getLogger("tsfm-inference.timesfm")

# ---------------------------------------------------------------------------
# Optional import
# ---------------------------------------------------------------------------
_timesfm = None

try:
    import timesfm as _tfm  # type: ignore[import-untyped]

    _timesfm = _tfm
except ImportError:
    logger.info("timesfm not installed — TimesFM unavailable")


# ---------------------------------------------------------------------------
# Wrapper
# ---------------------------------------------------------------------------
class TimesFMWrapper:
    """Thin wrapper around Google TimesFM."""

    def __init__(self) -> None:
        self._model: Optional[object] = None
        self.available = False

        if _timesfm is None:
            logger.info("TimesFM model not available (missing dep)")
            return

        try:
            hparams = _timesfm.TimesFmHparams(
                per_core_batch_size=32,
                horizon_len=128,
            )
            self._model = _timesfm.TimesFm(hparams=hparams)
            self._model.load_from_checkpoint()
            self.available = True
            logger.info("TimesFM loaded")
        except Exception as exc:
            logger.warning("Failed to load TimesFM: %s", exc)

    # ------------------------------------------------------------------
    def forecast(
        self,
        values: np.ndarray,
        horizon: int,
        confidence_level: float = 0.9,
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Return (predicted, lower, upper) arrays of length *horizon*."""
        if not self.available or self._model is None:
            raise RuntimeError("TimesFM not available")

        # TimesFM is deterministic — multiple passes produce identical results,
        # so multi-pass quantile estimation yields zero-width intervals.
        # Instead, use residual-based intervals from an in-sample forecast.
        inputs = [values.tolist()]
        freq = [0] * len(inputs)  # 0 = unknown frequency

        point_forecast, _ = self._model.forecast(inputs, freq=freq)
        predicted = np.asarray(point_forecast[0], dtype=np.float64)

        # Trim or pad to exact horizon
        if len(predicted) >= horizon:
            predicted = predicted[:horizon]
        else:
            last = predicted[-1] if len(predicted) > 0 else values[-1]
            predicted = np.concatenate([predicted, np.full(horizon - len(predicted), last)])

        # Compute residual-based confidence intervals from in-sample fit
        n = len(values)
        if n > 1:
            in_sample_input = [values[:-1].tolist()]
            in_sample_freq = [0]
            in_sample_fc, _ = self._model.forecast(in_sample_input, freq=in_sample_freq)
            in_sample_pred = np.asarray(in_sample_fc[0], dtype=np.float64)
            # Compare the first predicted value to the actual last value
            overlap = min(len(in_sample_pred), 1)
            residuals = values[-overlap:] - in_sample_pred[:overlap]
            residual_std = float(np.std(residuals, ddof=0)) if len(residuals) > 0 else 0.0
            # Fallback: use std of the input series differences
            if residual_std == 0.0:
                residual_std = float(np.std(np.diff(values), ddof=1)) if n > 2 else 0.0
        else:
            residual_std = 0.0

        if residual_std == 0.0:
            residual_std = max(abs(float(np.mean(values))) * 0.05, 1e-6)

        from scipy.stats import norm as _norm
        z = _norm.ppf((1.0 + confidence_level) / 2.0)
        widths = z * residual_std * np.sqrt(np.arange(1, horizon + 1, dtype=np.float64))

        lower = predicted - widths
        upper = predicted + widths

        return predicted, lower, upper
