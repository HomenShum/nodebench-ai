"""Unit tests for UnionFind data structure."""

from services.flow_clusterer import UnionFind


class TestUnionFind:
    def test_single_element(self):
        uf = UnionFind()
        assert uf.find("x") == "x"

    def test_union_two(self):
        uf = UnionFind()
        uf.union("a", "b")
        assert uf.find("a") == uf.find("b")

    def test_union_chain(self):
        uf = UnionFind()
        uf.union("a", "b")
        uf.union("b", "c")
        assert uf.find("a") == uf.find("c")

    def test_two_components(self):
        uf = UnionFind()
        uf.union("a", "b")
        uf.union("c", "d")
        assert uf.find("a") == uf.find("b")
        assert uf.find("c") == uf.find("d")
        assert uf.find("a") != uf.find("c")

    def test_components_method(self):
        uf = UnionFind()
        uf.union("a", "b")
        uf.union("b", "c")
        uf.union("x", "y")
        uf.find("z")  # Isolated

        components = uf.components()
        assert len(components) == 3

        # Find component containing "a"
        for root, members in components.items():
            if "a" in members:
                assert set(members) == {"a", "b", "c"}
            elif "x" in members:
                assert set(members) == {"x", "y"}
            elif "z" in members:
                assert set(members) == {"z"}

    def test_idempotent_union(self):
        uf = UnionFind()
        uf.union("a", "b")
        uf.union("a", "b")
        uf.union("a", "b")
        components = uf.components()
        assert len(components) == 1

    def test_many_elements(self):
        uf = UnionFind()
        # Create one big component
        for i in range(100):
            uf.union(str(i), str(i + 1))

        assert uf.find("0") == uf.find("100")
        components = uf.components()
        assert len(components) == 1
        assert len(list(components.values())[0]) == 101
