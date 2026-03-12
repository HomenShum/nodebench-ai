/**
 * NodeBench Design System — Figma Plugin Script
 *
 * Paste this into Figma's Plugin Console (Plugins → Development → Open console)
 * or run via Quick Actions (Ctrl+/) → "Run last plugin"
 *
 * Creates 4 pages with all design tokens from src/index.css:
 *   1. Color Palette — 32 tokens (light + dark), organized by category
 *   2. Typography — 6 .type-* styles with specimens
 *   3. Components — layout shells, buttons, patterns
 *   4. Page Templates — hub, detail, fullscreen wireframes
 */

// ══════════════════════════════════════════════════════════════════════
// COLOR TOKENS (extracted from src/index.css)
// ══════════════════════════════════════════════════════════════════════

const COLORS = {
  core: {
    "background":          { light: [250,250,250], dark: [10,10,14] },
    "foreground":          { light: [17,24,39],    dark: [242,242,242] },
    "card":                { light: [255,255,255], dark: [24,24,27] },
    "card-foreground":     { light: [10,10,10],    dark: [242,242,242] },
    "popover":             { light: [255,255,255], dark: [24,24,27] },
    "popover-foreground":  { light: [10,10,10],    dark: [242,242,242] },
    "primary":             { light: [94,106,210],  dark: [112,126,222] },
    "primary-foreground":  { light: [255,255,255], dark: [255,255,255] },
    "secondary":           { light: [229,231,235], dark: [39,39,42] },
    "secondary-foreground":{ light: [10,10,10],    dark: [242,242,242] },
    "muted":               { light: [243,244,246], dark: [39,39,42] },
    "muted-foreground":    { light: [107,114,128], dark: [161,161,170] },
    "accent":              { light: [243,244,246], dark: [39,39,42] },
    "accent-foreground":   { light: [94,106,210],  dark: [112,126,222] },
    "destructive":         { light: [239,68,68],   dark: [127,29,29] },
    "destructive-fg":      { light: [255,255,255], dark: [255,255,255] },
    "border":              { light: [229,231,235], dark: [39,39,42] },
    "input":               { light: [229,231,235], dark: [39,39,42] },
    "ring":                { light: [94,106,210],  dark: [112,126,222] },
  },
  semantic: {
    "text-primary":        { light: [17,24,39],    dark: [250,250,250] },
    "text-secondary":      { light: [55,65,81],    dark: [161,161,170] },
    "text-muted":          { light: [107,114,128], dark: [138,138,151] },
    "bg-primary":          { light: [250,250,250], dark: [10,10,14] },
    "bg-secondary":        { light: [243,244,246], dark: [26,26,31] },
    "bg-hover":            { light: [229,231,235], dark: [42,42,50] },
    "bg-tertiary":         { light: [243,244,246], dark: [32,31,39] },
  },
  accent: {
    "accent-primary":      { light: [94,106,210],  dark: [124,138,228] },
    "accent-secondary":    { light: [129,140,248], dark: [129,140,248] },
    "accent-primary-hover": { light: [79,91,192],  dark: [139,151,232] },
  },
};

// ══════════════════════════════════════════════════════════════════════
// TYPOGRAPHY
// ══════════════════════════════════════════════════════════════════════

const TYPOGRAPHY = [
  { name: "type-page-title",    size: 24, weight: 600, tracking: -0.5, specimen: "Page Title" },
  { name: "type-section-title", size: 16, weight: 600, tracking: -0.3, specimen: "Section Title" },
  { name: "type-card-title",    size: 14, weight: 500, tracking: 0,    specimen: "Card Title" },
  { name: "type-body",          size: 14, weight: 400, tracking: 0,    specimen: "Body text for reading. The quick brown fox jumps over the lazy dog." },
  { name: "type-caption",       size: 12, weight: 400, tracking: 0,    specimen: "Caption text" },
  { name: "type-label",         size: 12, weight: 500, tracking: 0.8,  specimen: "LABEL TEXT", uppercase: true },
];

// ══════════════════════════════════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════════════════════════════════

