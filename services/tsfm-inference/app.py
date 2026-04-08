"""
TSFM Inference Microservice — Math Engine (Lane A)
Zero-shot forecasting on numeric sequences using Amazon Chronos, Google TimesFM,
or pure statistical fallback methods.
"""

import os
import time
import uuid
import logging
from typing import Optional

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from models.chronos_wrapper import ChronosWrapper
from models.timesfm_wrapper import TimesFMWrapper
from models.statistical_fallback import StatisticalFallback

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("tsfm-inference")

# ---------------------------------------------------------------------------
# GPU detection (optional torch)
# ---------------------------------------------------------------------------
GPU_AVAILABLE = False
try:
    import torch

    GPU_AVAILABLE = torch.cuda.is_available()
except ImportError:
    pass

# ---------------------------------------------------------------------------
# Model singletons
# ---------------------------------------------------------------------------
chronos = ChronosWrapper()
timesfm_model = TimesFMWrapper()
statistical = StatisticalFallback()

LOADED_MODELS: list[str] = ["statistical"]
if chronos.available:
    LOADED_MODELS.append("chronos")
if timesfm_model.available:
    LOADED_MODELS.append("timesfm")

logger.info("Models loaded: %s | GPU: %s", LOADED_MODELS, GPU_AVAILABLE)

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class ForecastRequest(BaseModel):
    values: list[float] = Field(..., min_length=2, max_length=10000, description="Numeric time series")
    horizon: int = Field(..., ge=1, le=1000, description="Number of future steps")
    model: str = Field("auto", pattern="^(chronos|timesfm|auto|statistical)$")
    confidence_level: float = Field(0.9, ge=0.5, le=0.99)
    request_id: Optional[str] = None


class PredictionPoint(BaseModel):
    timestamp_offset: int
    predicted: float
    lower: float
    upper: float


class ForecastResponse(BaseModel):
    predictions: list[PredictionPoint]
    model_used: str
    computation_ms: float
    request_id: str


class AnomalyRequest(BaseModel):
    values: list[float] = Field(..., min_length=3, max_length=100000)
    threshold: float = Field(2.0, ge=0.5, description="Z-score threshold")
    request_id: Optional[str] = None


class AnomalyPoint(BaseModel):
    index: int
    value: float
    z_score: float
    is_anomaly: bool


class AnomalyResponse(BaseModel):
    anomalies: list[AnomalyPoint]
    mean: float
    std: float
    request_id: str


class RegimeShiftRequest(BaseModel):
    values: list[float] = Field(..., min_length=4, max_length=100000)
    window_size: int = Field(10, ge=2)
    shift_threshold: float = Field(1.0, ge=0.1)
    request_id: Optional[str] = None


class ShiftPoint(BaseModel):
    breakpoint: int
    before_mean: float
    after_mean: float
    magnitude: float


class RegimeShiftResponse(BaseModel):
    shifts: list[ShiftPoint]
    request_id: str


class StreamInput(BaseModel):
    stream_key: str
    values: list[float] = Field(..., min_length=2)
    horizon: int = Field(..., ge=1, le=1000)


class BatchForecastRequest(BaseModel):
    streams: list[StreamInput] = Field(..., min_length=1, max_length=50)
    model: str = Field("auto", pattern="^(chronos|timesfm|auto|statistical)$")
    confidence_level: float = Field(0.9, ge=0.5, le=0.99)
    request_id: Optional[str] = None


class StreamForecast(BaseModel):
    stream_key: str
    predictions: list[PredictionPoint]
    model_used: str


class BatchForecastResponse(BaseModel):
    results: list[StreamForecast]
    computation_ms: float
    request_id: str


class HealthResponse(BaseModel):
    status: str
    models_loaded: list[str]
    gpu_available: bool


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="TSFM Inference — Math Engine (Lane A)",
    version="1.0.0",
    description="Zero-shot time-series forecasting with Chronos, TimesFM, and statistical fallback.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SHORT_SERIES_THRESHOLD = 100  # auto mode prefers Chronos below this


def _resolve_model(model_hint: str, series_len: int) -> str:
    """Pick a concrete model given the hint and series length."""
    if model_hint == "statistical":
        return "statistical"
    if model_hint == "chronos" and chronos.available:
        return "chronos"
    if model_hint == "timesfm" and timesfm_model.available:
        return "timesfm"
    if model_hint == "auto":
        if series_len < SHORT_SERIES_THRESHOLD and chronos.available:
            return "chronos"
        if timesfm_model.available:
            return "timesfm"
        if chronos.available:
            return "chronos"
    return "statistical"


