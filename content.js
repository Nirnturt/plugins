window.contentScriptLoaded = true;
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
          // Removed the saveButton related logic
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

  function handleSaveToNotion(base64Image) {
    // Convert base64 image back to blob
    const byteCharacters = atob(base64Image.split(",")[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "image/png" });

    // Upload the blob to the API and get the external link
    fetch("https://api.nirn.design/release/img_Update", {
      method: "POST",
      body: blob,
    })
      .then((response) => response.json())
      .then((data) => {
        const externalImageUrl = data.url; // Assuming the API returns the link with key 'link'
        alert(data);
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
      });
  }
  //   function handleSaveToNotion(base64Image) {
  //   // Convert base64 image back to blob
  //   const byteCharacters = atob(base64Image.split(',')[1]);
  //   const byteNumbers = new Array(byteCharacters.length);
  //   for (let i = 0; i < byteCharacters.length; i++) {
  //     byteNumbers[i] = byteCharacters.charCodeAt(i);
  //   }
  //   const byteArray = new Uint8Array(byteNumbers);
  //   const blob = new Blob([byteArray], {type: 'image/png'});

  //   // Log blob details for testing
  //   console.log("Blob details:", blob);

  //   // Convert blob back to an image and open in a new tab
  //   const imageUrl = URL.createObjectURL(blob);
  //   const img = new Image();
  //   img.src = imageUrl;
  //   img.onload = function() {
  //     const win = window.open("");
  //     win.document.write("<img src='" + imageUrl + "' />");
  //   };
  // }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (
      ["saveToNotionFromContextMenu", "saveToNotion"].includes(request.action)
    ) {
      handleSaveToNotion(request.imageBlob);
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
