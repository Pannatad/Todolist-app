const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PDF_TYPE = 'application/pdf';
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;
const MAX_PDF_PAGES = 30;
const MAX_PDF_TEXT_CHARS = 50_000;

export const validateChatAttachment = (file) => {
    if (!file) throw new Error('Choose an image or PDF to attach.');
    if (SUPPORTED_IMAGE_TYPES.has(file.type)) {
        if (file.size > MAX_IMAGE_BYTES) {
            throw new Error('Images must be 6 MB or smaller.');
        }
        return 'image';
    }
    if (file.type === PDF_TYPE) {
        if (file.size > MAX_PDF_BYTES) {
            throw new Error('PDFs must be 10 MB or smaller.');
        }
        return 'pdf';
    }
    throw new Error('Use a PNG, JPEG, WebP, or PDF file.');
};

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.readAsDataURL(file);
});

const imageElementFromFile = async (file) => {
    if (typeof createImageBitmap === 'function') return createImageBitmap(file);

    const dataUrl = await fileToDataUrl(file);
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Could not decode the selected image.'));
        image.src = dataUrl;
    });
};

const prepareImage = async (file) => {
    const source = await imageElementFromFile(file);
    const width = source.width;
    const height = source.height;
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, targetWidth, targetHeight);
    context.drawImage(source, 0, 0, targetWidth, targetHeight);
    source.close?.();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    return {
        kind: 'image',
        name: file.name,
        mimeType: 'image/jpeg',
        data: dataUrl.split(',')[1],
        previewUrl: dataUrl,
        width: targetWidth,
        height: targetHeight,
    };
};

const preparePdf = async (file) => {
    const [{ getDocument, GlobalWorkerOptions }, workerModule] = await Promise.all([
        import('pdfjs-dist/legacy/build/pdf.mjs'),
        import('pdfjs-dist/legacy/build/pdf.worker.mjs?url'),
    ]);
    GlobalWorkerOptions.workerSrc = workerModule.default;

    const loadingTask = getDocument({
        data: new Uint8Array(await file.arrayBuffer()),
        isEvalSupported: false,
    });
    const document = await loadingTask.promise;
    const totalPages = document.numPages;
    const pageCount = Math.min(totalPages, MAX_PDF_PAGES);
    const sections = [];
    let chars = 0;

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item) => item.str || '')
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        const remaining = MAX_PDF_TEXT_CHARS - chars;
        if (remaining <= 0) break;
        const section = `Page ${pageNumber}:\n${pageText.slice(0, remaining)}`;
        sections.push(section);
        chars += section.length;
    }

    await loadingTask.destroy();
    if (!sections.some((section) => section.replace(/^Page \d+:\n/, '').trim())) {
        throw new Error('This PDF has no extractable text. Scanned PDFs need OCR, which is not enabled yet.');
    }

    const truncated = totalPages > pageCount || chars >= MAX_PDF_TEXT_CHARS;
    return {
        kind: 'pdf',
        name: file.name,
        mimeType: PDF_TYPE,
        text: sections.join('\n\n'),
        pageCount: totalPages,
        truncated,
    };
};

export const prepareChatAttachment = async (file) => {
    const kind = validateChatAttachment(file);
    return kind === 'image' ? prepareImage(file) : preparePdf(file);
};

export const attachmentMetadata = (attachment) => attachment ? {
    kind: attachment.kind,
    name: attachment.name,
    mimeType: attachment.mimeType,
    ...(attachment.kind === 'image'
        ? { width: attachment.width, height: attachment.height }
        : { pageCount: attachment.pageCount, truncated: attachment.truncated }),
} : null;

export const buildAttachmentMessage = (prompt, attachment) => {
    if (!attachment) return prompt;
    if (attachment.kind === 'image') {
        return [
            { text: prompt },
            { inlineData: { data: attachment.data, mimeType: attachment.mimeType } },
        ];
    }

    const truncationNote = attachment.truncated
        ? '\n[The document was truncated to the configured page/text limit.]'
        : '';
    return `${prompt}\n\nATTACHED PDF: ${attachment.name}\n---\n${attachment.text}${truncationNote}\n---\nAnswer using the attached document when relevant.`;
};

export {
    MAX_IMAGE_BYTES,
    MAX_PDF_BYTES,
    MAX_PDF_PAGES,
    MAX_PDF_TEXT_CHARS,
};
