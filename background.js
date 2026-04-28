const STORAGE_KEYS = ['myQuestions', 'revisionList'];
const SUBSCRIBERS_KEY = 'dashboardSubscribers';

function normalizeCollections(stored) {
    return {
        myQuestions: Array.isArray(stored && stored.myQuestions) ? stored.myQuestions : [],
        revisionList: Array.isArray(stored && stored.revisionList) ? stored.revisionList : []
    };
}

function isValidExtensionId(value) {
    return typeof value === 'string' && /^[a-p]{32}$/.test(value);
}

function getSubscribers(callback) {
    chrome.storage.local.get([SUBSCRIBERS_KEY], (stored) => {
        if (chrome.runtime && chrome.runtime.lastError) {
            callback([]);
            return;
        }

        const list = Array.isArray(stored && stored[SUBSCRIBERS_KEY]) ? stored[SUBSCRIBERS_KEY] : [];
        const valid = list.filter((id) => isValidExtensionId(id));
        callback(valid);
    });
}

function setSubscribers(ids, callback) {
    const unique = [];

    ids.forEach((id) => {
        if (!isValidExtensionId(id)) return;
        if (unique.indexOf(id) !== -1) return;
        unique.push(id);
    });

    chrome.storage.local.set({ [SUBSCRIBERS_KEY]: unique }, () => {
        if (typeof callback === 'function') callback();
    });
}

function addSubscriber(extensionId, callback) {
    getSubscribers((subscribers) => {
        if (subscribers.indexOf(extensionId) === -1) {
            subscribers.push(extensionId);
        }

        setSubscribers(subscribers, callback);
    });
}

function removeSubscriber(extensionId, callback) {
    getSubscribers((subscribers) => {
        const next = subscribers.filter((id) => id !== extensionId);
        setSubscribers(next, callback);
    });
}

function getCollections(callback) {
    chrome.storage.local.get(STORAGE_KEYS, (stored) => {
        if (chrome.runtime && chrome.runtime.lastError) {
            callback({ myQuestions: [], revisionList: [] });
            return;
        }

        callback(normalizeCollections(stored || {}));
    });
}

function respondWithCollections(sendResponse) {
    getCollections((data) => {
        sendResponse({ ok: true, myQuestions: data.myQuestions, revisionList: data.revisionList });
    });
}

function notifySubscribers(data) {
    getSubscribers((subscribers) => {
        if (!subscribers.length) return;

        const alive = [];
        let pending = subscribers.length;

        function complete() {
            pending -= 1;
            if (pending === 0) {
                setSubscribers(alive);
            }
        }

        subscribers.forEach((extensionId) => {
            if (!isValidExtensionId(extensionId) || extensionId === chrome.runtime.id) {
                complete();
                return;
            }

            chrome.runtime.sendMessage(extensionId, {
                type: 'PT_COLLECTIONS_UPDATED',
                myQuestions: data.myQuestions,
                revisionList: data.revisionList
            }, () => {
                const hasError = !!(chrome.runtime && chrome.runtime.lastError);
                if (!hasError) {
                    alive.push(extensionId);
                }
                complete();
            });
        });
    });
}

function handleMessage(message, sender, sendResponse) {
    if (!message || !message.type) return false;

    if (message.type === 'PT_GET_COLLECTIONS') {
        respondWithCollections(sendResponse);
        return true;
    }

    if (message.type === 'PT_REGISTER_DASHBOARD') {
        const dashboardId = isValidExtensionId(message.dashboardId) ? message.dashboardId : sender.id;

        if (!isValidExtensionId(dashboardId)) {
            sendResponse({ ok: false, error: 'Invalid dashboard id' });
            return false;
        }

        addSubscriber(dashboardId, () => {
            sendResponse({ ok: true });
        });
        return true;
    }

    if (message.type === 'PT_UNREGISTER_DASHBOARD') {
        const dashboardId = isValidExtensionId(message.dashboardId) ? message.dashboardId : sender.id;

        if (!isValidExtensionId(dashboardId)) {
            sendResponse({ ok: false, error: 'Invalid dashboard id' });
            return false;
        }

        removeSubscriber(dashboardId, () => {
            sendResponse({ ok: true });
        });
        return true;
    }

    return false;
}

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
    return handleMessage(message, sender, sendResponse);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    return handleMessage(message, sender, sendResponse);
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (!changes.myQuestions && !changes.revisionList) return;

    getCollections((data) => {
        notifySubscribers(data);
    });
});
