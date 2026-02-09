"""Tests for Phase 2 — Flow clustering algorithms."""

import pytest

from services.flow_clusterer import FlowClusterer, UnionFind
from services.models import FigmaFrame


def _frame(name: str, x: float, y: float, w: float = 375, h: float = 812,
           section: str = None, node_id: str = None, transitions: list = None) -> FigmaFrame:
    return FigmaFrame(
        node_id=node_id or f"id_{name.replace(' ', '_')}",
        name=name,
        x=x, y=y, width=w, height=h,
        section_name=section,
        transition_targets=transitions or [],
        page_name="Page 1",
    )


class TestUnionFind:
    def test_find_creates_node(self):
        uf = UnionFind()
        assert uf.find("a") == "a"

    def test_union_merges(self):
        uf = UnionFind()
        uf.union("a", "b")
        assert uf.find("a") == uf.find("b")

    def test_path_compression(self):
        uf = UnionFind()
        uf.union("a", "b")
        uf.union("b", "c")
        uf.union("c", "d")
        root = uf.find("d")
        assert uf.find("a") == root
        assert uf.find("b") == root
        assert uf.find("c") == root

    def test_components(self):
        uf = UnionFind()
        uf.union("a", "b")
        uf.union("c", "d")
        uf.find("e")  # Isolated
        components = uf.components()
        assert len(components) == 3


class TestSectionClustering:
    def test_groups_by_section(self):
        frames = [
            _frame("Login 1", 0, 0, section="Login"),
            _frame("Login 2", 500, 0, section="Login"),
            _frame("Settings 1", 0, 1000, section="Settings"),
            _frame("Settings 2", 500, 1000, section="Settings"),
        ]
        clusterer = FlowClusterer()
        groups, method = clusterer.cluster(frames)

        assert method == "section"
        assert len(groups) == 2
        names = {g.name for g in groups}
        assert "Login" in names
        assert "Settings" in names

    def test_section_beats_other_signals(self):
        """Section clustering should take priority over name-prefix."""
        frames = [
            _frame("Login / Screen 1", 0, 0, section="Auth"),
            _frame("Login / Screen 2", 500, 0, section="Auth"),
            _frame("Onboarding / Step 1", 0, 1000, section="Onboarding"),
            _frame("Onboarding / Step 2", 500, 1000, section="Onboarding"),
        ]
        clusterer = FlowClusterer()
        groups, method = clusterer.cluster(frames)

        assert method == "section"
        names = {g.name for g in groups}
        assert "Auth" in names  # Section name, not name-prefix


class TestNamePrefixClustering:
    def test_slash_separator(self):
        frames = [
            _frame("Login / Screen 1", 0, 0),
            _frame("Login / Screen 2", 500, 0),
            _frame("Settings / General", 0, 1000),
            _frame("Settings / Privacy", 500, 1000),
        ]
        clusterer = FlowClusterer()
        groups, method = clusterer.cluster(frames)

        assert method == "name_prefix"
        assert len(groups) == 2
        names = {g.name for g in groups}
        assert "Login" in names
        assert "Settings" in names

    def test_dash_separator(self):
        frames = [
            _frame("Login - Step 1", 0, 0),
            _frame("Login - Step 2", 500, 0),
            _frame("Register - Step 1", 0, 1000),
            _frame("Register - Step 2", 500, 1000),
        ]
        clusterer = FlowClusterer()
        groups, method = clusterer.cluster(frames)

        assert method == "name_prefix"
        assert len(groups) == 2


class TestSpatialClustering:
    def test_separate_rows(self):
        """Frames in different Y rows should be in different groups."""
        frames = [
            _frame("A", 0, 0),
            _frame("B", 500, 0),
            _frame("C", 0, 1500),  # Far below
            _frame("D", 500, 1500),
        ]
        clusterer = FlowClusterer()
        groups, method = clusterer.cluster(frames)

        assert method == "spatial"
        assert len(groups) == 2

    def test_same_row_gap_split(self):
        """Frames on same Y row but with large X gap should split."""
        frames = [
            _frame("A", 0, 0),
            _frame("B", 500, 0),
            _frame("C", 2000, 0),  # Large X gap
            _frame("D", 2500, 0),
        ]
        clusterer = FlowClusterer()
        groups, method = clusterer.cluster(frames)

        assert method == "spatial"
        assert len(groups) >= 2


class TestBBoxComputation:
    def test_bbox_encloses_all_frames(self):
        frames = [
            _frame("A", 100, 200, 375, 812),
            _frame("B", 600, 200, 375, 812),
        ]
        clusterer = FlowClusterer()
        groups, _ = clusterer.cluster(frames)

        for group in groups:
            for frame in group.frames:
                assert frame.x >= group.bbox_x
                assert frame.y >= group.bbox_y
                assert frame.x + frame.width <= group.bbox_x + group.bbox_w
                assert frame.y + frame.height <= group.bbox_y + group.bbox_h


class TestDemoLayout:
    """Test with the demo layout specified in the requirements."""

    def test_multi_flow_layout(self):
        frames = [
            # Row 1: Login Flow
            _frame("Login / Splash", 0, 0),
            _frame("Login / Email", 475, 0),
            _frame("Login / Password", 950, 0),
            _frame("Login / 2FA", 1425, 0),
            # Row 2: Onboarding Flow
            _frame("Onboarding / Welcome", 0, 1100),
            _frame("Onboarding / Profile", 475, 1100),
            _frame("Onboarding / Prefs", 950, 1100),
            _frame("Onboarding / Tour", 1425, 1100),
            _frame("Onboarding / Done", 1900, 1100),
            # Row 3: Dashboard + Settings (SAME Y, large X gap)
            _frame("Dashboard / Home", 0, 2200),
            _frame("Dashboard / Stats", 475, 2200),
            _frame("Dashboard / Feed", 950, 2200),
            _frame("Settings / General", 2500, 2200),
            _frame("Settings / Privacy", 2975, 2200),
            _frame("Settings / Account", 3450, 2200),
            # Row 4: Checkout Flow
            _frame("Checkout / Cart", 0, 3300),
            _frame("Checkout / Address", 475, 3300),
            _frame("Checkout / Payment", 950, 3300),
            _frame("Checkout / Review", 1425, 3300),
            _frame("Checkout / Confirm", 1900, 3300),
            _frame("Checkout / Receipt", 2375, 3300),
        ]

        clusterer = FlowClusterer()
        groups, method = clusterer.cluster(frames)

        # Name-prefix should identify 5 distinct flows
        assert method == "name_prefix"
        assert len(groups) == 5
        names = {g.name for g in groups}
        assert "Login" in names
        assert "Onboarding" in names
        assert "Dashboard" in names
        assert "Settings" in names
        assert "Checkout" in names
