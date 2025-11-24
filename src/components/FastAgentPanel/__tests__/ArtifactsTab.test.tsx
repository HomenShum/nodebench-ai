import { render, screen, within } from "@testing-library/react";
import { ArtifactsTab } from "../FastAgentPanel";
import type { ExtractedMedia } from "../utils/mediaExtractor";
import type { DocumentAction } from "../DocumentActionCard";

const emptyMedia: ExtractedMedia = {
  youtubeVideos: [],
  secDocuments: [],
  webSources: [],
  profiles: [],
  images: [],
};

const sampleMedia: ExtractedMedia = {
  youtubeVideos: [
    {
      title: "Artifact Deep Dive",
      channel: "Nodebench Labs",
      description: "Walkthrough",
      url: "https://www.youtube.com/watch?v=example",
      videoId: "example",
      thumbnail: "https://i.ytimg.com/example.jpg",
    },
  ],
  secDocuments: [
    {
      title: "Form D",
      formType: "D",
      filingDate: "2024-01-01",
      accessionNumber: "0000001",
      documentUrl: "https://www.sec.gov/Archives/example",
      company: "Example Corp",
    },
  ],
  webSources: [
    {
      title: "Primary Source",
      url: "https://example.com/source",
      domain: "example.com",
    },
  ],
  profiles: [
    {
      name: "Researcher One",
      url: "https://example.com/profile",
      profession: "Analyst",
    },
  ],
  images: [
    {
      url: "https://example.com/image.png",
      alt: "evidence screenshot",
    },
  ],
};

const documents: DocumentAction[] = [
  {
    action: "created",
    documentId: "doc-1",
    title: "Generated Brief",
  },
];

describe("ArtifactsTab", () => {
  it("renders the empty state when no artifacts are available", () => {
    render(
      <ArtifactsTab
        media={emptyMedia}
        documents={[]}
        hasThread={false}
        onDocumentSelect={() => {}}
      />,
    );

    expect(screen.getByText(/No artifacts yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Start a thread to collect sources, filings, media, and generated documents/i),
    ).toBeInTheDocument();
  });

  it("summarizes artifact counts and lists generated documents", () => {
    render(
      <ArtifactsTab
        media={sampleMedia}
        documents={documents}
        hasThread
        onDocumentSelect={() => {}}
      />,
    );

    const sourcesCard = screen.getByText("Sources & Filings").closest("div");
    expect(sourcesCard).not.toBeNull();
    if (sourcesCard) {
      expect(within(sourcesCard).getByText("2")).toBeInTheDocument();
    }

    expect(screen.getByText("Videos")).toBeInTheDocument();
    expect(screen.getAllByText("People").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Images").length).toBeGreaterThan(0);
    expect(screen.getByText("Doc actions")).toBeInTheDocument();

    expect(screen.getByText("Generated Brief")).toBeInTheDocument();
    expect(screen.getByText(/Artifacts/)).toBeInTheDocument();
  });
});
