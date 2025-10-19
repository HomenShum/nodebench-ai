import "@testing-library/jest-dom";
import { vi } from "vitest";

vi.mock("@/components/UnifiedEditor", () => ({
  __esModule: true,
  default: () => null,
}));
