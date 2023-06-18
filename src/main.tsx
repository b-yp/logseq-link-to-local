import "@logseq/libs";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin";

import React from "react";
import * as ReactDOM from "react-dom/client";

import App from "./App";
import { logseq as PL } from "../package.json";

import "./index.css";

const pluginId = PL.id;

const saveBlockAssets = (currentBlock: BlockEntity) => {
    const storage = logseq.Assets.makeSandboxStorage()
    const options: {
      image: string | null
      url: string | undefined
      fullName: string | undefined
      name: string
      type: string
      description: string
    }[] = []

    // 使用正则匹配出 markdown 格式图片和网络链接图片
    const markdownImages = currentBlock?.content.match(/!\[.*?\]\(https?(.*?)\.(?:png|jpg|jpeg|gif|bmp|webp|mp3|wav|ogg|mp4|mov|avi|wmv|flv|pdf)?(.*?)\)/ig)
    const linkImages = currentBlock?.content.match(/https?:\/\/(.+\/)+.+(\.(?:png|jpg|jpeg|gif|bmp|webp|mp3|wav|ogg|mp4|mov|avi|wmv|flv|pdf))(?:\?[^?\s#]*)?(?:#[^\s]*)?/ig)

    if (markdownImages && markdownImages.length > 0) {
      markdownImages.forEach(i => {
        const url = (/\((.*?)\)/ig).exec(i)?.[1]
        const res = url ? (/([^/]+)\.(png|jpg|jpeg|gif|bmp|webp|mp3|wav|ogg|mp4|mov|avi|wmv|flv|pdf)/ig).exec(url) || [] : []
        options.push({
          image: i,
          url,
          fullName: res[0],
          name: res[1] || '🤡',
          type: res[2] || 'png',
          description: (/!\[(.*?)\]/ig).exec(i)?.[1] || res[1] || '🤡'
        })
      })
    }

    if (linkImages && linkImages.length > 0) {
      linkImages.forEach(url => {
        const res = url ? (/([^/]+)\.(png|jpg|jpeg|gif|bmp|webp|mp3|wav|ogg|mp4|mov|avi|wmv|flv|pdf)/ig).exec(url) || [] : []
        options.push({
          image: null,
          url,
          fullName: res[0],
          name: res[1] || '🤡',
          type: res[2] || 'png',
          description: res[1] || '🤡'
        })
      })
    }

    const localPaths: string[] = []

    const saveImages = (item: string, index: number) => {
      return new Promise((resolve, reject) => {
        fetch(item)
          .then(res => res.arrayBuffer())
          .then(res => {
            storage.setItem(decodeURIComponent(`${options[index].name}.${options[index].type}`), res as any).then(one => {
              logseq.UI.showMsg(`Write DONE 🎉 - ${one}`, 'success')
              resolve((one as unknown as string).match(/\/assets\/(.*)/ig))
            })
          })
          .catch(error => {
            logseq.UI.showMsg(JSON.stringify(Object.keys(error).length !== 0 ? (error.message || error) : '请求失败'), 'error')
            reject(error)
          })
      })
    }

    Promise.all(
      options.map((item, index) => saveImages((item.url) as string, index))
    ).then(paths => {
      paths.forEach(path => localPaths.push(`..${(path as string)[0]}`))

      let currentContent = currentBlock?.content
      options.forEach((item, index) => {
        /**
         * 这种分两种情况
         * 1: markdown 格式图片
         * 2: 网络链接图片
         * 通过 image 是否为 null 判断
         */
        currentContent = item.image ?
          currentContent?.replace((item.url) as string, localPaths[index]) :
          currentContent?.replace((item.url) as string, `![${options[index].name}](${localPaths[index]})`)
      })

      logseq.Editor.updateBlock(currentBlock?.uuid as string, currentContent || '🤡')
    }).catch(error => {
      logseq.UI.showMsg(JSON.stringify(Object.keys(error).length !== 0 ? (error.message || error) : '请求失败'), 'error')
    })
};


function main() {
  console.info(`#${pluginId}: MAIN`);

  const root = ReactDOM.createRoot(document.getElementById("app")!);

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  logseq.App.registerPageMenuItem('Save all link assets to local', async (e) => {
    const pageBlocksTree = await logseq.Editor.getPageBlocksTree(e.page)
    pageBlocksTree.forEach(block => {
      if (!block) return
      saveBlockAssets(block)
    })
  })

  logseq.Editor.registerBlockContextMenuItem('Save link assets to local', async () => {
    const currentBlock = await logseq.Editor.geCurrentBlock()
    if (currentBlock === null) return
    saveBlockAssets(currentBlock)
  })

  logseq.Editor.registerSlashCommand('Save link assets to local', async () => {
    const currentBlock = await logseq.Editor.getCurrentBlock()
    if (currentBlock === null) return
    saveBlockAssets(currentBlock)
  })
}

logseq.ready(main).catch(console.error);
