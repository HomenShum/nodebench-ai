"""
Phase 2 — Multi-signal flow clustering with priority cascade.

Tries each clustering signal in order, uses the first that produces >= 2 groups:
1. Section-based (highest priority)
2. Prototype connections (Union-Find)
3. Name-prefix parsing
4. Spatial clustering (fallback, always works)
"""

import logging
import re
from collections import defaultdict
from typing import Dict, List, Optional, Tuple

from services.models import FigmaFrame, FlowGroup

logger = logging.getLogger(__name__)

# Colorblind-friendly palette (10 colors)
PALETTE = [
    (255, 107, 107),  # Red
    (78, 205, 196),   # Teal
    (69, 183, 209),   # Blue
    (150, 206, 180),  # Sage
    (255, 234, 167),  # Yellow
    (221, 160, 221),  # Plum
    (152, 216, 200),  # Mint
    (247, 220, 111),  # Gold
    (187, 143, 206),  # Lavender
    (130, 224, 170),  # Green
]


class UnionFind:
    """Union-Find data structure for prototype connection merging."""

    def __init__(self):
        self.parent: Dict[str, str] = {}
        self.rank: Dict[str, int] = {}

    def find(self, x: str) -> str:
        if x not in self.parent:
            self.parent[x] = x
            self.rank[x] = 0
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # Path compression
        return self.parent[x]

    def union(self, x: str, y: str):
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return
        # Union by rank
        if self.rank[rx] < self.rank[ry]:
            rx, ry = ry, rx
        self.parent[ry] = rx
        if self.rank[rx] == self.rank[ry]:
            self.rank[rx] += 1

    def components(self) -> Dict[str, List[str]]:
        """Return connected components as {root: [members]}."""
        groups: Dict[str, List[str]] = defaultdict(list)
        for node in self.parent:
            groups[self.find(node)].append(node)
        return dict(groups)