def _forecast(
    values: list[float],
    horizon: int,
    model_name: str,
    confidence_level: float,
) -> tuple[list[PredictionPoint], str]:
    """Run forecast through the selected model, falling back as needed."""
    arr = np.asarray(values, dtype=np.float64)

    if not np.isfinite(arr).all():
        raise HTTPException(status_code=422, detail="Input values contain NaN or Inf")

    try:
        if model_name == "chronos":
            preds, lower, upper = chronos.forecast(arr, horizon, confidence_level)
        elif model_name == "timesfm":
            preds, lower, upper = timesfm_model.forecast(arr, horizon, confidence_level)
        else:
            raise RuntimeError("use_statistical")
    except Exception:
        model_name = "statistical"
        preds, lower, upper = statistical.forecast(arr, horizon, confidence_level)

    points = [
        PredictionPoint(
            timestamp_offset=i + 1,
            predicted=round(float(preds[i]), 6),
            lower=round(float(lower[i]), 6),
            upper=round(float(upper[i]), 6),
        )
        for i in range(horizon)
    ]
    return points, model_name


def _rid(req_id: Optional[str]) -> str:
    return req_id or uuid.uuid4().hex[:12]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.post("/forecast", response_model=ForecastResponse)
def forecast(req: ForecastRequest):
    rid = _rid(req.request_id)
    logger.info("[%s] /forecast len=%d horizon=%d model=%s", rid, len(req.values), req.horizon, req.model)

    model_name = _resolve_model(req.model, len(req.values))
    t0 = time.perf_counter()
    predictions, model_used = _forecast(req.values, req.horizon, model_name, req.confidence_level)
    ms = (time.perf_counter() - t0) * 1000

    return ForecastResponse(predictions=predictions, model_used=model_used, computation_ms=round(ms, 2), request_id=rid)


@app.post("/detect_anomaly", response_model=AnomalyResponse)
def detect_anomaly(req: AnomalyRequest):
    rid = _rid(req.request_id)
    logger.info("[%s] /detect_anomaly len=%d threshold=%.2f", rid, len(req.values), req.threshold)

    arr = np.asarray(req.values, dtype=np.float64)
    mean = float(np.mean(arr))
    std = float(np.std(arr, ddof=1)) if len(arr) > 1 else 0.0

    if std == 0.0:
        # Constant series — no anomalies possible
        return AnomalyResponse(anomalies=[], mean=round(mean, 6), std=0.0, request_id=rid)

    anomalies = []
    for i, v in enumerate(arr):
        z = float(abs(v - mean) / std)
        anomalies.append(
            AnomalyPoint(index=i, value=round(float(v), 6), z_score=round(z, 4), is_anomaly=z > req.threshold)
        )

    return AnomalyResponse(anomalies=anomalies, mean=round(mean, 6), std=round(std, 6), request_id=rid)


@app.post("/detect_regime_shift", response_model=RegimeShiftResponse)
def detect_regime_shift(req: RegimeShiftRequest):
    rid = _rid(req.request_id)
    logger.info("[%s] /detect_regime_shift len=%d window=%d", rid, len(req.values), req.window_size)

    arr = np.asarray(req.values, dtype=np.float64)
    n = len(arr)
    window = min(req.window_size, n // 2)
    if window < 2:
        return RegimeShiftResponse(shifts=[], request_id=rid)

    global_std = float(np.std(arr, ddof=1)) if n > 1 else 1.0
    if global_std == 0.0:
        global_std = 1.0

    shifts: list[ShiftPoint] = []
    for i in range(window, n - window + 1):
        before = arr[max(0, i - window) : i]
        after = arr[i : min(n, i + window)]
        bm = float(np.mean(before))
        am = float(np.mean(after))
        mag = abs(am - bm) / global_std
        if mag >= req.shift_threshold:
            # Avoid duplicate nearby breakpoints: keep only if >window/2 apart from last
            if shifts and abs(i - shifts[-1].breakpoint) < window // 2:
                if mag > shifts[-1].magnitude:
                    shifts[-1] = ShiftPoint(
                        breakpoint=i, before_mean=round(bm, 6), after_mean=round(am, 6), magnitude=round(mag, 4)
                    )
            else:
                shifts.append(
                    ShiftPoint(
                        breakpoint=i, before_mean=round(bm, 6), after_mean=round(am, 6), magnitude=round(mag, 4)
                    )
                )

    return RegimeShiftResponse(shifts=shifts, request_id=rid)


@app.post("/batch_forecast", response_model=BatchForecastResponse)
def batch_forecast(req: BatchForecastRequest):
    rid = _rid(req.request_id)
    logger.info("[%s] /batch_forecast streams=%d model=%s", rid, len(req.streams), req.model)

    t0 = time.perf_counter()
    results: list[StreamForecast] = []
    for stream in req.streams:
        model_name = _resolve_model(req.model, len(stream.values))
        predictions, model_used = _forecast(stream.values, stream.horizon, model_name, req.confidence_level)
        results.append(StreamForecast(stream_key=stream.stream_key, predictions=predictions, model_used=model_used))

    ms = (time.perf_counter() - t0) * 1000
    return BatchForecastResponse(results=results, computation_ms=round(ms, 2), request_id=rid)


@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(status="ok", models_loaded=LOADED_MODELS, gpu_available=GPU_AVAILABLE)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("TSFM_PORT", "8010"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False, log_level="info")
