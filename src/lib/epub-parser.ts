import { unzipSync } from "fflate";
import * as cheerio from "cheerio";

/**
 * A single chapter extracted from an EPUB file.
 */
export interface EpubChapter {
  /** Chapter title, derived from the XHTML heading or spine ID */
  title: string;
  /** Array of paragraph text strings */
  paragraphs: string[];
}

/**
 * Structured data extracted from a parsed EPUB file.
 */
export interface EpubData {
  /** Book title from OPF metadata */
  title: string;
  /** Book author from OPF metadata */
  author: string | null;
  /** Book language from OPF metadata */
  language: string | null;
  /** Base64-encoded cover image data URI, or null if unavailable */
  coverImage: string | null;
  /** Ordered chapters with their paragraph content */
  chapters: EpubChapter[];
}

/** MIME types supported for cover images. */
const COVER_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

/**
 * Reads a UTF-8 text file from the unzipped EPUB file map.
 *
 * @param files - Map of file paths to their byte content from fflate
 * @param path - Relative path within the EPUB archive
 * @returns Decoded string content of the file
 * @throws Error if the file is not found in the archive
 */
function readTextFile(files: Record<string, Uint8Array>, path: string): string {
  const data = files[path];
  if (!data) {
    throw new Error(`EPUB: file not found: ${path}`);
  }
  return new TextDecoder("utf-8").decode(data);
}

/**
 * Resolves a relative path against the base path of a given file.
 *
 * @param basePath - The directory or file path to resolve against
 * @param relativePath - The relative path to resolve
 * @returns The resolved absolute-style path within the EPUB
 */
function resolvePath(basePath: string, relativePath: string): string {
  // Strip the filename to get the directory
  const baseDir = basePath.substring(0, basePath.lastIndexOf("/") + 1);

  // Normalize the relative path
  const parts = relativePath.split("/");
  const resolved: string[] = [];

  for (const part of parts) {
    if (part === "..") {
      resolved.pop();
    } else if (part !== "." && part !== "") {
      resolved.push(part);
    }
  }

  const joined = baseDir + resolved.join("/");
  return joined;
}

/**
 * Parses the META-INF/container.xml file to locate the OPF file path.
 *
 * @param files - Map of file paths to their byte content
 * @returns The path to the OPF (.opf) file within the archive
 */
function findOpfPath(files: Record<string, Uint8Array>): string {
  const containerXml = readTextFile(files, "META-INF/container.xml");
  const $ = cheerio.load(containerXml, { xmlMode: true });

  const opfPath = $("rootfile").attr("full-path");
  if (!opfPath) {
    throw new Error("EPUB: container.xml does not contain a rootfile path");
  }

  return opfPath;
}

/**
 * Metadata extracted from the OPF package document.
 */
interface OpfMetadata {
  title: string;
  author: string | null;
  language: string | null;
}

/**
 * Parses the OPF file and extracts Dublin Core metadata.
 *
 * @param files - Map of file paths to their byte content
 * @param opfPath - Path to the OPF file within the archive
 * @returns Structured metadata from the OPF
 */
function parseOpfMetadata(
  files: Record<string, Uint8Array>,
  opfPath: string,
): OpfMetadata {
  const opfContent = readTextFile(files, opfPath);
  const $ = cheerio.load(opfContent, { xmlMode: true });

  // Dublin Core namespace elements: dc:title, dc:creator, dc:language
  const title =
    $("metadata title").first().text().trim() ||
    $("metadata\\:title").first().text().trim() ||
    $("[\\:xmlns]").find("title").first().text().trim() ||
    "Untitled";

  // Try multiple author selectors
  const author =
    $("metadata creator").first().text().trim() ||
    $("metadata\\:creator").first().text().trim() ||
    null;

  const language =
    $("metadata language").first().text().trim() ||
    $("metadata\\:language").first().text().trim() ||
    null;

  return { title, author, language };
}

/**
 * Information about a manifest item from the OPF.
 */
interface ManifestItem {
  /** The item ID */
  id: string;
  /** MIME media type */
  mediaType: string;
  /** Path to the resource within the EPUB */
  href: string;
  /** Optional cover image flag */
  isCover: boolean;
}

/**
 * Parses the manifest section of an OPF file.
 *
 * @param files - Map of file paths to their byte content
 * @param opfPath - Path to the OPF file within the archive
 * @returns Array of manifest items
 */