const COMPONENTS = [
  {
    name: "nb-page-shell",
    description: "Route-level page container",
    tailwind: "h-full w-full bg-surface overflow-y-auto relative pb-24 lg:pb-0",
    width: 1280, height: 800,
  },
  {
    name: "nb-surface-card",
    description: "Card container with border and shadow",
    tailwind: "rounded-lg border border-edge bg-surface shadow-sm",
    width: 400, height: 240,
  },
  {
    name: "btn-primary",
    description: "Primary action button (indigo bg, white text)",
    tailwind: "px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-600 text-white",
    width: 120, height: 36,
  },
  {
    name: "btn-ghost",
    description: "Ghost button (no background)",
    tailwind: "px-3 py-1.5 text-xs font-medium rounded-md text-content-secondary hover:bg-surface-hover",
    width: 120, height: 36,
  },
  {
    name: "btn-outline",
    description: "Outlined button",
    tailwind: "px-3 py-1.5 text-xs font-medium rounded-md border border-edge text-content-secondary",
    width: 120, height: 36,
  },
];

const TEMPLATES = [
  {
    name: "Hub Layout",
    description: "3-column: sidebar (w-64) + content (flex-1) + panel (w-80)",
    example: "ResearchHub, AgentsHub",
    cols: [{ w: 256, label: "Sidebar" }, { w: 640, label: "Content" }, { w: 320, label: "Panel" }],
  },
  {
    name: "Detail Layout",
    description: "2-column: sidebar (w-64) + content (flex-1)",
    example: "EntityProfilePage, FundingBrief",
    cols: [{ w: 256, label: "Sidebar" }, { w: 960, label: "Content" }],
  },
  {
    name: "Fullscreen Layout",
    description: "No sidebar, full-viewport immersive",
    example: "CinematicHome, landing pages",
    cols: [{ w: 1280, label: "Full Width Content" }],
  },
];

// ══════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════

function rgb(r, g, b) {
  return { r: r / 255, g: g / 255, b: b / 255 };
}

function solid(r, g, b) {
  return [{ type: "SOLID", color: rgb(r, g, b) }];
}

async function loadFont(family, style) {
  try {
    await figma.loadFontAsync({ family, style });
    return true;
  } catch {
    return false;
  }
}

function createText(content, x, y, opts = {}) {
  const text = figma.createText();
  text.x = x;
  text.y = y;
  text.characters = content;
  if (opts.size) text.fontSize = opts.size;
  if (opts.fills) text.fills = opts.fills;
  if (opts.fontName) text.fontName = opts.fontName;
  if (opts.letterSpacing) text.letterSpacing = { value: opts.letterSpacing, unit: "PIXELS" };
  return text;
}

function createSwatch(color, x, y, size = 60) {
  const rect = figma.createRectangle();
  rect.x = x;
  rect.y = y;
  rect.resize(size, size);
  rect.cornerRadius = 8;
  rect.fills = solid(color[0], color[1], color[2]);
  return rect;
}

// ══════════════════════════════════════════════════════════════════════
// PAGE BUILDERS
// ══════════════════════════════════════════════════════════════════════

async function buildColorPalettePage(page) {
  const interLoaded = await loadFont("Inter", "Regular");
  const interBold = await loadFont("Inter", "Semi Bold");
  const monoLoaded = await loadFont("JetBrains Mono", "Regular");

  const fontRegular = interLoaded ? { family: "Inter", style: "Regular" } : { family: "Roboto", style: "Regular" };
  const fontBold = interBold ? { family: "Inter", style: "Semi Bold" } : { family: "Roboto", style: "Regular" };
  const fontMono = monoLoaded ? { family: "JetBrains Mono", style: "Regular" } : fontRegular;

  let yOffset = 40;

  for (const [sectionKey, tokens] of Object.entries(COLORS)) {
    const sectionLabel = sectionKey === "core" ? "Core (shadcn/ui primitives)"
      : sectionKey === "semantic" ? "Semantic (component vars)"
      : "Accent";

    // Section title
    const title = createText(sectionLabel, 40, yOffset, {
      size: 20, fills: solid(17, 24, 39), fontName: fontBold,
    });
    page.appendChild(title);
    yOffset += 40;

    // Column headers
    const headerLight = createText("Light", 40 + 70, yOffset, { size: 11, fills: solid(107, 114, 128), fontName: fontRegular });
    const headerDark = createText("Dark", 40 + 70 + 80, yOffset, { size: 11, fills: solid(107, 114, 128), fontName: fontRegular });
    page.appendChild(headerLight);
    page.appendChild(headerDark);
    yOffset += 24;

    for (const [name, modes] of Object.entries(tokens)) {
      // Token name
      const label = createText(`--${name}`, 40, yOffset + 8, {
        size: 11, fills: solid(55, 65, 81), fontName: fontMono,
      });
      page.appendChild(label);

      // Light swatch
      if (modes.light) {
        const swatch = createSwatch(modes.light, 40 + 200, yOffset, 32);
        page.appendChild(swatch);
      }

      // Dark swatch
      if (modes.dark) {
        const swatch = createSwatch(modes.dark, 40 + 200 + 48, yOffset, 32);
        page.appendChild(swatch);
      }

      // Light hex value
      if (modes.light) {
        const hex = `#${modes.light.map(c => c.toString(16).padStart(2, "0")).join("")}`;
        const val = createText(hex, 40 + 200 + 48 + 48, yOffset + 8, {
          size: 10, fills: solid(107, 114, 128), fontName: fontMono,
        });
        page.appendChild(val);
      }

      yOffset += 44;
    }

    yOffset += 24;
  }
}

