const fs = require('fs');
const path = require('path');

const BASE = 'd:/VSCode Projects/cafecorner_nodebench/paper-diagram-gen';

const readme = `# paper-diagram-gen

Generate academic-style diagrams from simple text descriptions. Outputs SVG or ASCII art suitable for research papers, technical documentation, and presentations.

Inspired by [PaperBanana](https://github.com/dwzhu-pku/PaperBanana). Built with [nodebench-mcp](https://www.npmjs.com/package/nodebench-mcp) methodology.

## Features

- **4 diagram types**: flowchart, layers, pipeline, comparison
- **2 output formats**: SVG (vector graphics) and ASCII art
- **Simple text format**: human-readable diagram descriptions
- **JSON input**: structured DiagramSpec for programmatic use
- **Zero dependencies**: only Node.js built-ins (node:fs)
- **CLI tool**: read from file or stdin, write to file or stdout

## Text Format

The text format uses a header and body separated by \`---\`:

\`\`\`
title: Neural Network Training Pipeline
type: flowchart
---
Data Loading
Data Loading -> Preprocessing : clean
Preprocessing -> Model Training : feed
Model Training -> Evaluation : validate
\`\`\`

### Header fields

| Field | Required | Values |
|-------|----------|--------|
| title | yes | Any string |
| type | yes | flowchart, layers, pipeline, comparison |

### Body syntax

- **Bare line**: declares a node (e.g. \`Data Loading\`)
- **Arrow line**: declares an edge with optional label (e.g. \`A -> B : label\`)
- Nodes referenced in edges are created automatically

## JSON Format

\`\`\`json
{
  "title": "ML Pipeline",
  "type": "pipeline",
  "nodes": [
    { "id": "load", "label": "Load Data" },
    { "id": "train", "label": "Train Model" },
    { "id": "eval", "label": "Evaluate" }
  ],
  "edges": [
    { "from": "load", "to": "train", "label": "feed" },
    { "from": "train", "to": "eval", "label": "score" }
  ]
}
\`\`\`

## CLI Usage

\`\`\`bash
# From file, ASCII output (default)
paper-diagram-gen diagram.txt

# From file, SVG output
paper-diagram-gen diagram.txt --format svg --output diagram.svg

# From stdin
cat diagram.txt | paper-diagram-gen - --format ascii

# JSON input
paper-diagram-gen spec.json --format svg
\`\`\`

### Options

| Flag | Default | Description |
|------|---------|-------------|
| --format | ascii | Output format: svg or ascii |
| --output | stdout | Write to file instead of stdout |

## Development

\`\`\`bash
npm run build     # Compile TypeScript
npm test          # Run tests (node:test)
\`\`\`

## License

MIT
`;

fs.writeFileSync(path.join(BASE, 'README.md'), readme);
console.log('README.md written:', readme.length, 'chars');
