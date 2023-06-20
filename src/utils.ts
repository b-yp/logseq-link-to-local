import { LSPluginUserEvents } from "@logseq/libs/dist/LSPlugin.user";
import React from "react";

import { ImageLink } from "./types";

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
  subscribeLogseqEvent("ui:visible:changed", ({ visible }) => {
    _visible = visible;
    onChange();
  });

export const useAppVisible = () => {
  return React.useSyncExternalStore(subscribeToUIVisible, () => _visible);
};


// 用于匹配 markdown 格式图片和你 直接链接图片， GPT4 给的匹配函数
export const findImageLinks = (text: string | undefined): ImageLink[] => {
  if (!text) return [];
  const markdownRegex = /!\[([^\]]*)\]\((https?:\/\/[^)]*)\)/gi;
  const urlRegex = /(https?:\/\/[^\s]*\.(png|jpg|jpeg|gif|bmp|webp|mp3|wav|ogg|mp4|mov|avi|wmv|flv|pdf))([^\s]*)/gi;
  const matches = [];
  let match;
  let index = 1
  const markdownUrls = [];

  while ((match = markdownRegex.exec(text)) !== null) {
    const fullName = match[2].split('/').pop()?.split('?')[0]
    const name = fullName?.split('.')[0] || `🤡_${index}_${Date.now()}`;
    // const type = fullName?.split('.')[1] || 'png';
    const url = match[2].split('?')[0];
    const originalUrl = match[2];
    const params = originalUrl.includes('?') ? originalUrl.split('?')[1] : undefined;
    const description = match[1];
    index += 1

    const getType = () => {
      if (!fullName?.split('.')[1]) {
        return 'png'
      }
      // 这里判断 awebp 主要是针对掘金图片做处理，掘金图片后缀是 awebp，需要替换成 webp
      if (fullName?.split('.')[1] === 'awebp') {
        return 'webp'
      }
      return fullName?.split('.')[1]
    }

    matches.push({
      mdImage: match[0],
      originalUrl,
      url,
      params,
      fullName,
      name,
      type: getType(),
      description
    });

    // 记录markdown中的URL，用于后续排除这些URL
    markdownUrls.push(originalUrl);
  }

  while ((match = urlRegex.exec(text)) !== null) {
    // 如果此URL已经在Markdown链接中，跳过
    if (markdownUrls.includes(match[0])) {
      continue;
    }

    const fullName = match[0].split('/').pop()?.split('?')[0];
    const name = fullName?.split('.')[0] || `🤡_${index}_${Date.now()}`;
    const type = fullName?.split('.')[1] || 'png';
    const url = match[1].split('?')[0];
    const originalUrl = match[0];
    const params = originalUrl.includes('?') ? originalUrl.split('?')[1] : undefined;
    index += 1

    matches.push({
      mdImage: null,
      originalUrl,
      url,
      params,
      fullName,
      name,
      type,
      description: ''
    });
  }

  return matches;
}
