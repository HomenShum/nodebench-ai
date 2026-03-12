"""
Pure statistical forecasting methods — zero ML dependencies.

Provides exponential smoothing, linear regression, and naive forecasting
with confidence interval estimation. Used as the always-available fallback
when Chronos / TimesFM are not installed.
"""

import numpy as np


class StatisticalFallback:
    """Deterministic statistical forecasting — always available."""

    available = True  # never fails

    def forecast(
        self,
        values: np.ndarray,
        horizon: int,
        confidence_level: float = 0.9,
        method: str = "auto",
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Return (predicted, lower, upper) arrays of length *horizon*.

        *method* can be "exponential_smoothing", "linear_regression",
        "naive", or "auto" (picks based on series characteristics).
        """
        if np.any(np.isnan(values)):
            empty = np.array([], dtype=np.float64)
            return empty, empty, empty

        if method == "auto":
            method = self._pick_method(values)

        if method == "exponential_smoothing":
            predicted, residuals = self._exponential_smoothing(values, horizon)
        elif method == "linear_regression":
            predicted, residuals = self._linear_regression(values, horizon)
        else:
            predicted, residuals = self._naive(values, horizon)

        lower, upper = self._confidence_intervals(predicted, residuals, confidence_level)
        return predicted, lower, upper

    # ------------------------------------------------------------------
    # Method selection
    # ------------------------------------------------------------------

    @staticmethod
    def _pick_method(values: np.ndarray) -> str:
        """Heuristic: use linear regression if there's a clear trend, else exponential smoothing."""
        if len(values) < 5:
            return "naive"
        # Quick trend test: correlation of values with their index
        x = np.arange(len(values), dtype=np.float64)
        corr_matrix = np.corrcoef(x, values)
        r = corr_matrix[0, 1] if not np.isnan(corr_matrix[0, 1]) else 0.0
        if abs(r) > 0.7:
            return "linear_regression"
        return "exponential_smoothing"

    # ------------------------------------------------------------------
    # Exponential smoothing (simple)
    # ------------------------------------------------------------------

    @staticmethod
    def _exponential_smoothing(
        values: np.ndarray,
        horizon: int,
        alpha: float = 0.3,
    ) -> tuple[np.ndarray, np.ndarray]:
        """Simple exponential smoothing with in-sample residuals."""
        n = len(values)
        smoothed = np.empty(n, dtype=np.float64)
        smoothed[0] = values[0]
        for i in range(1, n):
            smoothed[i] = alpha * values[i] + (1.0 - alpha) * smoothed[i - 1]

        residuals = values - smoothed
        last = smoothed[-1]
        predicted = np.full(horizon, last, dtype=np.float64)

        # Apply mild decay toward series mean for longer horizons
        series_mean = float(np.mean(values))
        decay = 0.98
        for i in range(horizon):
            predicted[i] = last * (decay ** (i + 1)) + series_mean * (1.0 - decay ** (i + 1))

        return predicted, residuals

    # ------------------------------------------------------------------
    # Linear regression
    # ------------------------------------------------------------------

    @staticmethod
    def _linear_regression(
        values: np.ndarray,
        horizon: int,
    ) -> tuple[np.ndarray, np.ndarray]:
        """OLS straight-line forecast."""
        n = len(values)
        x = np.arange(n, dtype=np.float64)
        x_mean = np.mean(x)
        y_mean = np.mean(values)

        ss_xy = np.sum((x - x_mean) * (values - y_mean))
        ss_xx = np.sum((x - x_mean) ** 2)

        if ss_xx == 0:
            slope = 0.0
        else:
            slope = float(ss_xy / ss_xx)
        intercept = float(y_mean - slope * x_mean)

        fitted = intercept + slope * x
        residuals = values - fitted

        future_x = np.arange(n, n + horizon, dtype=np.float64)
        predicted = intercept + slope * future_x

        return predicted, residuals

    # ------------------------------------------------------------------
    # Naive (last-value carry-forward)
    # ------------------------------------------------------------------

    @staticmethod
    def _naive(
        values: np.ndarray,
        horizon: int,
    ) -> tuple[np.ndarray, np.ndarray]:
        """Repeat last value; residuals from consecutive differences."""
        last = values[-1]
        predicted = np.full(horizon, last, dtype=np.float64)

        if len(values) > 1:
            residuals = np.diff(values)
        else:
            residuals = np.array([0.0])

        return predicted, residuals

    # ------------------------------------------------------------------
    # Confidence intervals
    # ------------------------------------------------------------------

    @staticmethod
    def _confidence_intervals(
        predicted: np.ndarray,
        residuals: np.ndarray,
        confidence_level: float,
    ) -> tuple[np.ndarray, np.ndarray]:
        """Normal-approximation intervals that widen with forecast horizon."""
        from scipy.stats import norm as _norm  # type: ignore[import-untyped]

        residual_std = float(np.std(residuals, ddof=1)) if len(residuals) > 1 else 0.0
        if residual_std == 0.0:
            # Fallback: use 5% of absolute mean as minimal spread
            residual_std = max(abs(float(np.mean(predicted))) * 0.05, 1e-6)

        z = _norm.ppf((1.0 + confidence_level) / 2.0)
        horizon = len(predicted)
        # Widen intervals as sqrt(step) — standard random-walk assumption
        widths = z * residual_std * np.sqrt(np.arange(1, horizon + 1, dtype=np.float64))

        lower = predicted - widths
        upper = predicted + widths
        return lower, upper


# ---------------------------------------------------------------------------
# Standalone convenience functions (same interface, module-level)
# ---------------------------------------------------------------------------
_fb = StatisticalFallback()


def exponential_smoothing(values: list[float], horizon: int, alpha: float = 0.3) -> dict:
    arr = np.asarray(values, dtype=np.float64)
    pred, resid = _fb._exponential_smoothing(arr, horizon, alpha)
    lo, hi = _fb._confidence_intervals(pred, resid, 0.9)
    return {"predicted": pred.tolist(), "lower": lo.tolist(), "upper": hi.tolist()}


def linear_regression_forecast(values: list[float], horizon: int) -> dict:
    arr = np.asarray(values, dtype=np.float64)
    pred, resid = _fb._linear_regression(arr, horizon)
    lo, hi = _fb._confidence_intervals(pred, resid, 0.9)
    return {"predicted": pred.tolist(), "lower": lo.tolist(), "upper": hi.tolist()}


def naive_forecast(values: list[float], horizon: int) -> dict:
    arr = np.asarray(values, dtype=np.float64)
    pred, resid = _fb._naive(arr, horizon)
    lo, hi = _fb._confidence_intervals(pred, resid, 0.9)
    return {"predicted": pred.tolist(), "lower": lo.tolist(), "upper": hi.tolist()}
