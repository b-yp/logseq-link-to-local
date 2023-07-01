import "@logseq/libs";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin";

import React from "react";
import * as ReactDOM from "react-dom/client";

import App from "./App";
import { deepFirstTraversal, findImageLinks } from "./utils";
import { logseq as PL } from "../package.json";

import "./index.css";

const pluginId = PL.id;

const saveBlockAssets = (currentBlock: BlockEntity) => {
  const storage = logseq.Assets.makeSandboxStorage()
  // 传递 block ID 用于保证名称的唯一性
  const options = findImageLinks(currentBlock.content, currentBlock.id)
  const localPaths: string[] = []

  const saveImages = (item: string, index: number) => {
    return new Promise((resolve, reject) => {
      fetch(item)
        .then((res: any) => {
          if (res.status !== 200) {
            logseq.UI.showMsg(`链接: ${item} 请求失败，请检查链接或者去掉链接参数（问号及后面的部分）试试`, 'error')
            return reject(res)
          }
          return res.arrayBuffer()
        })
        .then(res => {
          storage.setItem(decodeURIComponent(`${options[index].name}.${options[index].type}`), res as any).then(one => {
            logseq.UI.showMsg(`Write DONE 🎉 - ${one}`, 'success')
            resolve((one as unknown as string).match(/\/assets\/(.*)/ig))
          })
        })
        .catch(error => {
          logseq.UI.showMsg(Object.keys(error).length !== 0 ? JSON.stringify((error.message || error)) : '请求失败', 'error')
          reject(error)
        })
    })
  }

  Promise.all(
    options.map((item, index) => {
      /**
       * wps 便签图片带参请求会报错，所以针对 wps 便签图片单独处理，使用无参 url
       * wps 便签图片使用 s3 对象存储， 前缀为 "moffice-note"
       */
      const url = item.url?.includes('moffice-note') ? item.url : item.originalUrl
      return saveImages((url) as string, index)
    })
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
      currentContent = item.mdImage ?
        currentContent?.replace((item.originalUrl) as string, localPaths[index]) :
        currentContent?.replace((item.originalUrl) as string, `![${options[index].name}](${localPaths[index]})`)
    })

    logseq.Editor.updateBlock(currentBlock?.uuid as string, currentContent || '(Error, No content 🤷 !)')
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

    // 深度优先遍历执行保存方法
    deepFirstTraversal(pageBlocksTree, saveBlockAssets)
  })

  logseq.Editor.registerBlockContextMenuItem('Save link assets to local', async ({ uuid }) => {
    if (!uuid) return
    const currentBlock = await logseq.Editor.getBlock(uuid)
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