async function buildTypographyPage(page) {
  const interLoaded = await loadFont("Inter", "Regular");
  await loadFont("Inter", "Medium");
  await loadFont("Inter", "Semi Bold");
  const monoLoaded = await loadFont("JetBrains Mono", "Regular");

  const fontRegular = interLoaded ? { family: "Inter", style: "Regular" } : { family: "Roboto", style: "Regular" };
  const fontMedium = { family: "Inter", style: "Medium" };
  const fontSemiBold = { family: "Inter", style: "Semi Bold" };
  const fontMono = monoLoaded ? { family: "JetBrains Mono", style: "Regular" } : fontRegular;

  let yOffset = 40;

  // Title
  const title = createText("Typography — Inter + JetBrains Mono", 40, yOffset, {
    size: 24, fills: solid(17, 24, 39), fontName: fontSemiBold,
  });
  page.appendChild(title);
  yOffset += 60;

  for (const style of TYPOGRAPHY) {
    // Style name label
    const nameLabel = createText(`.${style.name}`, 40, yOffset, {
      size: 11, fills: solid(94, 106, 210), fontName: fontMono,
    });
    page.appendChild(nameLabel);
    yOffset += 24;

    // Determine font
    let fontName = fontRegular;
    if (style.weight >= 600) fontName = fontSemiBold;
    else if (style.weight >= 500) fontName = fontMedium;

    // Specimen
    const specimen = createText(style.specimen, 40, yOffset, {
      size: style.size,
      fills: solid(17, 24, 39),
      fontName,
      letterSpacing: style.tracking,
    });
    page.appendChild(specimen);
    yOffset += style.size + 20;

    // Details
    const details = createText(
      `size: ${style.size}px  |  weight: ${style.weight}  |  tracking: ${style.tracking}px${style.uppercase ? "  |  uppercase" : ""}`,
      40, yOffset,
      { size: 11, fills: solid(107, 114, 128), fontName: fontRegular }
    );
    page.appendChild(details);
    yOffset += 40;
  }

  // Code font specimen
  yOffset += 20;
  const codeTitle = createText("Code: JetBrains Mono", 40, yOffset, {
    size: 16, fills: solid(17, 24, 39), fontName: fontSemiBold,
  });
  page.appendChild(codeTitle);
  yOffset += 32;

  const codeSpecimen = createText("const score = qa * 0.70 + aspiration * 0.15;\n// NodeBench Design System v1.0", 40, yOffset, {
    size: 14, fills: solid(55, 65, 81), fontName: fontMono,
  });
  page.appendChild(codeSpecimen);
}

