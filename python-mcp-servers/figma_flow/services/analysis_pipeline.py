"""
Analysis Pipeline — Full extract → cluster → visualize orchestration.
"""

import logging
import os
from typing import Optional

from services.figma_client import FigmaClient
from services.flow_clusterer import FlowClusterer
from services.frame_extractor import FrameExtractor
from services.models import FlowAnalysisResult
from services.visualizer import FlowVisualizer

logger = logging.getLogger(__name__)


async def analyze_flows(
    file_key: str,
    access_token: str,
    page_filter: Optional[str] = None,
    include_components: bool = True,
    generate_visualization: bool = True,
    spatial_max_gap: float = 200,
    min_prefix_len: int = 3,
    output_dir: str = "/tmp/figma_flow",
) -> FlowAnalysisResult:
    """Full pipeline: extract frames → cluster flows → visualize.

    Args:
        file_key: Figma file key (from URL)
        access_token: Figma API access token
        page_filter: Optional page name filter
        include_components: Include COMPONENT/INSTANCE nodes
        generate_visualization: Generate overlay visualization
        spatial_max_gap: Max pixel gap for spatial clustering
        min_prefix_len: Minimum name prefix length for name-prefix clustering
        output_dir: Output directory for artifacts
    """
    os.makedirs(output_dir, exist_ok=True)

    result = FlowAnalysisResult(file_key=file_key)

    # Phase 1: Extract frames
    logger.info(f"Phase 1: Extracting frames from {file_key} (depth=3)")
    client = FigmaClient(access_token)
    file_data = client.get_file(file_key)

    if isinstance(file_data, dict) and file_data.get("error"):
        result.summary = f"Figma API error: {file_data.get('message', 'unknown')}"
        return result

    extractor = FrameExtractor()
    frames = extractor.extract(file_data, page_filter, include_components)
    result.total_frames = len(frames)

    if frames:
        result.page_name = frames[0].page_name

    if not frames:
        result.summary = "No frames found in file"
        return result

    # Phase 2: Cluster flows
    logger.info(f"Phase 2: Clustering {len(frames)} frames")
    clusterer = FlowClusterer()
    flow_groups, method = clusterer.cluster(
        frames, spatial_max_gap=spatial_max_gap, min_prefix_len=min_prefix_len
    )
    result.flow_groups = flow_groups
    result.clustering_method = method

    # Identify ungrouped frames
    grouped_ids = {f.node_id for g in flow_groups for f in g.frames}
    result.ungrouped_frames = [f for f in frames if f.node_id not in grouped_ids]

    # Phase 3: Visualization
    if generate_visualization and flow_groups:
        logger.info("Phase 3: Generating visualization")
        viz = FlowVisualizer()
        viz_path = os.path.join(output_dir, f"{file_key}_flows.png")

        # Compute page dimensions from all frames
        page_w = max(f.x + f.width for f in frames) - min(f.x for f in frames) + 200
        page_h = max(f.y + f.height for f in frames) - min(f.y for f in frames) + 200

        result.visualization_path = viz.render(
            flow_groups, page_width=page_w, page_height=page_h, output_path=viz_path
        )

    # Summary
    group_names = [g.name for g in flow_groups]
    result.summary = (
        f"Found {len(frames)} frames in {len(flow_groups)} flow groups "
        f"(clustered by {method}): {', '.join(group_names)}. "
        f"{len(result.ungrouped_frames)} ungrouped frames."
    )

    logger.info(result.summary)
    return result
