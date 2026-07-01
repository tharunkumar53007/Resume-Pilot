// Background Service Worker
console.log("[ResumeAI Extension] Background worker loaded.");

// Open options page on extension installation for onboarding
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.runtime.openOptionsPage();
  }
});

// Coordinate background API calls or message proxying if needed
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openOptions") {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
  }
  return true;
});
