// iOS system colors for the idea palette names stored on each note.
const IDEA_HEX = {
    slate: '#8e8e93',
    sky: '#32ade6',
    teal: '#30b0c7',
    emerald: '#34c759',
    amber: '#ffcc00',
    orange: '#ff9500',
    rose: '#ff3b30',
    pink: '#ff2d55',
    violet: '#af52de',
    cyan: '#5ac8fa',
};

const getIdeaHex = (color) => IDEA_HEX[color] || IDEA_HEX.slate;

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
    getIdeaHex,
    getDetailLines,
    ideaMatchesQuery,
    parseDetailLine,
    resizeLineEditor,
};

