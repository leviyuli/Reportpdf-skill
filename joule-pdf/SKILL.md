---
name: joule-pdf
description: Format technical material as a Joule-inspired, single-column A4 PDF. Prepare editable Markdown for approval, then render it with the supplied print stylesheet. Use for technical sharing from Markdown, pasted text, PowerPoint, PDF, Word, or standalone figures when the user wants this publication-style layout and original artwork retained.
---

# Joule-inspired technical PDFs

Use [published Joule](https://pure.tudelft.nl/ws/portalfiles/portal/123408899/1_s2.0_S2542435122002367_main.pdf) as a visual reference for heading hierarchy and figure captions. The supplied style uses a one-column A4 layout, white pages, a warm accent, and page numbers for technical sharing.

## Prepare Markdown for review

1. Read [source transfer](references/source-transfer.md) for the input formats in use. Work on copies. Default to visible slide content. Include speaker notes or hidden slides when requested.
2. Prepare a UTF-8 Markdown draft with relative links to its assets. Use the supplied title and metadata when available. Preserve source language, order, claims, values, units, and substantive citations. Lightly edit fragments for reading and use headings and lists to reflect the technical structure. State technical observations and qualified interpretations directly. Include summaries, highlights, and other sections only when supplied.
3. Keep each original figure using the best faithful representation available. Prefer native vector or the best original raster. Preserve aspect ratio, authored crops, composition, overlays, annotations, scale bars, and panel order. Use a faithful crop or a full slide when isolated assets would lose meaning. Place figures near the relevant text. Number figures in report order and label the main panels of a multi-panel figure visibly with lowercase **a**, **b**, **c**, and so on. Refer to the measurements in the report as `Fig. 1a`, `Fig. 1b`, or `Fig. 1` for a whole figure. Keep substantive captions and attribution. Write any missing panel descriptions from the artwork or supplied technical text. Omit input slide numbers, page positions, and other extraction locators from report prose and captions.
4. For scientific plots, consult the installed `pyplot-setup` skill when available. Treat intended-size readability, axes, legends, clipping, and distinguishability as flexible checks. Keep originals through cosmetic differences. Try a larger placement or a clearer export when needed. Preserve plot data, design, and marks. Keep and flag the best available original if material issues remain. Apply the same legibility and fidelity checks to other figures without applying plot-specific conventions.
5. Before delivering the Markdown and its linked assets, check that every figure callout maps to the visible report figure or panel and that the prose and captions stand alone. Note unresolved content, crop, readability, or attribution issues by report figure or section in the review response. Wait for the user's approval or explicit render request before creating the PDF. An existing Markdown file the user explicitly approves for rendering can start at the next stage. Keep the working bundle together and use a ZIP for review if individual asset links are impractical.

Use a standalone Markdown image and a separate caption paragraph so the renderer can group them. For filenames containing spaces, wrap the destination in angle brackets. Keep a composed panel together as one image when that best matches the source. When the default placement needs adjustment, set a width from 1 to 172 mm in the optional image title, as in the example.

```markdown
The voltage sweeps are shown in Fig. 1a and the resistance measurements in Fig. 1b.

![Voltage sweeps and resistance measurements](<assets/calibration results.svg> "width=130mm")

**Figure 1.** (a) Voltage sweeps. (b) High-frequency resistance versus current density.
```

## Render the approved Markdown

Use the approved file as the only content input to the renderer. Use `load_workspace_dependencies` when available to locate Node and the package directory containing Marked and Playwright. Run the command with paths to the installed skill, approved file, and intended output. Use the full Node executable path if Node is outside `PATH`. On Windows, the renderer looks for Chrome or Edge before trying Playwright's Chromium. Other platforms use Playwright's Chromium by default. Supply `--browser` to use a specific local executable.

```sh
node "<skill folder>/scripts/render.mjs" "<approved Markdown>" "<output PDF>" --node-modules "<Node packages directory>"
```

Keep supported image assets local to the Markdown bundle. Use a faithful PNG or self-contained SVG display copy for formats that Chromium cannot embed directly, while retaining the original asset. Before review, convert HTML image tags to Markdown image syntax and normalize TeX to verified Unicode, inline `<sub>` or `<sup>`, or native MathML as appropriate. Use a faithful source asset when markup cannot preserve a complex formula. Prefer stable absolute web links for supplied scholarly citations, or keep the citation text when a clickable link is unavailable. Flag any lost or unreadable content at the review step. Resolve render diagnostics before claiming a finished PDF.

Follow the available PDF skill for visual review. Render the PDF pages and inspect at intended size. Verify A4, legible figures, figure-caption pairing, readable page breaks, selectable text around image assets, and retained source links. Compare against the approved Markdown and check any tricky notation, tables, or script-specific glyphs. Deliver the PDF and flag any checks or source limitations that remain.
