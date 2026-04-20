let myQuestions = [];
let revisionList = [];
let set = new Set();
let revSet = new Set();

const STORAGE_KEYS = ["myQuestions", "revisionList"];

const inputEl = document.getElementById("input-el");
const inputBtn = document.getElementById("input-btn");
const ulEl = document.querySelector("#ul-el");
const deleteBtn = document.querySelector("#delete-btn");
const tabBtn = document.querySelector("#tab-btn");
const heading = document.querySelector("#heading");
const quesNameEl = document.querySelector("#name");
const revisionUlEl = document.querySelector("#revision-ul-el");
const revHeading = document.querySelector("#rev-heading");

function safeParseArray(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hasChromeStorage() {
  return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
}

function persistCollections() {
  localStorage.setItem("myQuestions", JSON.stringify(myQuestions));
  localStorage.setItem("revisionList", JSON.stringify(revisionList));

  if (hasChromeStorage()) {
    chrome.storage.local.set({ myQuestions, revisionList });
  }
}

function rebuildUrlSets() {
  set.clear();
  revSet.clear();

  myQuestions.forEach((q) => {
    if (q?.url) set.add(q.url);
  });

  revisionList.forEach((q) => {
    if (q?.url) revSet.add(q.url);
  });
}

function initializeCollections(callback) {
  const fallbackQuestions = safeParseArray(localStorage.getItem("myQuestions"));
  const fallbackRevision = safeParseArray(localStorage.getItem("revisionList"));

  if (!hasChromeStorage()) {
    myQuestions = fallbackQuestions;
    revisionList = fallbackRevision;
    rebuildUrlSets();
    callback();
    return;
  }

  chrome.storage.local.get(STORAGE_KEYS, (stored) => {
    const storedQuestions = Array.isArray(stored.myQuestions) ? stored.myQuestions : null;
    const storedRevision = Array.isArray(stored.revisionList) ? stored.revisionList : null;

    myQuestions = storedQuestions ?? fallbackQuestions;
    revisionList = storedRevision ?? fallbackRevision;

    rebuildUrlSets();
    persistCollections();
    callback();
  });
}

inputBtn.addEventListener("click", function () {
  if (inputEl.value === "") {
    showToast("⚠️ Please enter a URL!");
    return;
  }

  if (set.has(inputEl.value) || revSet.has(inputEl.value)) {
    showToast("⚠️ This question already exists!");
    return;
  }

  myQuestions.push({
    id: crypto.randomUUID(),
    url: inputEl.value,
    name: quesNameEl.value,
    status: false,
    revision: false
  });

  set.add(inputEl.value);

  clearInputs();
  persistCollections();
  showQuestion();
  refreshHeading();
});

quesNameEl.addEventListener("input", () => {
  localStorage.setItem("quesNameInput", quesNameEl.value);
});

deleteBtn.addEventListener("click", () => {
  const items = ulEl.querySelectorAll("li");
  const revItems = revisionUlEl.querySelectorAll("li");

  if (items.length === 0 && revItems.length === 0) return;
  if (items.length != 0) {
    set.clear();

    items.forEach((li, index) => {
      setTimeout(() => {
        li.classList.add("deleting");
      }, index * 50); // stagger animation
    });
  }
  if (revItems.length !== 0) {
    revSet.clear();

    revItems.forEach((li, index) => {
      setTimeout(() => {
        li.classList.add("deleting");
      }, index * 50); // stagger animation
    });
  }

  setTimeout(() => {
    myQuestions = [];
    persistCollections();
    ulEl.innerHTML = "";
    refreshHeading();
  }, items.length * 50 + 300);

  setTimeout(() => {
    revisionList = [];
    persistCollections();
    revisionUlEl.innerHTML = "";
    refreshHeading();
  }, revItems.length * 50 + 300)

});

tabBtn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    let tab = tabs[0].url;
    let quesName = quesNameEl.value ? quesNameEl.value : findQuesName(tab);

    if (set.has(tab) || revSet.has(tab)) {
      showToast("⚠️ This question already exists!");
      return;
    }

    set.add(tab);


    clearInputs();

    myQuestions.push({
      id: crypto.randomUUID(),
      url: tab,
      name: quesName,
      status: false,
      revision: false
    });

    persistCollections();
    showQuestion();
    refreshHeading();
  });
});

