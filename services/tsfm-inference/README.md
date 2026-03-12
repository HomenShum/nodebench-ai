# TSFM Inference — Math Engine (Lane A)

Zero-shot time-series forecasting microservice using Amazon Chronos, Google TimesFM, or pure statistical fallback.

## Quick start

```bash
cd services/tsfm-inference
pip install -r requirements.txt
python app.py                     # http://localhost:8010
```

## Docker

```bash
docker build -t tsfm-inference .
docker run -p 8010:8010 tsfm-inference
```

## API

| Endpoint | Method | Description |
|---|---|---|
| `/forecast` | POST | Single series forecast |
| `/detect_anomaly` | POST | Z-score anomaly detection |
| `/detect_regime_shift` | POST | Sliding-window regime shift detection |
| `/batch_forecast` | POST | Multi-stream batch forecast |
| `/health` | GET | Model status + GPU availability |

### POST /forecast

```json
{
  "values": [1.0, 2.0, 3.0, 4.0, 5.0],
  "horizon": 3,
  "model": "auto",
  "confidence_level": 0.9
}
```

### POST /detect_anomaly

```json
{
  "values": [10, 11, 10, 50, 10, 11],
  "threshold": 2.0
}
```

### POST /batch_forecast

```json
{
  "streams": [
    {"stream_key": "revenue", "values": [100, 110, 120], "horizon": 5},
    {"stream_key": "users", "values": [50, 55, 60, 65], "horizon": 3}
  ],
  "model": "auto"
}
```

## Models

- **Chronos** — Amazon Chronos-T5-Large. Install: `pip install torch chronos-forecasting`
- **TimesFM** — Google TimesFM. Install: `pip install timesfm`
- **Statistical** — Always available. Exponential smoothing, linear regression, naive.
- **Auto** — Chronos for short series (<100 pts), TimesFM for long, statistical fallback.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `TSFM_PORT` | `8010` | Server port |
