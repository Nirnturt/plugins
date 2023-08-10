console.log("Content script loaded.");
if (!document.getElementById("contentScriptMarker")) {
  let marker = document.createElement("div");
  marker.id = "contentScriptMarker";
  marker.style.display = "none";
  document.body.appendChild(marker);

  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        const jobPage = document.querySelector("#jobPage");
        if (jobPage) {
          const saveButton = document.querySelector("#saveButton");
          if (saveButton) {
            saveButton.removeEventListener("click", handleSaveToNotion);
            saveButton.addEventListener("click", handleSaveToNotion);
          }
        }
      }
    }
  });

  const config = { childList: true, subtree: true };

  observer.observe(document.body, config);

  function getDataFromPage() {
    const jobPage = document.getElementById("jobPage");
    const imageContainer = jobPage.querySelector(
      ".relative.h-auto.w-full.false, .relative.h-auto.w-full.overflow-hidden"
    );
    const imageElements = imageContainer.querySelectorAll("img");
    let imageUrl = "";

    for (const imageElement of imageElements) {
      const src = imageElement.src;
      if (
        src.startsWith("https://cdn.midjourney.com/") ||
        src.startsWith("https://mj-gallery.com/")
      ) {
        imageUrl = src.replace("_32_N.webp", ".png");
        break;
      }
    }

    const prompt = jobPage.querySelector(
      ".first-letter\\:capitalize"
    ).innerText;
    const property = jobPage.querySelector(
      ".line-clamp-1:not(.break-all)"
    ).innerText;
    const url = window.location.href;
    const additionalTextContainer = jobPage.querySelector(
      ".flex.w-full.flex-wrap-reverse.justify-between"
    );
    const additionalText = additionalTextContainer.querySelector("p").innerText;

    return { imageUrl, prompt, property, url, additionalText };
  }

  function handleSaveToNotion() {
    const { imageUrl, prompt, property, url, additionalText } =
      getDataFromPage();
    chrome.runtime.sendMessage(
      {
        action: "saveToNotion",
        data: { imageUrl, prompt, property, url, additionalText },
      },
      (response) => {
        console.log(response);
      }
    );
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (
      ["saveToNotionFromContextMenu", "saveToNotion"].includes(request.action)
    ) {
      handleSaveToNotion();
      sendResponse({
        message: `Data saved successfully from ${
          request.action === "saveToNotionFromContextMenu"
            ? "context menu"
            : "popup"
        }`,
      });
    }
    return true;
  });
}