document.addEventListener("DOMContentLoaded", () => {
  quesNameEl.value = localStorage.getItem("quesNameInput") || "";

  initializeCollections(() => {
    renderQuestions();
    renderRevisions();
    refreshHeading();
  });

  if (hasChromeStorage()) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (!changes.myQuestions && !changes.revisionList) return;

      myQuestions = Array.isArray(changes.myQuestions?.newValue) ? changes.myQuestions.newValue : myQuestions;
      revisionList = Array.isArray(changes.revisionList?.newValue) ? changes.revisionList.newValue : revisionList;

      rebuildUrlSets();
      renderQuestions();
      renderRevisions();
      refreshHeading();
    });
  }
});


/* =============== SINGLE REUSABLE FUNCTION =============== */

function createQuestionElement(question) {
  const li = document.createElement("li");

  const del = document.createElement("button");
  del.type = "button";
  del.classList.add("del-btn");
  del.innerHTML = "<img src='del.svg' class='del-svg'>";
  del.addEventListener("click", () => deleteQuestion(question, li));

  // creating star element for revision button
  const starLabel = document.createElement("label");
  starLabel.classList.add("star-checkbox");
  starLabel.style.display = "none";

  const star = document.createElement("input");
  star.type = "checkbox";
  star.classList.add("star-box")

  const starSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  starSvg.classList.add("star-svg");
  starSvg.setAttribute("viewBox", "0 0 24 24");

  const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  polygon.setAttribute(
    "points",
    "12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9"
  );

  starSvg.appendChild(polygon);
  starLabel.append(star, starSvg);

  star.addEventListener("change", () => { addToRevision(question, star, li) });

  if (question.revision) {
    starLabel.style.display = "inline-flex";
    star.checked = true;
  }

  const label = document.createElement("label");
  label.classList.add("checkbox");

  const input = document.createElement("input");
  input.type = "checkbox";

  const customBox = document.createElement("span");
  customBox.classList.add("custom-box");

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.classList.add("check-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M5 13l4 4L19 7");

  svg.appendChild(path);
  customBox.appendChild(svg);


  const link = document.createElement("a");
  link.href = question.url;
  link.target = "_blank";
  link.textContent = getQuestionName(question);
  link.addEventListener("click", e => e.stopPropagation()); // to prevent checkbox checking when link is clicked

  // Tooltip for full URL
  const tooltip = document.createElement("span");
  tooltip.classList.add("tooltip");
  tooltip.textContent = question.url;

  // tooltip for mark as done

  const donetooltip = document.createElement("span");
  donetooltip.classList.add("done-tooltip");
  if (question.status) donetooltip.innerText = "Mark as incomplete";
  else donetooltip.innerText = "Mark as completed";

  //wrapper for checkbox with done tooltip
  const checkboxWrapper = document.createElement("span");
  checkboxWrapper.classList.add("done-wrapper");
  checkboxWrapper.append(input, customBox, donetooltip);

  //wrapper for link
  const donewrapper = document.createElement("span");
  donewrapper.classList.add("link-text-wrapper");
  donewrapper.append(link);

  // Wrap link and tooltip
  const linkWrapper = document.createElement("span");
  linkWrapper.classList.add("link-wrapper");
  linkWrapper.append(link, tooltip);

  //tool tip for revision
  const revtooltip = document.createElement("span");
  revtooltip.classList.add("rev-tooltip");
  if (question.revision) revtooltip.textContent = "Remove from revision";
  else revtooltip.textContent = "Mark for revision";

  //wrap link and tool tip for revision tooltip
  const revlinkwrapper = document.createElement("span");
  revlinkwrapper.classList.add("rev-wrapper");
  revlinkwrapper.append(revtooltip, starLabel);

  //tooltip for delete button
  const deltooltip = document.createElement("span");
  deltooltip.classList.add("del-tooltip");
  deltooltip.textContent = "Delete";

  // wrapper for del button and tooltip
  const delwrapper = document.createElement("span");
  delwrapper.classList.add("del-wrapper");
  delwrapper.append(del, deltooltip);


  if (question.status) {
    input.checked = true;
    lineThrough(input, link, question, starLabel);
  }



  input.addEventListener("change", () => {
    lineThrough(input, link, question, starLabel);
    // Update tooltip text based on new status
    donetooltip.innerText = question.status ? "Mark as incomplete" : "Mark as completed";
  });


  label.append(checkboxWrapper, linkWrapper);
  li.append(label, revlinkwrapper, delwrapper);


  return li;
}

