const extensionId = chrome.runtime.id; // 动态获取当前扩展的ID

chrome.runtime.onInstalled.addListener(() => {
  // 创建右键菜单
  chrome.contextMenus.create({
    id: "saveToNotion",
    title: "Save to Notion",
    contexts: ["image"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "saveToNotion") {
    chrome.storage.sync.get(
      ["notionApiKey", "notionDatabaseId", "apiurl"],
      (result) => {
        if (
          !result.notionApiKey ||
          !result.notionDatabaseId ||
          !result.apiurl
        ) {
          console.error(
            "Missing Notion API key or Database ID in settings. Please fill them in before proceeding."
          );
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "showNotification",
              message:
                "Notion API Key 、Notion 页面 URL 或后端地址未填写，请在插件设置中填写",
            });
          });
          return;
        }
        fetch(info.srcUrl)
          .then((response) => response.blob())
          .then((blob) => {
            // Convert blob to a readable stream to send via chrome message
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = function () {
              const base64data = reader.result;
              chrome.tabs.sendMessage(tab.id, {
                action: "saveToNotionFromContextMenu",
                imageBlob: base64data,
              });
            };
          });
      }
    );
  }
});
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveToNotion") {
    const { imageUrl, prompt, property, url, additionalText } = request.data;
    saveToNotion(imageUrl, prompt, property, url, additionalText);
  }
});

async function saveToNotion(imageUrl, prompt, property, url, additionalText) {
  let apiKey, databaseId;

  // 获取 Notion API 密钥和数据库 ID
  await new Promise((resolve) => {
    chrome.storage.sync.get(
      ["notionApiKey", "notionDatabaseId", "apiurl"],
      (result) => {
        apiKey = result.notionApiKey;
        databaseId = result.notionDatabaseId;
        apiurl = result.apiurl;
        console.log("Notion API Key:", result.notionApiKey);
        console.log("Notion Database ID:", result.notionDatabaseId);
        resolve();
      }
    );
  });

  // 创建 Notion 页面并保存信息
  try {
    const requestBody = {
      parent: {
        database_id: databaseId,
      },
      properties: {
        WebLink: {
          title: [
            {
              text: {
                content: url,
              },
            },
          ],
        },
        Prompt: {
          rich_text: [
            {
              text: {
                content: prompt,
              },
            },
          ],
        },
        Property: {
          rich_text: [
            {
              text: {
                content: property,
              },
            },
          ],
        },
        UserName: {
          rich_text: [
            {
              text: {
                content: additionalText,
              },
            },
          ],
        },
        Image: {
          url: imageUrl,
        },
      },
    };

    console.log(
      "Sending request body to Notion:",
      JSON.stringify(requestBody, null, 2)
    );

    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
        Authorization: `Bearer ${apiKey}`,
        "Access-Control-Allow-Origin": `chrome-extension://${extensionId}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Error creating new page in Notion:", error);
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "showNotification",
          message: "创建Notion页面时出错，原因为：" + error,
        });
      });
      throw new Error(
        `Error creating new page in Notion. ${JSON.stringify(error)}`
      );
    } else {
      console.log("Created new page in Notion successfully!");
      const newPageResponse = await response.json();
      console.log("New page response from Notion:", newPageResponse);
      // ... 其余代码 ...
      const newPageId = newPageResponse.id; // 获取新页面的 ID

      const imageBlock = {
        object: "block",
        type: "image",
        image: {
          type: "external",
          external: {
            url: imageUrl,
          },
        },
      };

      try {
        const addChildResponse = await fetch(
          `https://api.notion.com/v1/blocks/${newPageId}/children`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "Notion-Version": "2022-06-28",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              children: [imageBlock],
            }),
          }
        );
        if (!addChildResponse.ok) {
          const error = await addChildResponse.json();
          console.error("Error appending child block to Notion page:", error);
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "showNotification",
              message: "添加Notion页面时出错，原因为：" + error,
            });
          });
          throw new Error(
            `Error appending child block to Notion page. ${JSON.stringify(
              error
            )}`
          );
        } else {
          console.log("Appended child block to Notion page successfully!");
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "showNotification",
              message: "成功添加Notion页面！",
            });
          });
        }
      } catch (error) {
        console.error("Error appending child block to Notion page:", error);
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "showNotification",
            message: "添加Notion页面时出错，原因为：" + error,
          });
        });
      }
    }
  } catch (error) {
    console.error("Error saving to Notion:", error);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "showNotification",
        message: "保存时出错，原因为：" + error,
      });
    });
  }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    const urlPatternMidJourney =
      /^https:\/\/www\.midjourney\.com\/app\/(jobs|feed)\//;
    const urlPatternNijiJourney =
      /^https:\/\/nijijourney\.com\/[a-z]{2}\/app\/(jobs|feed)\//;

    if (
      urlPatternMidJourney.test(changeInfo.url) ||
      urlPatternNijiJourney.test(changeInfo.url)
    ) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ["content.js"],
        });
        console.log("Content script injected.");
      } catch (error) {
        console.error("Error injecting content script:", error);
      }
    }
  }
});