async function buildComponentsPage(page) {
  await loadFont("Inter", "Regular");
  await loadFont("Inter", "Semi Bold");
  await loadFont("Inter", "Medium");
  const monoLoaded = await loadFont("JetBrains Mono", "Regular");

  const fontRegular = { family: "Inter", style: "Regular" };
  const fontSemiBold = { family: "Inter", style: "Semi Bold" };
  const fontMedium = { family: "Inter", style: "Medium" };
  const fontMono = monoLoaded ? { family: "JetBrains Mono", style: "Regular" } : fontRegular;

  let yOffset = 40;

  const title = createText("Components", 40, yOffset, {
    size: 24, fills: solid(17, 24, 39), fontName: fontSemiBold,
  });
  page.appendChild(title);
  yOffset += 60;

  for (const comp of COMPONENTS) {
    // Component frame
    const frame = figma.createFrame();
    frame.name = comp.name;
    frame.x = 40;
    frame.y = yOffset;
    frame.resize(comp.width, comp.height);
    frame.cornerRadius = comp.name.includes("btn") ? 6 : 8;

    if (comp.name === "btn-primary") {
      frame.fills = solid(94, 106, 210);
    } else if (comp.name.includes("btn-outline")) {
      frame.fills = solid(255, 255, 255);
      frame.strokes = solid(229, 231, 235);
      frame.strokeWeight = 1;
    } else if (comp.name.includes("btn")) {
      frame.fills = solid(255, 255, 255);
    } else if (comp.name === "nb-surface-card") {
      frame.fills = solid(255, 255, 255);
      frame.strokes = solid(229, 231, 235);
      frame.strokeWeight = 1;
      frame.effects = [{
        type: "DROP_SHADOW",
        color: { r: 0, g: 0, b: 0, a: 0.05 },
        offset: { x: 0, y: 1 },
        radius: 3,
        spread: 0,
        visible: true,
        blendMode: "NORMAL",
      }];
    } else if (comp.name === "nb-page-shell") {
      frame.fills = solid(250, 250, 250);
    } else {
      frame.fills = solid(250, 250, 250);
    }

    page.appendChild(frame);

    // Button label
    if (comp.name.includes("btn")) {
      const btnLabel = createText(comp.name.replace("btn-", "").replace("-", " "), 0, 0, {
        size: 12,
        fills: comp.name === "btn-primary" ? solid(255, 255, 255) : solid(55, 65, 81),
        fontName: fontMedium,
      });
      frame.appendChild(btnLabel);
      btnLabel.x = (comp.width - btnLabel.width) / 2;
      btnLabel.y = (comp.height - btnLabel.height) / 2;
    }

    // Name + description below
    const nameText = createText(`.${comp.name}`, comp.width + 60, yOffset, {
      size: 13, fills: solid(17, 24, 39), fontName: fontMono,
    });
    page.appendChild(nameText);

    const descText = createText(comp.description, comp.width + 60, yOffset + 20, {
      size: 11, fills: solid(107, 114, 128), fontName: fontRegular,
    });
    page.appendChild(descText);

    const twText = createText(comp.tailwind, comp.width + 60, yOffset + 38, {
      size: 10, fills: solid(161, 161, 170), fontName: fontMono,
    });
    page.appendChild(twText);

    yOffset += Math.max(comp.height, 60) + 24;
  }

  // SignatureOrb section
  yOffset += 20;
  const orbTitle = createText("SignatureOrb (React component)", 40, yOffset, {
    size: 16, fills: solid(17, 24, 39), fontName: fontSemiBold,
  });
  page.appendChild(orbTitle);
  yOffset += 28;

  const variants = ["idle", "loading", "success", "error", "thinking"];
  const orbColors = [[94,106,210], [129,140,248], [34,197,94], [239,68,68], [168,85,247]];

  for (let i = 0; i < variants.length; i++) {
    const circle = figma.createEllipse();
    circle.x = 40 + i * 80;
    circle.y = yOffset;
    circle.resize(48, 48);
    circle.fills = solid(orbColors[i][0], orbColors[i][1], orbColors[i][2]);
    circle.effects = [{
      type: "DROP_SHADOW",
      color: { r: orbColors[i][0]/255, g: orbColors[i][1]/255, b: orbColors[i][2]/255, a: 0.3 },
      offset: { x: 0, y: 4 },
      radius: 12,
      spread: 0,
      visible: true,
      blendMode: "NORMAL",
    }];
    page.appendChild(circle);

    const varLabel = createText(variants[i], 40 + i * 80, yOffset + 56, {
      size: 10, fills: solid(107, 114, 128), fontName: fontRegular,
    });
    page.appendChild(varLabel);
  }
}