class FlowClusterer:
    """Multi-signal flow clustering with priority cascade."""

    def cluster(
        self,
        frames: List[FigmaFrame],
        spatial_max_gap: float = 200,
        min_prefix_len: int = 3,
    ) -> Tuple[List[FlowGroup], str]:
        """Cluster frames into flow groups.

        Returns (flow_groups, clustering_method).
        """
        if not frames:
            return [], "none"

        # Priority cascade: try each signal, use first that produces >= 2 groups
        for method, cluster_fn in [
            ("section", lambda: self._cluster_by_section(frames)),
            ("prototype", lambda: self._cluster_by_prototype(frames)),
            ("name_prefix", lambda: self._cluster_by_name_prefix(frames, min_prefix_len)),
            ("spatial", lambda: self._cluster_by_spatial(frames, spatial_max_gap)),
        ]:
            groups_dict = cluster_fn()
            if len(groups_dict) >= 2:
                flow_groups = self._dict_to_flow_groups(groups_dict, method)
                logger.info(f"Clustering by {method}: {len(flow_groups)} groups")
                return flow_groups, method

        # Single group fallback
        group = FlowGroup(
            group_id=0,
            name="All Frames",
            frames=frames,
            color=PALETTE[0],
            clustering_signal="single_group",
        )
        group.compute_bbox()
        return [group], "single_group"

    def _cluster_by_section(self, frames: List[FigmaFrame]) -> Dict[str, List[FigmaFrame]]:
        """Group frames by parent SECTION node name."""
        groups: Dict[str, List[FigmaFrame]] = defaultdict(list)
        for frame in frames:
            if frame.section_name:
                groups[frame.section_name].append(frame)
        return dict(groups)

    def _cluster_by_prototype(self, frames: List[FigmaFrame]) -> Dict[str, List[FigmaFrame]]:
        """Group frames connected by prototype transitions using Union-Find."""
        frame_map = {f.node_id: f for f in frames}
        frame_ids = set(frame_map.keys())

        uf = UnionFind()
        has_connections = False

        for frame in frames:
            uf.find(frame.node_id)  # Ensure all frames are in UF
            for target_id in frame.transition_targets:
                if target_id in frame_ids:
                    uf.union(frame.node_id, target_id)
                    has_connections = True

        if not has_connections:
            return {}

        components = uf.components()
        groups: Dict[str, List[FigmaFrame]] = {}
        for root, members in components.items():
            if len(members) >= 2:
                group_frames = [frame_map[m] for m in members if m in frame_map]
                if group_frames:
                    # Name the group after the first frame's name prefix
                    groups[group_frames[0].name.split("/")[0].strip()] = group_frames

        return groups

    def _cluster_by_name_prefix(
        self, frames: List[FigmaFrame], min_prefix_len: int = 3
    ) -> Dict[str, List[FigmaFrame]]:
        """Group frames by common name prefix.

        Handles separators: /, -, _, ' - '
        e.g., "Login / Screen 1", "Login / Screen 2" -> group "Login"
        """
        groups: Dict[str, List[FigmaFrame]] = defaultdict(list)

        for frame in frames:
            prefix = self._extract_prefix(frame.name)
            if prefix and len(prefix) >= min_prefix_len:
                groups[prefix].append(frame)

        # Only keep groups with >= 2 frames
        return {k: v for k, v in groups.items() if len(v) >= 2}

    @staticmethod
    def _extract_prefix(name: str) -> str:
        """Extract the flow name prefix from a frame name."""
        # Try separators in order: " / ", " - ", "/", "-", "_"
        for sep in [" / ", " - ", "/", "-", "_"]:
            if sep in name:
                parts = name.split(sep)
                if len(parts) >= 2:
                    return parts[0].strip()
        return ""

    def _cluster_by_spatial(
        self, frames: List[FigmaFrame], max_gap: float = 200
    ) -> Dict[str, List[FigmaFrame]]:
        """Spatial clustering: Y-binning + X-gap splitting.

        1. Sort by Y, bin into rows (Y-gap > max_gap * 1.5 = new row)
        2. Within each row, sort by X, split on X-gap > max_gap
        """
        if not frames:
            return {}

        # Sort by Y coordinate
        sorted_frames = sorted(frames, key=lambda f: f.y)

        # Bin into rows
        rows: List[List[FigmaFrame]] = [[sorted_frames[0]]]
        y_threshold = max_gap * 1.5

        for frame in sorted_frames[1:]:
            prev = rows[-1][-1]
            if frame.y - (prev.y + prev.height) > y_threshold:
                rows.append([frame])
            else:
                rows[-1].append(frame)

        # Within each row, split by X-gap
        groups: Dict[str, List[FigmaFrame]] = {}
        group_idx = 0

        for row in rows:
            row_sorted = sorted(row, key=lambda f: f.x)
            current_cluster = [row_sorted[0]]

            for frame in row_sorted[1:]:
                prev = current_cluster[-1]
                if frame.x - (prev.x + prev.width) > max_gap:
                    # Gap detected — save current cluster
                    if len(current_cluster) >= 1:
                        name = f"Group {group_idx + 1}"
                        groups[name] = current_cluster
                        group_idx += 1
                    current_cluster = [frame]
                else:
                    current_cluster.append(frame)

            # Save last cluster
            if current_cluster:
                name = f"Group {group_idx + 1}"
                groups[name] = current_cluster
                group_idx += 1

        return groups

    def _dict_to_flow_groups(
        self, groups_dict: Dict[str, List[FigmaFrame]], method: str
    ) -> List[FlowGroup]:
        """Convert clustering result dict to FlowGroup list with computed bboxes."""
        result = []
        for i, (name, frames) in enumerate(sorted(groups_dict.items())):
            group = FlowGroup(
                group_id=i,
                name=name,
                frames=frames,
                color=PALETTE[i % len(PALETTE)],
                clustering_signal=method,
            )
            group.compute_bbox()
            result.append(group)
        return result
