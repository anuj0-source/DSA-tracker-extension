let myQuestions = [];
let set = new Set();

const inputEl = document.getElementById("input-el");
const inputBtn = document.getElementById("input-btn");
const ulEl = document.querySelector("#ul-el");
const deleteBtn = document.querySelector("#delete-btn");
const tabBtn = document.querySelector("#tab-btn");
const heading = document.querySelector("#heading");
const quesNameEl = document.querySelector("#name");

inputBtn.addEventListener("click", function () {
  if (inputEl.value === "") {
    showToast("⚠️ Please enter a URL!");
    return;
  }

  if (set.has(inputEl.value)) {
    showToast("⚠️ This question already exists!");
    return;
  }

  myQuestions.push({
    id: crypto.randomUUID(),
    url: inputEl.value,
    name: quesNameEl.value,
    status: false
  });

  set.add(inputEl.value);

  clearInputs();
  localStorage.setItem("myQuestions", JSON.stringify(myQuestions));
  showQuestion();
  refreshHeading();
});

quesNameEl.addEventListener("input", () => {
  localStorage.setItem("quesNameInput", quesNameEl.value);
});

deleteBtn.addEventListener("click", () => {
  const items = ulEl.querySelectorAll("li");

  if (items.length === 0) return;

  set = new Set();

  items.forEach((li, index) => {
    setTimeout(() => {
      li.classList.add("deleting");
    }, index * 50); // stagger animation
  });

  setTimeout(() => {
    localStorage.removeItem("myQuestions");
    myQuestions = [];
    ulEl.innerHTML = "";
    refreshHeading();
  }, items.length * 50 + 300);

});

tabBtn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    let tab = tabs[0].url;
    let quesName = quesNameEl.value ? quesNameEl.value : findQuesName(tab);

    if (set.has(tab)) {
      showToast("⚠️ This question already exists!");
      return;
    }

    set.add(tab);


    clearInputs();

    myQuestions.push({
      id: crypto.randomUUID(),
      url: tab,
      name: quesName,
      status: false
    });

    localStorage.setItem("myQuestions", JSON.stringify(myQuestions));
    showQuestion();
    refreshHeading();
  });
});

document.addEventListener("DOMContentLoaded", () => {
  quesNameEl.value = localStorage.getItem("quesNameInput") || "";

  const storedQuestions = JSON.parse(localStorage.getItem("myQuestions"));
  if (storedQuestions) {
    myQuestions = storedQuestions;
    myQuestions.forEach(q => set.add(q.url)); // 🔥 FIX
  }

  renderQuestions();
  refreshHeading();
});


/* =============== SINGLE REUSABLE FUNCTION =============== */

function createQuestionElement(question) {
  const li = document.createElement("li");

  const del = document.createElement("button");
  del.type = "button";
  del.classList.add("del-btn");
  del.innerHTML = "<img src='del.svg' class='del-svg'>";
  del.addEventListener("click", () => deleteQuestion(question.id, li));

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

  // Wrap link and tooltip
  const linkWrapper = document.createElement("span");
  linkWrapper.classList.add("link-wrapper");
  linkWrapper.append(link, tooltip);

  if (question.status) {
    input.checked = true;
    lineThrough(input, link, question);
  }

  input.addEventListener("change", () => { lineThrough(input, link, question) });


  label.append(input, customBox, linkWrapper);
  li.append(label, del);

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

/* ======================================================= */

function refreshHeading() {
  heading.innerText =
    myQuestions.length === 0
      ? "Nothing to-do 🗑️"
      : "Questions to-do:✍️";
}

function getQuestionName(question) {
  return question.name?.trim() || question.url;
}

function clearInputs() {
  inputEl.value = "";
  quesNameEl.value = "";
  localStorage.removeItem("quesNameInput");
}

function deleteQuestion(id, li) {
  li.classList.add("deleting");

  setTimeout(() => {
    const removed = myQuestions.find(q => q.id === id);
    if (removed) set.delete(removed.url); // 🔥 FIX

    myQuestions = myQuestions.filter(q => q.id !== id);
    localStorage.setItem("myQuestions", JSON.stringify(myQuestions));
    li.remove();
    refreshHeading();
  }, 300);
}


function lineThrough(input, link, question) {
  if (input.checked) {
    link.classList.add("checked");
    question.status = true;
    localStorage.setItem("myQuestions", JSON.stringify(myQuestions));

  }
  else {
    link.classList.remove("checked");
    question.status = false;
    localStorage.setItem("myQuestions", JSON.stringify(myQuestions));
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
  if (url.includes("geeksforgeeks.org") || url.includes("leetcode.com") || url.includes("naukri.com")) {
    let i = url.indexOf("problems/");
    let name = "";
    if (i >= 0) {
      i += 9;
      let start=true;
      while (
        isUpperCase(url.charAt(i)) || // A-Z
        isLowerCase(url.charAt(i)) || // a-z
        (url.charAt(i) === '-')||
        (url.charCodeAt(i) >= 48 && url.charCodeAt(i) <= 57 && start)
      ) {
        if(start && url.charAt(i) == '-' || isUpperCase(url.charAt(i)) || isLowerCase(url.charAt(i))) start=false;
        if (url.charAt(i) == '-') name += " ";
        else name += url.charAt(i);
        i++;
      }

      return name;
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
