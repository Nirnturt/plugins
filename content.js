window.contentScriptLoaded = true;
console.log("Content script loaded.");

if (!document.getElementById("contentScriptMarker")) {
  const style = document.createElement("style");
  style.innerHTML = `
  .custom-notification {
    position: fixed;
    left: 20px;
    top: 20px;
    background: #ffffff;
    color: black;
    padding: 15px;
    border-radius: 5px;
    opacity: 0;
    transition: opacity 0.5s;
    z-index: 9999; // 确保在页面的其他内容之上
  }
  .custom-notification.moved-down {
    top: 70px; // 调整为适当的下移距离
  }
  
`;
  document.head.appendChild(style);
  let marker = document.createElement("div");
  marker.id = "contentScriptMarker";
  marker.style.display = "none";
  document.body.appendChild(marker);

  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        const jobPage = document.querySelector("#jobPage");
        if (jobPage) {
          // Removed the saveButton related logic
        }
      }
    }
  });

  const config = { childList: true, subtree: true };
  observer.observe(document.body, config);

  function getDataFromPage() {
    const jobPage = document.getElementById("jobPage");
    let imageContainer,
      imageUrl = "",
      prompt,
      property,
      additionalText;

    // 尝试获取midjourney页面的元素
    imageContainer = jobPage.querySelector(
      ".relative.h-auto.w-full.false, .relative.h-auto.w-full.overflow-hidden"
    );

    // 如果未找到midjourney的元素，则尝试获取niji页面的元素
    if (!imageContainer) {
      imageContainer = jobPage.querySelector(
        ".relative.h-auto.w-full.false, .relative.h-auto.w-full.overflow-hidden"
      ); // 请根据niji页面的实际结构进行修改
    }

    const imageElements = imageContainer.querySelectorAll("img");

    for (const imageElement of imageElements) {
      const src = imageElement.src;
      if (
        src.startsWith("https://mj-gallery.com/") ||
        src.startsWith("https://cdn.midjourney.com/")
      ) {
        imageUrl = src.replace("_32_N.webp", ".png");
        break;
      }
    }

    prompt = jobPage.querySelector(".first-letter\\:capitalize").innerText;
    property = jobPage.querySelector(".line-clamp-1:not(.break-all)").innerText;
    const url = window.location.href;
    const additionalTextContainer = jobPage.querySelector(
      ".flex.w-full.flex-wrap-reverse.justify-between"
    );
    additionalText = additionalTextContainer.querySelector("p").innerText;

    return { imageUrl, prompt, property, url, additionalText };
  }

  function handleSaveToNotion(base64Image, sendResponse) {
    // Convert base64 image back to blob
    const byteCharacters = atob(base64Image.split(",")[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "image/png" });

    // Upload the blob to the API and get the external link
    chrome.storage.sync.get("apiurl", (result) => {
      const apiUrl = result.apiurl;
      if (!apiUrl) {
        showNotification("后端链接获取错误，请检查设置");
        sendResponse({ message: "后端链接获取错误" }); // 在此处发送响应
        return; // 停止代码运行
      }
      fetch(apiUrl, {
        method: "POST",
        body: blob,
      })
        .then((response) => response.json())
        .then((data) => {
          const externalImageUrl = JSON.parse(data.body).url;
          showNotification("图片已成功上传!");
          const { prompt, property, url, additionalText } = getDataFromPage();
          // Use the externalImageUrl and other data for the rest of the logic to save to Notion
          // ... (rest of the logic to save to Notion using the original code)
          chrome.runtime.sendMessage(
            {
              action: "saveToNotion",
              data: {
                imageUrl: externalImageUrl,
                prompt,
                property,
                url,
                additionalText,
              },
            },
            (response) => {
              console.log(response);
            }
          );
          sendResponse({ message: "Data saved successfully" }); // 在此处发送响应
        });
    });
  }
  function showNotification(message) {
    // 创建通知元素
    const notification = document.createElement("div");
    notification.className = "custom-notification";
    notification.innerText = message;

    // 将通知添加到页面
    document.body.appendChild(notification);

    // 使用CSS动画淡入通知
    notification.style.opacity = "1";

    // 在2秒后淡出并删除通知
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.addEventListener("transitionend", () => {
        notification.remove();
      });
    }, 2000);
  }
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "showNotification") {
      showNotification(request.message);
    }
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (
      ["saveToNotionFromContextMenu", "saveToNotion"].includes(request.action)
    ) {
      handleSaveToNotion(request.imageBlob, sendResponse);
      return true; // 返回true表示您将异步响应
    }
  });
}
