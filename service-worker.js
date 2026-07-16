async function toggleOnTab(tab) {
  if (!tab?.id || !tab.url?.startsWith("https://www.youtube.com/")) return;

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "ANSI_TUBE_TOGGLE" });
  } catch (error) {
    console.warn("ANSI Tube could not reach this YouTube tab.", error);
  }
}

chrome.action.onClicked.addListener(toggleOnTab);

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-ansi") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await toggleOnTab(tab);
});