function parseManifest(
  files: Record<string, Uint8Array>,
  opfPath: string,
): ManifestItem[] {
  const opfContent = readTextFile(files, opfPath);
  const $ = cheerio.load(opfContent, { xmlMode: true });

  const items: ManifestItem[] = [];

  $("manifest item").each((_index, element) => {
    const $el = $(element);
    const id = $el.attr("id") ?? "";
    const mediaType = $el.attr("media-type") ?? "";
    const href = $el.attr("href") ?? "";
    const properties = $el.attr("properties") ?? "";

    const isCover =
      id.toLowerCase() === "cover" ||
      properties.toLowerCase().includes("cover-image");

    items.push({ id, mediaType, href, isCover });
  });

  return items;
}

/**
 * Extracts the ordered spine itemrefs from the OPF file.
 *
 * @param files - Map of file paths to their byte content
 * @param opfPath - Path to the OPF file within the archive
 * @returns Array of idref values in reading order
 */
function parseSpine(
  files: Record<string, Uint8Array>,
  opfPath: string,
): string[] {
  const opfContent = readTextFile(files, opfPath);
  const $ = cheerio.load(opfContent, { xmlMode: true });

  const spineItems: string[] = [];

  $("spine itemref").each((_index, element) => {
    const idref = $(element).attr("idref");
    if (idref) {
      spineItems.push(idref);
    }
  });

  return spineItems;
}

/**
 * Builds a map from content file href (filename only) to chapter title by
 * parsing the EPUB2 NCX file (application/x-dtbncx+xml).
 *
 * @param files - Map of file paths to their byte content
 * @param opfPath - Path to the OPF file (used to resolve the NCX path)
 * @param manifest - Parsed manifest items
 * @returns Map of resolved file path → chapter title
 */
function parseNcxTitles(
  files: Record<string, Uint8Array>,
  opfPath: string,
  manifest: ManifestItem[],
): Map<string, string> {
  const titleMap = new Map<string, string>();

  const ncxItem = manifest.find(
    (item) =>
      item.mediaType === "application/x-dtbncx+xml" ||
      item.href.endsWith(".ncx"),
  );
  if (!ncxItem) return titleMap;

  try {
    const ncxPath = resolvePath(opfPath, ncxItem.href);
    const ncxContent = readTextFile(files, ncxPath);
    const $ = cheerio.load(ncxContent, { xmlMode: true });

    $("navPoint").each((_i, el) => {
      const label = $(el).children("navLabel").first().children("text").text().trim();
      const contentSrc = $(el).children("content").first().attr("src") ?? "";
      if (!label || !contentSrc) return;

      // Strip fragment identifier (#anchor)
      const href = contentSrc.split("#")[0]!;
      const resolvedPath = resolvePath(ncxPath, href);
      if (label) titleMap.set(resolvedPath, label);
    });
  } catch {
    // NCX parse failure is non-fatal
  }

  return titleMap;
}

/**
 * Builds a map from content file href to chapter title by parsing the EPUB3
 * navigation document (manifest item with properties="nav").
 *
 * @param files - Map of file paths to their byte content
 * @param opfPath - Path to the OPF file
 * @param manifest - Parsed manifest items
 * @returns Map of resolved file path → chapter title
 */
function parseNavTitles(
  files: Record<string, Uint8Array>,
  opfPath: string,
  manifest: ManifestItem[],
): Map<string, string> {
  const titleMap = new Map<string, string>();

  const navItem = manifest.find((item) =>
    (item.mediaType ?? "").includes("html") &&
    item.href.includes("nav"),
  ) ?? manifest.find((item) =>
    (item.mediaType ?? "").includes("html") &&
    (item.id ?? "").toLowerCase() === "nav",
  );

  if (!navItem) return titleMap;

  try {
    const navPath = resolvePath(opfPath, navItem.href);
    const navContent = readTextFile(files, navPath);
    const $ = cheerio.load(navContent, { xmlMode: false });

    // EPUB3 nav document: <nav epub:type="toc"> or <nav id="toc">
    const tocNav = $("nav").filter((_i, el) => {
      const epubType = $(el).attr("epub:type") ?? "";
      const id = $(el).attr("id") ?? "";
      return epubType.includes("toc") || id.toLowerCase() === "toc";
    });

    (tocNav.length ? tocNav : $("nav").first()).find("a").each((_i, el) => {
      const label = $(el).text().trim();
      const href = ($(el).attr("href") ?? "").split("#")[0]!;
      if (!label || !href) return;

      const resolvedPath = resolvePath(navPath, href);
      titleMap.set(resolvedPath, label);
    });
  } catch {
    // NAV parse failure is non-fatal
  }

  return titleMap;
}

