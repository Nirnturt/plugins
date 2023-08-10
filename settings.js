document.addEventListener("DOMContentLoaded", () => {
  const settingsForm = document.getElementById("settingsForm");
  const notionApiKeyInput = document.getElementById("notionApiKey");
  const notionPageLinkInput = document.getElementById("notionPageLink");
  const apiurlInput = document.getElementById("apiurl");

  // Load saved settings
  chrome.storage.sync.get(
    ["notionApiKey", "notionPageLink", "apiurl"],
    (result) => {
      notionApiKeyInput.value = result.notionApiKey || "";
      notionPageLinkInput.value = result.notionPageLink || "";
      apiurlInput.value = result.apiurl || "";
    }
  );

  // Save settings
  settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const notionPageLink = notionPageLinkInput.value;
    const notionDatabaseId = extractDatabaseIdFromPageLink(notionPageLink);
    const apiurl = apiurlInput.value;

    chrome.storage.sync.set(
      {
        notionApiKey: notionApiKeyInput.value,
        notionDatabaseId: notionDatabaseId,
        notionPageLink: notionPageLink,
        apiurl: apiurl,
      },
      () => {
        alert("保存成功 Settings saved!");
      }
    );
  });
});

function extractDatabaseIdFromPageLink(pageLink) {
  const regex = /([a-f0-9]{32})/;
  const match = pageLink.match(regex);

  if (match) {
    return match[0];
  }
  return "";
}
