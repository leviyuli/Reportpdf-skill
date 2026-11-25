# Transfer source material into Markdown

Read the source in its normal presentation or reading view. Use extraction to recover text and assets, and compare it with that view to confirm reading order, visible content, cropping, grouping, and the connection between a figure and its caption. Convert headings, lists, and comparable tables to Markdown. Keep numbers, units, equation symbols, citations, and intended emphasis faithful to the source. Preserve the original language.

## Source workflows

| Source | Inspect and transfer |
| --- | --- |
| PPTX | Read the slides in deck order. Use PowerPoint's visible view or export visible slides to PDF for comparison. Use bundled `python-pptx` for text, table cells, grouped shapes, image blobs, and hyperlinks as needed. Check actual slide number against the deck, since excluding hidden slides can shift exported PDF page numbers. A slide with OOXML `show="0"` is hidden. Include hidden slides and speaker notes only on request. Transfer meaningful figures as separate assets when extraction preserves their authored appearance. For cropped images, overlaid labels, native charts, or grouped panels, export the composed region as one figure. |
| PDF | Inspect rendered pages using Poppler `pdftoppm`. Use bundled `pdfplumber` or `pypdf` for selectable text, text coordinates, images, and link annotations. Reconstruct columns and captions in visual reading order. Extract a source image only when it carries the complete visible figure. For a vector region, use a faithful SVG export if supported by an available tool. Otherwise crop the rendered page closely around the complete region. For scanned pages, use available OCR for draft text and verify it against the page. Flag any unreadable passage or uncertain value. |
| DOCX | Use Word's reading view or PDF export as a visual reference. Use bundled `python-docx` or the underlying OOXML for body order, styles, tables, images, and hyperlink or citation targets. Read paragraphs and tables together in document order. Match each existing caption with its figure and keep any meaningful figure or table layout that crosses extraction boundaries. Use rendered source regions when floating objects, complex tables, or equations would otherwise lose information. |
| Markdown or pasted text | Preserve the existing heading structure, links, lists, text order, and figure relationships. When moving Markdown into a review folder, copy linked local assets and resolve each relative path against the original Markdown location before updating it. For pasted text, use plain Markdown formatting and request missing original assets when none were supplied. |
| Standalone figures | Keep supplied assets as the source of record. Prefer an existing, visually equivalent SVG to a raster preview. For figures with links to supplied titles or source credits, carry those into their captions. Treat photographs, diagrams, and other visuals according to their legibility and fidelity. |

## Write for the report reader

- State the configuration, observation, or interpretation directly. Convert phrases such as “both slide headers give” or “the slides propose” into the technical statement itself. Preserve attribution when it identifies a distinct author or study, and preserve the original certainty with wording such as “suggests” or “may”.
- When a label is ambiguous, report the supported value or condition and flag the ambiguity in the review response. Give the before and after values of a stated dimensional change. Identify the component or mechanism only when the source supports it.
- Use report-local figure and panel numbers throughout. Replace input slide or page references with the applicable report callout. Keep authored or scholarly credits where attribution matters.

## Figure assets and captions

1. Keep the original crop, aspect ratio, panel order, annotations, scale bars, and scientific encodings. An unmodified source image is ideal when it matches the displayed version. Use a faithful export or crop of the composed figure if extraction would lose an overlay, camera crop, or panel. Use a whole slide only when the composition needs it.
2. Keep browser-ready assets in a sibling `assets/` directory. Use SVG for portable vectors and original PNG, JPEG, or other browser-ready raster assets when appropriate. Check SVGs with external fonts, images, or styles against the source rendering. For a PDF, EMF, WMF, or TIFF asset, prefer a faithful SVG conversion if available and reliable. Otherwise export or render it to a lossless PNG at adequate size. With Poppler, `pdftoppm -f 3 -l 3 -singlefile -r 300 -png source.pdf page-03` renders page 3 for a faithful crop. Use higher resolution when fine lines or small labels need it. Keep any original file used to make a derivative.
3. Label multi-panel figures **a**, **b**, **c**, and so on in reading order at the top left of each main panel. Keep each inset with its parent panel. Put the labels in the margin or clear space and check their legibility at the intended size. Reuse existing labels that match. For a composed raster, a self-contained SVG can place live text labels above the unchanged embedded artwork.
4. Write a standalone Markdown image followed by a blank line and its caption paragraph. Use descriptive alt text and begin the caption with the report figure number. Describe the measurements, comparisons, or conditions panel by panel using `(a)`, `(b)`, and so on. Use matching references such as `Fig. 2b` in the relevant body sentence. Use `Fig. 2` for a whole figure or a single-panel figure. Verify the callouts and captions against the labeled artwork.

```markdown
The resistance increased with current density (Fig. 2b).

![Polarization and resistance measurements](assets/response-chart.svg)

**Figure 2.** (a) Polarization curves. (b) High-frequency resistance versus current density.
```

Keep substantive citations available in the Markdown. Use a source crop for an equation or complex table when readable native markup would change its meaning. Keep it near the corresponding text and preserve substantive labels or credits. Compare all prepared assets at their proposed placed size. Review existing data plots using `pyplot-setup` as a flexible legibility check. Keep original plots through minor style differences. If material is missing, clipped, ambiguous, or still difficult to read after choosing the best available original and placement, flag the issue by report figure or section in the review response. Preserve the best available figure and its existing data.