/** EPUB block-level selectors that represent self-contained text paragraphs. */
const BLOCK_SELECTORS = "p, h1, h2, h3, h4, h5, h6, blockquote, li, dt, dd, pre";

/**
 * Extracts paragraph text from an XHTML chapter file.
 * Only collects "leaf" block elements (those that don't directly wrap other
 * block elements) to avoid duplicating text from nested structures.
 *
 * @param files - Map of file paths to their byte content
 * @param filePath - Path to the XHTML file within the archive
 * @returns Object containing the chapter title and array of paragraph strings
 */
function extractChapterContent(
  files: Record<string, Uint8Array>,
  filePath: string,
): { title: string; paragraphs: string[] } {
  const content = readTextFile(files, filePath);
  const $ = cheerio.load(content, { xmlMode: false });

  // Collect only leaf-level block elements to avoid duplicate text
  const paragraphs: string[] = [];
  const BLOCK_TAGS = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "li", "dt", "dd", "pre"]);

  $("body").find(BLOCK_SELECTORS).each((_index, element) => {
    // Skip if this element is nested inside another block element we'll also visit
    const parent = $(element).parent().get(0);
    if (parent && BLOCK_TAGS.has((parent.tagName ?? "").toLowerCase())) {
      // e.g. <li> inside <blockquote>, or <p> inside <blockquote>
      // only skip if the parent itself is a tracked block (not body/div/section)
    }

    // Skip if this element contains child block elements (not a leaf)
    const hasBlockChild = $(element).find(BLOCK_SELECTORS).length > 0;
    if (hasBlockChild) return;

    const text = $(element).text().trim();
    if (text.length > 0) {
      paragraphs.push(text);
    }
  });

  // Fallback: no structured elements found — split raw body text
  if (paragraphs.length === 0) {
    const bodyText = $("body").text().trim();
    if (bodyText.length > 0) {
      const parts = bodyText
        .split(/\n\s*\n|\r\n\s*\r\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      paragraphs.push(...(parts.length > 0 ? parts : [bodyText]));
    }
  }

  // Chapter title: first heading in body (may be overridden by NCX/NAV caller)
  const headingText =
    $("body").find("h1, h2, h3, h4, h5, h6").first().text().trim() ||
    $("title").first().text().trim() ||
    `Chapter ${filePath}`;

  return { title: headingText, paragraphs };
}

/**
 * Attempts to locate and extract the cover image from the EPUB manifest.
 *
 * Searches for manifest items marked as cover or with supported image MIME types.
 * Returns a base64 data URI string if a cover is found, or null otherwise.
 *
 * @param files - Map of file paths to their byte content
 * @param opfPath - Path to the OPF file within the archive
 * @param manifest - Parsed manifest items
 * @returns Base64 data URI string (e.g. "data:image/jpeg;base64,...") or null
 */
function extractCoverImage(
  files: Record<string, Uint8Array>,
  opfPath: string,
  manifest: ManifestItem[],
): string | null {
  // First, look for items explicitly marked as cover
  let coverItem = manifest.find((item) => item.isCover);

  // If no explicit cover, look for the first image with a supported type
  if (!coverItem) {
    coverItem = manifest.find(
      (item) =>
        item.mediaType !== "" && COVER_MIME_TYPES.has(item.mediaType),
    );
  }

  if (!coverItem) {
    return null;
  }

  const coverFilePath = resolvePath(opfPath, coverItem.href);
  const coverData = files[coverFilePath];

  if (!coverData) {
    return null;
  }

  const mediaType = coverItem.mediaType || "image/jpeg";
  const base64 = arrayBufferToBase64(coverData.buffer as ArrayBuffer);

  return `data:${mediaType};base64,${base64}`;
}

/**
 * Converts an ArrayBuffer to a base64 string.
 *
 * @param buffer - The ArrayBuffer to encode
 * @returns Base64-encoded string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }

  return btoa(binary);
}

/**
 * Parses an EPUB file from its raw binary data and returns structured content.
 *
 * Extracts metadata (title, author, language), cover image, and all chapter
 * content in reading order. The EPUB is treated as a ZIP archive using fflate,
 * with the standard EPUB container structure (META-INF/container.xml -> OPF).
 *
 * @param buffer - Raw ArrayBuffer of the EPUB file
 * @returns Structured EPUB data including metadata, cover, and chapters
 * @throws Error if the EPUB structure is invalid or required files are missing
 *
 * @example
 * ```ts
 * const fileInput = document.querySelector('input[type="file"]')!;
 * const buffer = await fileInput.files[0]!.arrayBuffer();
 * const epub = parseEpub(buffer);
 * console.log(epub.title, epub.chapters.length);
 * ```
 */
