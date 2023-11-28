import "@logseq/libs";
import {BlockEntity} from "@logseq/libs/dist/LSPlugin";

import React from "react";
import * as ReactDOM from "react-dom/client";

import App from "./App";
import {deepFirstTraversal, findEntities, generateFileName, renderItem} from "./utils";
import {logseq as PL} from "../package.json";

import "./index.css";

const pluginId = PL.id;

const saveBlockAssets = (currentBlock: BlockEntity) => {
    const storage = logseq.Assets.makeSandboxStorage();
    const links = findEntities(currentBlock.content);

    console.info(links)

    const filesMapping: { [link: string]: string; } = {};

    links.forEach((link) => {
        if (link.url in filesMapping) {
            return;
        }

        filesMapping[link.url] = generateFileName(link, Object.keys(filesMapping).length);
    })

    const saveFile = (item: string, index: number) => {
        return new Promise((resolve, reject) => {
            console.log("Loading...", item)
            fetch(item)
                .then((res: any) => {
                    if (res.status !== 200) {
                        logseq.UI.showMsg(
                            `Link: ${item}.\n The request failed, please check the link or remove the link parameters (question mark and subsequent parts) and try again`,
                            "error"
                        );
                        return reject(res);
                    }
                    return res.arrayBuffer();
                })
                .then((res) => {
                    storage
                        .setItem(
                            filesMapping[item],
                            res
                        )
                        .then((one) => {
                            logseq.UI.showMsg(`Write DONE 🎉 - ${one}`, "success");
                            resolve((one as unknown as string).match(/\/assets\/(.*)/gi));
                        });
                })
                .catch((error) => {
                    logseq.UI.showMsg(
                        Object.keys(error).length !== 0
                            ? JSON.stringify(error.message || error)
                            : "Request failed",
                        "error"
                    );
                    reject(error);
                });
        });
    };

    const filesKeys = Object.keys(filesMapping);
    Promise.all(
        filesKeys.map((item, index) => {
            return saveFile(item, index);
        })
    )
        .then((paths) => {
            let currentContent = currentBlock?.content;
            paths.forEach((path, index) => {
                filesMapping[filesKeys[index]] = '..' + (path as string)
            });
            console.log(filesMapping);
            links.forEach((item) => {
                currentContent = currentContent.replace(item.fullMatch, renderItem(item, filesMapping[item.url]))
            });
            logseq.Editor.updateBlock(currentBlock?.uuid, currentContent);
        })
        .catch((error) => {
            logseq.UI.showMsg(
                JSON.stringify(
                    Object.keys(error).length !== 0 ? error.message || error : "Request failed"
                ),
                "error"
            );
        });
};

function main() {
    console.info(`#${pluginId}: MAIN`);

    const root = ReactDOM.createRoot(document.getElementById("app")!);

    root.render(
        <React.StrictMode>
            <App/>
        </React.StrictMode>
    );

    logseq.App.registerPageMenuItem(
        "Save all link assets to local",
        async (e) => {
            const pageBlocksTree = await logseq.Editor.getPageBlocksTree(e.page);

            // 深度优先遍历执行保存方法
            deepFirstTraversal(pageBlocksTree, saveBlockAssets);
        }
    );

    logseq.Editor.registerBlockContextMenuItem(
        "Save link assets to local",
        async ({uuid}) => {
            if (!uuid) return;
            const currentBlock = await logseq.Editor.getBlock(uuid);
            if (currentBlock === null) return;
            saveBlockAssets(currentBlock);
        }
    );

    logseq.Editor.registerSlashCommand("Save link assets to local", async () => {
        const currentBlock = await logseq.Editor.getCurrentBlock();
        if (currentBlock === null) return;
        saveBlockAssets(currentBlock);
    });
}

logseq.ready(main).catch(console.error);
