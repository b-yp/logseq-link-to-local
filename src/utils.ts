import {BlockEntity, LSPluginUserEvents} from "@logseq/libs/dist/LSPlugin.user";
import React from "react";

import {FileLink} from "./types";

let _visible = logseq.isMainUIVisible;

function subscribeLogseqEvent<T extends LSPluginUserEvents>(
    eventName: T,
    handler: (...args: any) => void
) {
    logseq.on(eventName, handler);
    return () => {
        logseq.off(eventName, handler);
    };
}

const subscribeToUIVisible = (onChange: () => void) =>
    subscribeLogseqEvent("ui:visible:changed", ({visible}) => {
        _visible = visible;
        onChange();
    });

export const useAppVisible = () => {
    return React.useSyncExternalStore(subscribeToUIVisible, () => _visible);
}

function getExtension(extension?: string): string {
    if (!extension) {
        return 'png'
    }
    if (extension === 'awebp') {
        return 'webp'
    }
    return extension
}

function findMarkdownLinks(markdown: string): FileLink[] {
    const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const matches = markdown.matchAll(regex);
    const links: FileLink[] = [];

    for (const match of matches) {
        const description = match[1];
        const link = match[2];
        const fileNameSplit = link.split('/');
        const fileName = fileNameSplit[fileNameSplit.length - 1];
        const fileTypeSplit = fileName.split('.');
        let extension = fileTypeSplit.length > 1 ? fileTypeSplit[fileTypeSplit.length - 1] : undefined;
        if (extension?.includes('?')) {
            extension = extension?.split('?')[0]
        }

        links.push({
            description: description,
            url: link,
            name: fileName,
            extension: getExtension(extension),
            fullMatch: match[0],
            embed: false,
        });
    }
    return links;
}


function findMarkdownImages(input: string): FileLink[] {
    const regex = /!\[([^\]]+)\]\(([^)]+)\)/g;
    const mediaExtensions =
        /(png|jpg|jpeg|gif|bmp|webp|mp3|wav|ogg|mp4|mov|avi|wmv|flv|pdf)/;
    const fileLinks: FileLink[] = [];

    let match = regex.exec(input);

    console.log(match)

    while (match) {
        const description = match[1].trim();
        const url = match[2].trim();
        const parts = url.split('.');
        const extMatch = parts[parts.length - 1].match(mediaExtensions);

        if (extMatch) {
            const extension = extMatch[0];
            const name = url.split('/').pop() || '';

            fileLinks.push({
                description,
                url,
                name,
                extension,
                fullMatch: match[0],
                embed: true,
            });
        }

        match = regex.exec(input);
    }

    return fileLinks;

}

export function findEntities(text: string): FileLink[] {
    if (!text) return [];

    const markdownLinks = findMarkdownLinks(text);
    const mediaLinks = findMarkdownImages(text);

    return mediaLinks.concat(markdownLinks).filter((value) => {
        return value.url.indexOf('https://') == 0 || value.url.indexOf('http://') == 0
    });
}

export function generateFileName(link: FileLink, index: number): string {
    return decodeURIComponent(`${link.name}_${Date.now()}_${index}.${link.extension}`);
}

export function renderItem(link: FileLink, localPath: string): string {
    if (link.embed) {
        return `![${link.description ?? ''}](${localPath})`
    } else {
        return `[${link.description ?? link.name}](${localPath})`
    }
}

export function deepFirstTraversal(arr: BlockEntity[], fn: (block: BlockEntity) => void) {
    arr.forEach(obj => {
        if (obj) {
            fn(obj)
        }
        if (obj.children && obj.children.length > 0) {
            deepFirstTraversal(obj.children as BlockEntity[], fn);
        }
    });
}