export function parseEpub(buffer: ArrayBuffer): EpubData {
  const files = unzipSync(new Uint8Array(buffer));

  const opfPath = findOpfPath(files);
  const metadata = parseOpfMetadata(files, opfPath);
  const manifest = parseManifest(files, opfPath);
  const spineItems = parseSpine(files, opfPath);

  // Build chapter title maps from NCX (EPUB2) and NAV (EPUB3).
  // NCX takes priority; NAV is the fallback.
  const ncxTitles = parseNcxTitles(files, opfPath, manifest);
  const navTitles = parseNavTitles(files, opfPath, manifest);

  // Build a lookup map from manifest item ID to manifest item
  const manifestById = new Map<string, ManifestItem>();
  for (const item of manifest) {
    manifestById.set(item.id, item);
  }

  // Extract cover image
  const coverImage = extractCoverImage(files, opfPath, manifest);

  // Process each spine item in reading order
  const chapters: EpubChapter[] = [];

  for (const idref of spineItems) {
    const manifestItem = manifestById.get(idref);
    if (!manifestItem) {
      continue;
    }

    // Only process XHTML/HTML content files
    const mediaType = manifestItem.mediaType.toLowerCase();
    const isXhtml =
      mediaType.includes("html") ||
      manifestItem.href.endsWith(".html") ||
      manifestItem.href.endsWith(".xhtml") ||
      manifestItem.href.endsWith(".htm");

    if (!isXhtml) {
      continue;
    }

    const filePath = resolvePath(opfPath, manifestItem.href);

    try {
      const { title: headingTitle, paragraphs } = extractChapterContent(files, filePath);

      // Skip completely empty chapters (e.g. cover page, blank pages)
      if (paragraphs.length === 0) {
        continue;
      }

      // Prefer NCX title → NAV title → heading title (fallback)
      const title =
        ncxTitles.get(filePath) ??
        navTitles.get(filePath) ??
        headingTitle;

      chapters.push({ title, paragraphs });
    } catch {
      // If a chapter file is missing or unreadable, skip it
      continue;
    }
  }

  return {
    title: metadata.title,
    author: metadata.author,
    language: metadata.language,
    coverImage,
    chapters,
  };
}

/**
 * Creates a URL-safe slug from a book title.
 *
 * Converts to lowercase, transliterates common Unicode characters to ASCII
 * equivalents, replaces non-alphanumeric characters with hyphens, collapses
 * consecutive hyphens, and trims leading/trailing hyphens.
 *
 * @param title - The raw book title string
 * @returns A URL-safe slug string suitable for use in paths or identifiers
 *
 * @example
 * ```ts
 * generateSlug("Les Misérables");        // "les-miserables"
 * generateSlug("1984");                   // "1984"
 * generateSlug("  A Tale of Two Cities ") // "a-tale-of-two-cities"
 * ```
 */
export function generateSlug(title: string): string {
  return title
    .trim()
    .toLowerCase()
    // Common Unicode -> ASCII transliterations
    .replace(/\u00e0|\u00e1|\u00e2|\u00e3|\u00e4|\u00e5/g, "a")
    .replace(/\u00e7/g, "c")
    .replace(/\u00e8|\u00e9|\u00ea|\u00eb/g, "e")
    .replace(/\u00ec|\u00ed|\u00ee|\u00ef/g, "i")
    .replace(/\u00f0/g, "d")
    .replace(/\u00f1/g, "n")
    .replace(/\u00f2|\u00f3|\u00f4|\u00f5|\u00f6|\u00f8/g, "o")
    .replace(/\u00f9|\u00fa|\u00fb|\u00fc/g, "u")
    .replace(/\u00fd|\u00ff/g, "y")
    .replace(/\u00fe/g, "th")
    .replace(/\u00df/g, "ss")
    .replace(/\u2019|\u2018/g, "'")
    .replace(/\u201c|\u201d/g, '"')
    // Replace any remaining non-alphanumeric (except spaces/hyphens) with nothing
    .replace(/[^a-z0-9\s-]/g, "")
    // Collapse whitespace and hyphens into a single hyphen
    .replace(/[\s-]+/g, "-")
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, "");
}
