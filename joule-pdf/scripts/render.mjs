import { randomUUID } from 'node:crypto';
import { access, mkdir, readFile, realpath, rename, unlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const styles = new URL('../assets/print.css', import.meta.url);
const imageTypes = new Map([
  ['.avif', 'image/avif'], ['.bmp', 'image/bmp'], ['.gif', 'image/gif'],
  ['.jpeg', 'image/jpeg'], ['.jpg', 'image/jpeg'], ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'], ['.webp', 'image/webp'],
]);
const captionLabel = /^(?:(?:figure|fig\.?)\s+[a-z]?\d+[a-z]?|[图圖図]\s*\d+|그림\s*\d+)(?:[.:：．—–、]|$)/iu;
const allowedInlineTag = /^<\/?(?:sub|sup|em|strong|i|b|code|kbd|mark|s|u)>$|^<br\s*\/?>$/i;
const allowedMathTag = /^<math(?: display=(?:"block"|'block'))?>$|^<\/(?:math)>$|^<\/?(?:mrow|mi|mn|mo|mtext|mfrac|msqrt|mroot|msub|msup|msubsup|munder|mover|munderover|mtable|mtr|mtd)>$/i;
const usage = 'Usage: node render.mjs <approved.md> <output.pdf> [--node-modules <dir>] [--browser <exe>]';

function parseArguments(args) {
  const positionals = [];
  const options = { nodeModules: process.env.JOULE_NODE_MODULES, browser: process.env.JOULE_CHROMIUM };
  const optionKeys = { '--node-modules': 'nodeModules', '--browser': 'browser' };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    const key = optionKeys[arg];
    const value = args[index + 1];
    if (!key || !value || value.startsWith('--')) throw new Error(usage);
    options[key] = value;
    index += 1;
  }
  const [input, output] = positionals;
  if (positionals.length !== 2 || !/\.m(?:d|arkdown)$/i.test(input) || !/\.pdf$/i.test(output)) {
    throw new Error(usage);
  }
  return { ...options, input: path.resolve(input), output: path.resolve(output) };
}

async function loadPackage(name, nodeModules) {
  try {
    const entry = require.resolve(nodeModules ? path.resolve(nodeModules, name) : name);
    return await import(pathToFileURL(entry).href);
  } catch (cause) {
    throw new Error(`Could not load ${name}. Use --node-modules to point to the bundled Node packages.`, { cause });
  }
}

