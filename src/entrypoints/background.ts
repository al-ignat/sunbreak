export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    // TODO: Remove or gate behind debug flag before production
    console.log('Secure BYOAI installed');
  });
});
