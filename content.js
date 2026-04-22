if (!document.getElementById("problem-tracker-fab")) {
  const fab = document.createElement("div");
  fab.id = "problem-tracker-fab";
  fab.title = "Save this problem to Problem Tracker";
  fab.innerHTML = `
    <svg class="fab-icon icon-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
    <svg class="fab-icon icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 13l4 4L19 7"></path>
    </svg>
  `;

  document.body.appendChild(fab);

  const saveToast = document.createElement("div");
  saveToast.id = "problem-tracker-toast";
  document.body.appendChild(saveToast);

  const STORAGE_KEYS = ["myQuestions", "revisionList"];
  let syncVersion = 0;

  function hasChromeStorage() {
    return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
  }

  function getStoredCollections() {
    return new Promise((resolve) => {
      if (!hasChromeStorage()) {
        resolve({ myQuestions: [], revisionList: [] });
        return;
      }

      chrome.storage.local.get(STORAGE_KEYS, (stored) => {
        resolve({
          myQuestions: Array.isArray(stored.myQuestions) ? stored.myQuestions : [],
          revisionList: Array.isArray(stored.revisionList) ? stored.revisionList : []
        });
      });
    });
  }

  function setFabState(state, title) {
    fab.dataset.state = state;
    fab.title = title;
  }

  function normalizePath(path) {
    let next = path.replace(/\/{2,}/g, "/");
    if (!next.endsWith("/")) {
      next += "/";
    }
    return next;
  }

  function parseQuestionUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== "string") {
      return { normalizedUrl: "", matchKey: "" };
    }

    try {
      const parsed = new URL(rawUrl, window.location.origin);
      const host = parsed.hostname.toLowerCase();
      const parts = parsed.pathname.split("/").filter(Boolean);
      let normalizedPath = parsed.pathname;
      let keyPath = parsed.pathname;

      if (host.includes("leetcode.com")) {
        const idx = parts.indexOf("problems");
        if (idx >= 0 && parts[idx + 1]) {
          normalizedPath = `/problems/${parts[idx + 1]}/`;
          keyPath = normalizedPath;
        }
      } else if (host.includes("geeksforgeeks.org")) {
        const idx = parts.indexOf("problems");
        if (idx >= 0 && parts[idx + 1]) {
          const maybeVariant = parts[idx + 2] && /^\d+$/.test(parts[idx + 2]) ? parts[idx + 2] : null;
          normalizedPath = maybeVariant
            ? `/problems/${parts[idx + 1]}/${maybeVariant}/`
            : `/problems/${parts[idx + 1]}/`;
          keyPath = `/problems/${parts[idx + 1]}/`;
        }
      } else if (host.includes("hackerrank.com")) {
        const idx = parts.indexOf("challenges");
        if (idx >= 0 && parts[idx + 1]) {
          normalizedPath = `/challenges/${parts[idx + 1]}/`;
          keyPath = normalizedPath;
        }
      } else if (host.includes("codeforces.com")) {
        if (parts[0] === "problemset" && parts[1] === "problem" && parts[2] && parts[3]) {
          normalizedPath = `/problemset/problem/${parts[2]}/${parts[3]}/`;
          keyPath = normalizedPath;
        }
      } else if (host.includes("naukri.com")) {
        if (parts[0] === "code360" && parts[1] === "problems" && parts[2]) {
          normalizedPath = `/code360/problems/${parts[2]}/`;
          keyPath = normalizedPath;
        }
      }

      normalizedPath = normalizePath(normalizedPath);
      keyPath = normalizePath(keyPath);

      return {
        normalizedUrl: `${parsed.origin}${normalizedPath}`,
        matchKey: `${parsed.origin}${keyPath}`
      };
    } catch {
      const base = String(rawUrl).split(/[?#]/)[0].replace(/\/+$/, "");
      const fallback = base ? `${base}/` : "";
      return { normalizedUrl: fallback, matchKey: fallback };
    }
  }

  function normalizeQuestionUrl(rawUrl) {
    return parseQuestionUrl(rawUrl).normalizedUrl;
  }

  function getQuestionMatchKey(rawUrl) {
    return parseQuestionUrl(rawUrl).matchKey;
  }

  function isQuestionSaved(url, myQuestions, revisionList) {
    const targetKey = getQuestionMatchKey(url);
    if (!targetKey) return false;

    return myQuestions.some((q) => getQuestionMatchKey(q?.url) === targetKey) ||
      revisionList.some((q) => getQuestionMatchKey(q?.url) === targetKey);
  }

  async function syncFabStateForCurrentQuestion() {
    if (!hasChromeStorage()) return;
    if (fab.dataset.state === "loading") return;

    const url = window.location.href;
    const currentRun = ++syncVersion;
    const { myQuestions, revisionList } = await getStoredCollections();
    if (currentRun !== syncVersion) return;

    const saved = isQuestionSaved(url, myQuestions, revisionList);

    if (saved) {
      setFabState("exists", "Already saved in Problem Tracker");
    } else {
      setFabState("idle", "Save this problem to Problem Tracker");
    }
  }

  function showToast(message, type = "success", duration = 1700) {
    saveToast.textContent = message;
    saveToast.dataset.type = type;
    saveToast.classList.add("show");

    window.clearTimeout(showToast.timerId);
    showToast.timerId = window.setTimeout(() => {
      saveToast.classList.remove("show");
    }, duration);
  }

  function resetFabState(delay = 1400) {
    window.setTimeout(() => {
      syncFabStateForCurrentQuestion();
    }, delay);
  }

  function getSlugTitle(slug) {
    return slug
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function detectProblemName(url) {
    const leetcodeHeading = document.querySelector("div[data-track-load='description_content'] h1");
    if (leetcodeHeading?.textContent?.trim()) {
      return leetcodeHeading.textContent.trim();
    }

    const pathname = new URL(url).pathname;
    const match = pathname.match(/\/problems\/([^/]+)/);
    if (match && match[1]) {
      return getSlugTitle(match[1]);
    }

    return document.title?.replace(/\s*-\s*LeetCode.*$/i, "").trim() || url;
  }

  async function saveCurrentProblem() {
    if (!hasChromeStorage()) {
      setFabState("error", "Chrome storage unavailable for this page.");
      showToast("Storage unavailable", "error", 2000);
      resetFabState(1800);
      return;
    }

    const url = normalizeQuestionUrl(window.location.href);
    const name = detectProblemName(url);
    const { myQuestions, revisionList } = await getStoredCollections();

    const exists = isQuestionSaved(url, myQuestions, revisionList);
    if (exists) {
      setFabState("exists", "Already saved in Problem Tracker");
      showToast("Already saved", "exists", 1800);
      return;
    }

    const nextQuestion = {
      id: crypto.randomUUID(),
      url,
      name,
      status: false,
      revision: false
    };

    myQuestions.push(nextQuestion);

    chrome.storage.local.set({ myQuestions, revisionList }, () => {
      setFabState("exists", "Already saved in Problem Tracker");
      showToast("Saved to Problem Tracker", "success", 1800);
    });
  }

  async function removeCurrentProblem() {
    if (!hasChromeStorage()) {
      setFabState("error", "Chrome storage unavailable for this page.");
      showToast("Storage unavailable", "error", 2000);
      resetFabState(1800);
      return;
    }

    const targetKey = getQuestionMatchKey(window.location.href);
    const { myQuestions, revisionList } = await getStoredCollections();

    const nextQuestions = myQuestions.filter((q) => getQuestionMatchKey(q?.url) !== targetKey);
    const nextRevision = revisionList.filter((q) => getQuestionMatchKey(q?.url) !== targetKey);

    chrome.storage.local.set({ myQuestions: nextQuestions, revisionList: nextRevision }, () => {
      setFabState("idle", "Save this problem to Problem Tracker");
      showToast("Removed from Problem Tracker", "exists", 1800);
    });
  }

  fab.addEventListener("click", async () => {
    if (fab.dataset.state === "loading") return;

    const wasSaved = fab.dataset.state === "exists";

    setFabState("loading", wasSaved ? "Removing..." : "Saving...");

    try {
      if (wasSaved) {
        await removeCurrentProblem();
      } else {
        await saveCurrentProblem();
      }
    } catch {
      setFabState("error", "Unable to update this problem");
      showToast("Unable to update", "error", 2000);
      resetFabState(1800);
    }
  });

  syncFabStateForCurrentQuestion();

  if (hasChromeStorage()) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (!changes.myQuestions && !changes.revisionList) return;
      syncFabStateForCurrentQuestion();
    });
  }

  let lastUrl = window.location.href;
  window.setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      syncFabStateForCurrentQuestion();
    }
  }, 1000);
}