async function chooseBrowser(browser) {
  if (browser) return path.resolve(browser);
  if (process.platform !== 'win32') return undefined;

  const programFiles = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], 'C:\\Program Files', 'C:\\Program Files (x86)'];
  const locations = [...new Set([...programFiles, process.env.LOCALAPPDATA].filter(Boolean))];
  const browsers = ['Google/Chrome/Application/chrome.exe', 'Microsoft/Edge/Application/msedge.exe'];
  for (const name of browsers) {
    for (const location of locations) {
      const candidate = path.join(location, name);
      if (await access(candidate).then(() => true, () => false)) return candidate;
    }
  }
  return undefined;
}

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function isInside(directory, target) {
  const relative = path.relative(directory, target);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function embedImage(href, sourceRoot) {
  if (!href || /^(?:[a-z][a-z\d+.-]*:|[\\/])/i.test(href)) {
    throw new Error(`Image must use a local relative Markdown link: ${href || '(empty link)'}`);
  }

  const url = new URL(href, pathToFileURL(`${sourceRoot}${path.sep}`));
  const requested = fileURLToPath(url);
  if (!isInside(sourceRoot, requested)) throw new Error(`Image is outside the Markdown directory: ${href}`);
  const type = imageTypes.get(path.extname(requested).toLowerCase());
  if (!type) throw new Error(`Unsupported image format: ${href}. Place a faithful SVG or PNG copy in the asset directory.`);

  try {
    const file = await realpath(requested);
    if (!isInside(sourceRoot, file)) throw new Error('Image resolves outside the Markdown directory.');
    const bytes = await readFile(file);
    return `data:${type};base64,${bytes.toString('base64')}${url.hash}`;
  } catch (cause) {
    throw new Error(`Could not embed image ${href}. ${cause.message}`, { cause });
  }
}

function isImage(token) {
  return token.type === 'image' || (token.type === 'link' && token.tokens.length === 1 && token.tokens[0].type === 'image');
}

function isStandaloneImage(token) {
  if (token?.type !== 'paragraph') return false;
  return token.tokens.some(isImage) && token.tokens.every((item) =>
    isImage(item) || item.type === 'br' || (item.type === 'text' && !item.text.trim()));
}

function isCaption(token) {
  if (token?.type !== 'paragraph') return false;
  const first = token.tokens[0];
  return first && ['text', 'strong'].includes(first.type) && captionLabel.test(first.text.trimStart());
}

function groupFigures(tokens) {
  const grouped = [];
  for (let index = 0; index < tokens.length;) {
    const token = tokens[index];
    index += 1;
    if (!isStandaloneImage(token)) {
      grouped.push(token);
      continue;
    }

    const paragraphs = [token];
    while (index < tokens.length) {
      if (tokens[index].type === 'space') index += 1;
      if (!isStandaloneImage(tokens[index])) break;
      paragraphs.push(tokens[index]);
      index += 1;
    }

    if (isCaption(tokens[index])) {
      grouped.push({ type: 'jouleFigure', paragraphs, caption: tokens[index] });
      index += 1;
    } else {
      grouped.push(...paragraphs.map((paragraph) => ({ type: 'jouleFigure', paragraphs: [paragraph] })));
    }
  }
  return grouped;
}

async function markdownToHtml(markdown, sourceRoot, Marked) {
  const headings = new Set();
  const md = new Marked({ gfm: true });
  md.use({
    renderer: {
      heading({ tokens, depth }) {
        const base = this.parser.parseInline(tokens, this.parser.textRenderer).toLowerCase()
          .replace(/&(?:[a-z]+|#x?[a-f\d]+);/gi, '')
          .replace(/[^\p{L}\p{N}\p{M}_\s-]/gu, '').trim().replace(/\s+/g, '-') || 'section';
        let id = base;
        for (let count = 1; headings.has(id); count += 1) id = `${base}-${count}`;
        headings.add(id);
        return `<h${depth} id="${escapeHtml(id)}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
      },
      html({ text }) {
        if (text.startsWith('<!--') && text.trimEnd().endsWith('-->')) return '';
        if (allowedInlineTag.test(text) || allowedMathTag.test(text)) return text;
        if (/^\s*<math(?: display=(?:"block"|'block'))?>[\s\S]*<\/math>\s*$/i.test(text)) {
          return text.replace(/<[^>]*>/g, (tag) => allowedMathTag.test(tag) ? tag : escapeHtml(tag));
        }
        return escapeHtml(text);
      },
      image(token) {
        if (!token.title?.startsWith('width=')) return false;
        const width = Number(/^width=(\d+(?:\.\d+)?)mm$/.exec(token.title)?.[1]);
        if (!(width >= 1 && width <= 172)) throw new Error(`Invalid image placement ${token.title}. Use width=NNmm from 1 to 172 mm.`);
        const alt = this.parser.parseInline(token.tokens, this.parser.textRenderer);
        return `<img src="${escapeHtml(token.href)}" alt="${escapeHtml(alt)}" style="--figure-width:${width}mm">`;
      },
      link({ href, tokens }) {
        const target = href.replace(/[\x00-\x20]/g, '');
        if (/^(?:[a-z][a-z\d+.-]*:|[\\/]{2})/i.test(target) && !/^(?:https?:|mailto:)/i.test(target)) {
          return this.parser.parseInline(tokens);
        }
        return false;
      },
    },
    extensions: [{
      name: 'jouleFigure',
      renderer({ paragraphs, caption }) {
        const panels = paragraphs.map(({ tokens }) => this.parser.parseInline(tokens.filter(isImage))).join('');
        const label = caption ? `<figcaption>${this.parser.parseInline(caption.tokens)}</figcaption>` : '';
        return `<figure class="figure"><div class="figure-media">${panels}</div>${label}</figure>\n`;
      },
    }],
  });

  const tokens = md.lexer(markdown.replace(/^\uFEFF/, ''));
  const images = [];
  md.walkTokens(tokens, (token) => { if (token.type === 'image') images.push(token); });
  const data = new Map();
  await Promise.all(images.map(async (token) => {
    if (!data.has(token.href)) data.set(token.href, embedImage(token.href, sourceRoot));
    token.href = await data.get(token.href);
  }));
  const firstTitle = tokens.find((token) => token.type === 'heading' && token.depth === 1);
  return { body: md.parser(groupFigures(tokens)), title: firstTitle?.text };
}

async function exportPdf(chromium, browserPath, document, css, output) {
  let browser;
  try {
    browser = await chromium.launch({ executablePath: browserPath, headless: true });
  } catch (cause) {
    const reason = cause.message.split('\n')[0];
    throw new Error(`Could not start Chromium. Use --browser to point to an installed Chrome or Edge executable. ${reason}`, { cause });
  }

  try {
    const page = await browser.newPage({ offline: true });
    await page.emulateMedia({ media: 'print' });
    await page.setContent(`<!doctype html>
<html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'">
<title>${escapeHtml(document.title)}</title><style>${css}</style></head>
<body><article>${document.body}</article></body></html>`, { waitUntil: 'load' });
    const broken = await page.locator('img').evaluateAll((images) => images
      .filter((image) => !image.complete || !image.naturalWidth)
      .map((image) => image.alt || '(image without alt text)'));
    if (broken.length) throw new Error(`Chromium could not decode these figures: ${broken.join(', ')}.`);

    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
    const targetDir = path.dirname(output);
    await mkdir(targetDir, { recursive: true });
    const temporary = path.join(targetDir, `.joule-${randomUUID()}.tmp`);
    await writeFile(temporary, pdf, { flag: 'wx' });
    try {
      await rename(temporary, output);
    } catch (error) {
      await unlink(temporary).catch(() => {});
      throw error;
    }
  } finally {
    await browser.close();
  }
}

async function main(args) {
  if (args.length === 1 && ['-h', '--help'].includes(args[0])) {
    console.log(usage);
    return;
  }
  const options = parseArguments(args);
  const [markdown, css, sourceRoot, { Marked }, playwright, browser] = await Promise.all([
    readFile(options.input, 'utf8'), readFile(styles, 'utf8'), realpath(path.dirname(options.input)),
    loadPackage('marked', options.nodeModules), loadPackage('playwright', options.nodeModules),
    chooseBrowser(options.browser),
  ]);

  const document = await markdownToHtml(markdown, sourceRoot, Marked);
  document.title ??= path.basename(options.input, path.extname(options.input));
  const chromium = playwright.chromium ?? playwright.default?.chromium;
  if (!chromium) throw new Error('The installed Playwright package does not expose Chromium.');
  await exportPdf(chromium, browser, document, css, options.output);
  console.log(options.output);
}

main(process.argv.slice(2)).catch((error) => {
  console.error(`Could not render PDF. ${error.message}`);
  process.exitCode = 1;
});
