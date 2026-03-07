import type { PhrasingContent, Root } from 'mdast';
import { findAndReplace } from 'mdast-util-find-and-replace';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const BARE_DOMAIN_REGEX =
    /(?<![@\w/-])(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}(?::\d{2,5})?(?:[/?#][^\s<]*)?/gi;

const ALWAYS_STRIP_TRAILING = new Set(['.', ',', '!', '?', ':', ';', '>', '\u3002', '\uFF0C', '\uFF01', '\uFF1F', '\uFF1A', '\uFF1B']);
const SKIPPED_NODE_TYPES = new Set(['link', 'linkReference', 'definition', 'inlineCode', 'code', 'image', 'imageReference', 'html']);
const BRACKET_PAIRS = [
    { open: '(', close: ')' },
    { open: '[', close: ']' },
    { open: '{', close: '}' }
] as const;

const markdownComponents: Components = {
    a: ({ className, ...props }) => (
        <a
            {...props}
            target="_blank"
            rel="noopener noreferrer"
            className={['text-blue-500 hover:text-blue-700 underline break-all', className].filter(Boolean).join(' ')}
        />
    )
};

const markdownPlugins = [remarkGfm, remarkAutoLinkBareDomains];

function countChar(value: string, char: string) {
    return value.split(char).length - 1;
}

function splitTrailingPunctuation(value: string) {
    let endIndex = value.length;

    while (endIndex > 0) {
        const lastChar = value[endIndex - 1];

        if (ALWAYS_STRIP_TRAILING.has(lastChar)) {
            endIndex -= 1;
            continue;
        }

        const bracketPair = BRACKET_PAIRS.find(({ close }) => close === lastChar);
        if (!bracketPair) {
            break;
        }

        const text = value.slice(0, endIndex);
        if (countChar(text, bracketPair.close) > countChar(text, bracketPair.open)) {
            endIndex -= 1;
            continue;
        }

        break;
    }

    return {
        urlText: value.slice(0, endIndex),
        trailingText: value.slice(endIndex)
    };
}

function createAutoLinkNodes(value: string): PhrasingContent[] | false {
    const { urlText, trailingText } = splitTrailingPunctuation(value);
    if (!urlText) {
        return false;
    }

    const nodes: PhrasingContent[] = [
        {
            type: 'link',
            url: `https://${urlText}`,
            children: [{ type: 'text', value: urlText }]
        }
    ];

    if (trailingText) {
        nodes.push({ type: 'text', value: trailingText });
    }

    return nodes;
}

function remarkAutoLinkBareDomains() {
    return (tree: Root) => {
        findAndReplace(
            tree,
            [BARE_DOMAIN_REGEX, (value: string) => createAutoLinkNodes(value)],
            {
                ignore: (node) => SKIPPED_NODE_TYPES.has(String(node.type))
            }
        );
    };
}

type NoticeMarkdownProps = {
    content: string;
};

export function NoticeMarkdown({ content }: NoticeMarkdownProps) {
    return (
        <ReactMarkdown remarkPlugins={markdownPlugins} components={markdownComponents}>
            {content}
        </ReactMarkdown>
    );
}
