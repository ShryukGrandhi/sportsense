"""Performance metrics and monitoring

Tracks:
- End-to-end latency
- Per-layer latency breakdown
- Success/failure rates
- Perplexity scores
"""

from dataclasses import dataclass, field
from typing import List, Dict
from datetime import datetime
import json


@dataclass
class LatencyMetrics:
    """Latency metrics for a single request"""
    timestamp: datetime
    acr_latency_ms: float
    data_latency_ms: float
    nlg_latency_ms: float
    tts_latency_ms: float
    total_latency_ms: float
    met_target: bool  # <1000ms


@dataclass
class QualityMetrics:
    """Quality metrics for generated content"""
    timestamp: datetime
    perplexity_score: float
    narrative_length: int
    confidence_score: float


class MetricsCollector:
    """Collects and aggregates performance metrics"""

    def __init__(self):
        self.latency_metrics: List[LatencyMetrics] = []
        self.quality_metrics: List[QualityMetrics] = []

    def record_latency(
        self,
        acr_ms: float,
        data_ms: float,
        nlg_ms: float,
        tts_ms: float,
        total_ms: float
    ):
        """Record latency metrics for a request"""
        metric = LatencyMetrics(
            timestamp=datetime.utcnow(),
            acr_latency_ms=acr_ms,
            data_latency_ms=data_ms,
            nlg_latency_ms=nlg_ms,
            tts_latency_ms=tts_ms,
            total_latency_ms=total_ms,
            met_target=total_ms < 1000
        )
        self.latency_metrics.append(metric)

    def record_quality(
        self,
        perplexity: float,
        narrative_length: int,
        confidence: float
    ):
        """Record quality metrics"""
        metric = QualityMetrics(
            timestamp=datetime.utcnow(),
            perplexity_score=perplexity,
            narrative_length=narrative_length,
            confidence_score=confidence
        )
        self.quality_metrics.append(metric)

    def get_summary(self) -> Dict:
        """Get summary statistics"""
        if not self.latency_metrics:
            return {"status": "no_data"}

        total_latencies = [m.total_latency_ms for m in self.latency_metrics]
        success_rate = sum(1 for m in self.latency_metrics if m.met_target) / len(self.latency_metrics)

        return {
            "total_requests": len(self.latency_metrics),
            "success_rate": f"{success_rate * 100:.1f}%",
            "avg_latency_ms": sum(total_latencies) / len(total_latencies),
            "min_latency_ms": min(total_latencies),
            "max_latency_ms": max(total_latencies),
            "avg_perplexity": (
                sum(m.perplexity_score for m in self.quality_metrics) / len(self.quality_metrics)
                if self.quality_metrics else None
            )
        }

    def export_json(self, filepath: str):
        """Export metrics to JSON file"""
        data = {
            "summary": self.get_summary(),
            "latency_metrics": [
                {
                    "timestamp": m.timestamp.isoformat(),
                    "acr_ms": m.acr_latency_ms,
                    "data_ms": m.data_latency_ms,
                    "nlg_ms": m.nlg_latency_ms,
                    "tts_ms": m.tts_latency_ms,
                    "total_ms": m.total_latency_ms,
                    "met_target": m.met_target
                }
                for m in self.latency_metrics
            ]
        }

        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)


# Global metrics collector
_metrics_collector = MetricsCollector()


def get_metrics_collector() -> MetricsCollector:
    """Get the global metrics collector instance"""
    return _metrics_collector