async function buildTemplatesPage(page) {
  await loadFont("Inter", "Regular");
  await loadFont("Inter", "Semi Bold");
  const monoLoaded = await loadFont("JetBrains Mono", "Regular");

  const fontRegular = { family: "Inter", style: "Regular" };
  const fontSemiBold = { family: "Inter", style: "Semi Bold" };
  const fontMono = monoLoaded ? { family: "JetBrains Mono", style: "Regular" } : fontRegular;

  let yOffset = 40;

  const title = createText("Page Templates", 40, yOffset, {
    size: 24, fills: solid(17, 24, 39), fontName: fontSemiBold,
  });
  page.appendChild(title);
  yOffset += 60;

  for (const tmpl of TEMPLATES) {
    // Template name
    const nameText = createText(tmpl.name, 40, yOffset, {
      size: 16, fills: solid(17, 24, 39), fontName: fontSemiBold,
    });
    page.appendChild(nameText);
    yOffset += 24;

    const descText = createText(`${tmpl.description}  •  Example: ${tmpl.example}`, 40, yOffset, {
      size: 11, fills: solid(107, 114, 128), fontName: fontRegular,
    });
    page.appendChild(descText);
    yOffset += 28;

    // Wireframe
    const wireframe = figma.createFrame();
    wireframe.name = tmpl.name;
    wireframe.x = 40;
    wireframe.y = yOffset;
    wireframe.resize(1280, 400);
    wireframe.fills = solid(250, 250, 250);
    wireframe.strokes = solid(229, 231, 235);
    wireframe.strokeWeight = 1;
    wireframe.cornerRadius = 8;
    wireframe.layoutMode = "HORIZONTAL";
    wireframe.itemSpacing = 0;
    wireframe.paddingLeft = 0;
    wireframe.paddingRight = 0;
    wireframe.paddingTop = 0;
    wireframe.paddingBottom = 0;

    let colX = 0;
    for (const col of tmpl.cols) {
      const colFrame = figma.createFrame();
      colFrame.name = col.label;
      colFrame.resize(col.w, 400);
      colFrame.layoutSizingVertical = "FILL";

      if (col.label === "Sidebar") {
        colFrame.fills = solid(243, 244, 246);
      } else if (col.label === "Panel") {
        colFrame.fills = solid(243, 244, 246);
      } else {
        colFrame.fills = solid(255, 255, 255);
      }

      wireframe.appendChild(colFrame);

      // Column label
      const colLabel = createText(col.label, 0, 0, {
        size: 12, fills: solid(107, 114, 128), fontName: fontRegular,
      });
      colFrame.appendChild(colLabel);
      colLabel.x = (col.w - 80) / 2;
      colLabel.y = 180;

      // Width annotation
      const widthLabel = createText(`${col.w}px`, 0, 0, {
        size: 10, fills: solid(161, 161, 170), fontName: fontMono,
      });
      colFrame.appendChild(widthLabel);
      widthLabel.x = (col.w - 40) / 2;
      widthLabel.y = 200;

      colX += col.w;
    }

    page.appendChild(wireframe);
    yOffset += 440;
  }
}

// ══════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════

async function main() {
  // Remove default page if empty
  const existingPages = figma.root.children;

  // Create 4 pages
  const colorPage = figma.createPage();
  colorPage.name = "Color Palette";

  const typePage = figma.createPage();
  typePage.name = "Typography";

  const compPage = figma.createPage();
  compPage.name = "Components";

  const templatePage = figma.createPage();
  templatePage.name = "Page Templates";

  // Build each page
  figma.notify("Building Color Palette...");
  await buildColorPalettePage(colorPage);

  figma.notify("Building Typography...");
  await buildTypographyPage(typePage);

  figma.notify("Building Components...");
  await buildComponentsPage(compPage);

  figma.notify("Building Page Templates...");
  await buildTemplatesPage(templatePage);

  // Remove empty default page
  if (existingPages.length === 1 && existingPages[0].children.length === 0) {
    existingPages[0].remove();
  }

  // Navigate to color page
  figma.currentPage = colorPage;
  figma.viewport.scrollAndZoomIntoView(colorPage.children);

  figma.notify("NodeBench Design System created! 🎨", { timeout: 5000 });
  figma.closePlugin();
}

main();