/* ================= SIMPLIFIED FUNCTIONS ================= */

function showQuestion() {
  const question = myQuestions[myQuestions.length - 1];
  ulEl.appendChild(createQuestionElement(question));
}

function renderQuestions() {
  ulEl.innerHTML = "";
  const fragment = document.createDocumentFragment();

  for (let question of myQuestions) {
    fragment.appendChild(createQuestionElement(question));
  }

  ulEl.appendChild(fragment);
}

function renderRevisions() {
  const fragment = document.createDocumentFragment();

  revisionUlEl.innerHTML = "";

  for (let question of revisionList) {
    fragment.appendChild(createQuestionElement(question));
  }

  revisionUlEl.appendChild(fragment);

}

/* ======================================================= */

function refreshHeading() {
  heading.innerText =
    myQuestions.length === 0
      ? "Nothing to-do 🗑️"
      : "Questions to-do:✍️";

  revHeading.innerText =
    revisionList.length === 0 ?
      "Nothing to revise 🗑️" :
      "Questions to revise 💡";
}

function getQuestionName(question) {
  return question.name?.trim() || question.url;
}

function clearInputs() {
  inputEl.value = "";
  quesNameEl.value = "";
  localStorage.removeItem("quesNameInput");
}

function deleteQuestion(question, li) {
  li.classList.add("deleting");

  setTimeout(() => {
    const removed = myQuestions.find(q => q.id === question.id);
    if (removed) set.delete(removed.url); // 🔥 FIX

    if (question.revision) {
      revisionList = revisionList.filter(q => q.id !== question.id);
    }
    else {
      myQuestions = myQuestions.filter(q => q.id !== question.id);
    }

    persistCollections();

    li.remove();
    refreshHeading();
  }, 300);
}


function lineThrough(input, link, question, starLabel) {
  if (input.checked) {
    link.classList.add("checked");
    question.status = true;
    persistCollections();

    starLabel.style.display = "inline-flex";
  }
  else {
    link.classList.remove("checked");
    question.status = false;
    persistCollections();
    if (!question.revision) starLabel.style.display = "none";
  }
}

function showToast(message) {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toast-message");

  toastMessage.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);

}

function findQuesName(url) {
  if (url.includes("geeksforgeeks.org") || url.includes("leetcode.com") || url.includes("naukri.com") || url.includes("interviewbit.com")) {
    let i = url.indexOf("problems/");
    let name = "";
    if (i >= 0) {
      i += 9;
      while (i < url.length) {
        const char = url.charAt(i);
        const code = url.charCodeAt(i);
        const isLetter = isUpperCase(char) || isLowerCase(char);
        const isDigit = code >= 48 && code <= 57;
        const isHyphen = char === '-';

        if (isLetter || isDigit || isHyphen) {
          if (isHyphen) name += " ";
          else name += char;
          i++;
        } else {
          break;
        }
      }

      return name.trim() || url;
    }
    else return url;
  } else return url;
}

function isUpperCase(char) {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return code >= 65 && code <= 90;
}

function isLowerCase(char) {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return code >= 97 && code <= 122;
}

function addToRevision(question, star, li) {

  animateRemove(li, () => {

    if (star.checked) {
      showToast("Marked for revision");

      question.revision = true;
      question.status = false;

      myQuestions = myQuestions.filter(q => q.id !== question.id);
      revisionList.push(question);

      set.delete(question.url);
      revSet.add(question.url);
    }
    else {
      showToast("Removed from revision");

      question.revision = false;
      question.status = true;

      revisionList = revisionList.filter(q => q.id !== question.id);
      myQuestions.push(question);

      revSet.delete(question.url);
      set.add(question.url);
    }

    persistCollections();

    refreshHeading();
    renderQuestions();
    renderRevisions();
  });
}


function showRevQuestion() {
  let q = revisionList[revisionList.length - 1];
  revisionUlEl.appendChild(createQuestionElement(q));
}

function animateRemove(li, callback) {
  li.classList.add("deleting");

  setTimeout(() => {
    li.remove();
    callback && callback();
  }, 300); // match CSS animation duration
}
