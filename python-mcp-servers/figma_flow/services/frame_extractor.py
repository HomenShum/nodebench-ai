"""
Phase 1 — Extract frames from Figma file tree.

Walks the DOCUMENT -> CANVAS -> SECTION -> FRAME tree (depth=3).
Tags each frame with its parent section name.
Extracts prototype transition targets from child nodes.
"""

import logging
from typing import List, Optional

from services.models import FigmaFrame

logger = logging.getLogger(__name__)

# Node types that represent "screen" frames
FRAME_TYPES = {"FRAME", "COMPONENT", "INSTANCE"}


class FrameExtractor:
    def extract(
        self,
        file_data: dict,
        page_filter: Optional[str] = None,
        include_components: bool = True,
    ) -> List[FigmaFrame]:
        """Extract all screen frames from a Figma file tree.

        Args:
            file_data: Raw Figma API response from GET /files/:key?depth=3
            page_filter: Optional page name to filter to (default: all pages)
            include_components: Include COMPONENT and INSTANCE nodes
        """
        document = file_data.get("document", {})
        frames = []

        for canvas in document.get("children", []):
            if canvas.get("type") != "CANVAS":
                continue

            page_name = canvas.get("name", "")

            # Filter by page name if specified
            if page_filter and page_name != page_filter:
                continue

            frames.extend(self._walk_tree(canvas, page_name, include_components=include_components))

        logger.info(f"Extracted {len(frames)} frames from file")
        return frames

    def _walk_tree(
        self,
        node: dict,
        page_name: str,
        section_name: Optional[str] = None,
        include_components: bool = True,
        depth: int = 0,
    ) -> List[FigmaFrame]:
        """Recursively walk the node tree.

        Structure: CANVAS -> SECTION -> FRAME
        Sections tag their children with section_name.
        """
        frames = []
        node_type = node.get("type", "")

        # Track current section name
        current_section = section_name
        if node_type == "SECTION":
            current_section = node.get("name", "Unnamed Section")

        # Check if this node is a frame we want to extract
        allowed_types = FRAME_TYPES if include_components else {"FRAME"}
        if node_type in allowed_types and depth >= 2:
            # This is a screen frame (at least 2 levels deep: CANVAS -> ... -> FRAME)
            bbox = node.get("absoluteBoundingBox", {})

            # Extract transition targets from this node's children
            transitions = self._extract_transitions(node)

            frames.append(FigmaFrame(
                node_id=node.get("id", ""),
                name=node.get("name", ""),
                x=bbox.get("x", 0),
                y=bbox.get("y", 0),
                width=bbox.get("width", 0),
                height=bbox.get("height", 0),
                transition_targets=transitions,
                section_name=current_section,
                page_name=page_name,
            ))

        # Recurse into children
        for child in node.get("children", []):
            frames.extend(
                self._walk_tree(
                    child, page_name, current_section,
                    include_components, depth + 1,
                )
            )

        return frames

    def _extract_transitions(self, node: dict) -> List[str]:
        """Extract prototype transition target node IDs from a node and its children."""
        targets = []

        # Check this node
        tid = node.get("transitionNodeID")
        if tid:
            targets.append(tid)

        # Check children recursively (prototype links can be on child elements)
        for child in node.get("children", []):
            targets.extend(self._extract_transitions(child))

        return list(set(targets))  # Deduplicate
