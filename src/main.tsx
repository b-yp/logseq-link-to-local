import "@logseq/libs";

import React from "react";
import * as ReactDOM from "react-dom/client";

import App from "./App";
import { logseq as PL } from "../package.json";

import "./index.css";

const pluginId = PL.id;

function main() {
  console.info(`#${pluginId}: MAIN`);

  const root = ReactDOM.createRoot(document.getElementById("app")!);

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  logseq.Editor.registerSlashCommand('/link to local', async () => {
    const storage = logseq.Assets.makeSandboxStorage()
    const currentBlock = await logseq.Editor.getCurrentBlock()
    const originalImages = currentBlock?.content.match(/!\[.*?\]\(https?(.*?)\.(?:png|jpg|jpeg|gif|bmp|mp3|wav|ogg|mp4|mov|avi|wmv|flv|pdf)\)/ig)

    if (!originalImages || originalImages.length === 0) {
      return
    }

    const originalUrls = originalImages.map(i => i.match(/https?(.*?)\.(png|jpg|jpeg|gif|bmp|mp3|wav|ogg|mp4|mov|avi|wmv|flv|pdf)/ig)?.[0])
    // const originalDescription = originalImages.map(i => (/!\[(.*?)\]/ig).exec(i)?.[1])
    const originalNames = originalImages.map(i => (/([^/]+)\.(png|jpg|jpeg|gif|bmp|mp3|wav|ogg|mp4|mov|avi|wmv|flv|pdf)/ig).exec(i)?.[0])
    const localPaths: string[] = []

    const saveImages = (item: string, index: number) => {
      return new Promise((resolve, reject) => {
        fetch(item)
          .then(res => res.arrayBuffer())
          .then(res => {
            storage.setItem(decodeURIComponent(originalNames[index] || '🤡'), res as unknown as string).then(one => {
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
      originalUrls.map((item, index) => saveImages(item as string, index))
    ).then(paths => {
      paths.forEach(path => localPaths.push(`..${(path as string)[0]}`))

      let currentContent = currentBlock?.content
      originalUrls.forEach((item, index) => {
        currentContent = currentContent?.replace(item as string, localPaths[index])
      })

      logseq.Editor.updateBlock(currentBlock?.uuid as string, currentContent || '🤡')
    }).catch(error => {
      logseq.UI.showMsg(JSON.stringify(Object.keys(error).length !== 0 ? (error.message || error) : '请求失败'), 'error')
    })
  })
}

logseq.ready(main).catch(console.error);
