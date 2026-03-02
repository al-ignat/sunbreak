export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    console.log('Secure BYOAI installed');
  });
});
