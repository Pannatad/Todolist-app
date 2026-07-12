const COLOR_STYLES = {
    slate: { dot: 'bg-slate-500', text: 'text-slate-700', ring: 'ring-slate-200', soft: 'bg-slate-100', border: 'border-slate-200' },
    sky: { dot: 'bg-sky-500', text: 'text-sky-700', ring: 'ring-sky-200', soft: 'bg-sky-50', border: 'border-sky-200' },
    teal: { dot: 'bg-teal-500', text: 'text-teal-700', ring: 'ring-teal-200', soft: 'bg-teal-50', border: 'border-teal-200' },
    emerald: { dot: 'bg-emerald-500', text: 'text-emerald-700', ring: 'ring-emerald-200', soft: 'bg-emerald-50', border: 'border-emerald-200' },
    amber: { dot: 'bg-amber-500', text: 'text-amber-700', ring: 'ring-amber-200', soft: 'bg-amber-50', border: 'border-amber-200' },
    orange: { dot: 'bg-orange-500', text: 'text-orange-700', ring: 'ring-orange-200', soft: 'bg-orange-50', border: 'border-orange-200' },
    rose: { dot: 'bg-rose-500', text: 'text-rose-700', ring: 'ring-rose-200', soft: 'bg-rose-50', border: 'border-rose-200' },
    pink: { dot: 'bg-pink-500', text: 'text-pink-700', ring: 'ring-pink-200', soft: 'bg-pink-50', border: 'border-pink-200' },
    violet: { dot: 'bg-violet-500', text: 'text-violet-700', ring: 'ring-violet-200', soft: 'bg-violet-50', border: 'border-violet-200' },
    cyan: { dot: 'bg-cyan-500', text: 'text-cyan-700', ring: 'ring-cyan-200', soft: 'bg-cyan-50', border: 'border-cyan-200' }
};

const getColors = (color) => COLOR_STYLES[color] || COLOR_STYLES.slate;

const buildLookups = (nodes) => {
    const nodesById = Object.fromEntries(nodes.map((node) => [node.id, node]));
    const childrenByParentId = {};

    nodes.forEach((node) => {
        if (!node.parentId || !nodesById[node.parentId]) return;
        if (!childrenByParentId[node.parentId]) {
            childrenByParentId[node.parentId] = [];
        }
        childrenByParentId[node.parentId].push(node);
    });

    Object.values(childrenByParentId).forEach((children) => {
        children.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    });

    const roots = nodes
        .filter((node) => !node.parentId || !nodesById[node.parentId])
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return { nodesById, childrenByParentId, roots };
};

const ideaMatchesQuery = (node, query) => {
    if (!query) return true;
    return `${node.title} ${node.details}`.toLowerCase().includes(query);
};

const getDetailLines = (value) => value.split('\n');

const parseDetailLine = (line) => {
    const checkboxMatch = line.match(/^(\s*)- \[([ xX])\]\s?(.*)$/);
    if (checkboxMatch) {
        return {
            type: 'check',
            indentation: checkboxMatch[1],
            checked: checkboxMatch[2].toLowerCase() === 'x',
            content: checkboxMatch[3]
        };
    }

    const bulletMatch = line.match(/^(\s*)[-*]\s?(.*)$/);
    if (bulletMatch) {
        return {
            type: 'bullet',
            indentation: bulletMatch[1],
            checked: false,
            content: bulletMatch[2]
        };
    }

    const numberMatch = line.match(/^(\s*)(\d+)\.\s?(.*)$/);
    if (numberMatch) {
        return {
            type: 'number',
            indentation: numberMatch[1],
            checked: false,
            content: numberMatch[3],
            number: Number(numberMatch[2])
        };
    }

    return {
        type: 'plain',
        indentation: '',
        checked: false,
        content: line
    };
};

const buildDetailLine = (line, content) => {
    if (line.type === 'check') {
        return `${line.indentation}- [${line.checked ? 'x' : ' '}] ${content}`;
    }

    if (line.type === 'bullet') {
        return `${line.indentation}- ${content}`;
    }

    if (line.type === 'number') {
        return `${line.indentation}${line.number || 1}. ${content}`;
    }

    return content;
};

const createFormattedLine = (format, content, index = 0) => {
    if (format === 'check') {
        return {
            type: 'check',
            indentation: '',
            checked: false,
            content
        };
    }

    if (format === 'number') {
        return {
            type: 'number',
            indentation: '',
            checked: false,
            content,
            number: index + 1
        };
    }

    return {
        type: 'bullet',
        indentation: '',
        checked: false,
        content
    };
};

const createContinuationLine = (line) => {
    if (line.type === 'check') {
        return buildDetailLine({ ...line, checked: false }, '');
    }

    if (line.type === 'bullet') {
        return buildDetailLine(line, '');
    }

    if (line.type === 'number') {
        return buildDetailLine({ ...line, number: (line.number || 1) + 1 }, '');
    }

    return '';
};

const resizeLineEditor = (element) => {
    if (!element) return;
    element.style.height = '0px';
    element.style.height = `${Math.max(32, element.scrollHeight)}px`;
};

export {
    buildDetailLine,
    buildLookups,
    createContinuationLine,
    createFormattedLine,
    getColors,
    getDetailLines,
    ideaMatchesQuery,
    parseDetailLine,
    resizeLineEditor,
};

