"""Tool dispatch endpoint for Figma Flow Analysis server."""

import logging
import os
from typing import Any, Dict

from fastapi import APIRouter
from pydantic import BaseModel

from config import get_settings
from services.analysis_pipeline import analyze_flows
from services.flow_clusterer import FlowClusterer
from services.frame_extractor import FrameExtractor
from services.models import FigmaFrame, FlowGroup
from services.visualizer import FlowVisualizer

logger = logging.getLogger(__name__)

router = APIRouter()


class ToolRequest(BaseModel):
    tool_name: str
    parameters: Dict[str, Any] = {}


class ToolResponse(BaseModel):
    success: bool
    data: Any = None
    error: str = ""


TOOL_NAMES = [
    "analyze_figma_flows",
    "extract_figma_frames",
    "cluster_figma_flows",
    "render_flow_visualization",
]


@router.get("/list")
async def list_tools():
    return {"tools": TOOL_NAMES}


@router.post("/execute")
async def execute_tool(request: ToolRequest):
    settings = get_settings()

    try:
        if request.tool_name == "analyze_figma_flows":
            token = settings.figma_access_token
            if not token:
                return ToolResponse(success=False, error="FIGMA_ACCESS_TOKEN not configured")

            result = await analyze_flows(
                file_key=request.parameters["file_key"],
                access_token=token,
                page_filter=request.parameters.get("page_filter"),
                generate_visualization=request.parameters.get("generate_visualization", True),
            )
            return ToolResponse(success=True, data=result.model_dump())

        elif request.tool_name == "extract_figma_frames":
            token = settings.figma_access_token
            if not token:
                return ToolResponse(success=False, error="FIGMA_ACCESS_TOKEN not configured")

            from services.figma_client import FigmaClient
            client = FigmaClient(token)
            file_data = await client.get_file(request.parameters["file_key"])

            if isinstance(file_data, dict) and file_data.get("error"):
                return ToolResponse(success=False, error=file_data.get("message", "API error"))

            extractor = FrameExtractor()
            frames = extractor.extract(
                file_data,
                page_filter=request.parameters.get("page_filter"),
                include_components=request.parameters.get("include_components", True),
            )

            return ToolResponse(success=True, data={
                "total_frames": len(frames),
                "frames": [f.model_dump() for f in frames],
                "pages": list(set(f.page_name for f in frames)),
                "sections": list(set(f.section_name for f in frames if f.section_name)),
            })

        elif request.tool_name == "cluster_figma_flows":
            frames_data = request.parameters.get("frames", [])
            if not frames_data:
                return ToolResponse(success=False, error="No frames provided")

            frames = [FigmaFrame(**f) for f in frames_data]

            clusterer = FlowClusterer()
            flow_groups, method = clusterer.cluster(
                frames,
                spatial_max_gap=request.parameters.get("spatial_max_gap", 200),
                min_prefix_len=request.parameters.get("min_prefix_len", 3),
            )

            return ToolResponse(success=True, data={
                "clustering_method": method,
                "total_groups": len(flow_groups),
                "flow_groups": [g.model_dump() for g in flow_groups],
            })

        elif request.tool_name == "render_flow_visualization":
            groups_data = request.parameters.get("flow_groups", [])
            if not groups_data:
                return ToolResponse(success=False, error="No flow groups provided")

            flow_groups = [FlowGroup(**g) for g in groups_data]

            viz = FlowVisualizer()
            output_path = request.parameters.get("output_path", "/tmp/figma_flows.png")
            result_path = viz.render(
                flow_groups,
                page_image_path=request.parameters.get("page_image_path"),
                page_width=request.parameters.get("page_width", 0),
                page_height=request.parameters.get("page_height", 0),
                output_path=output_path,
            )

            return ToolResponse(success=True, data={
                "visualization_path": result_path,
                "groups_rendered": len(flow_groups),
            })

        else:
            return ToolResponse(
                success=False,
                error=f"Unknown tool: {request.tool_name}. Available: {TOOL_NAMES}",
            )

    except Exception as e:
        logger.error(f"Tool execution failed: {e}", exc_info=True)
        return ToolResponse(success=False, error=str(e))
