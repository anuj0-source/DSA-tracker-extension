let myQuestions = [];

const inputEl = document.getElementById("input-el");
const inputBtn = document.getElementById("input-btn");
const ulEl = document.querySelector("#ul-el");
const deleteBtn = document.querySelector("#delete-btn");
const tabBtn = document.querySelector("#tab-btn");
const heading = document.querySelector("#heading");
const quesNameEl = document.querySelector("#name");

inputBtn.addEventListener("click", function () {
  if (inputEl.value === "") return;

  myQuestions.push({
    id: crypto.randomUUID(),
    url: inputEl.value,
    name: quesNameEl.value,
  });

  clearInputs();

  localStorage.setItem("myQuestions", JSON.stringify(myQuestions));
  showQuestion();
  refreshHeading();
});

quesNameEl.addEventListener("input", () => {
  localStorage.setItem("quesNameInput", quesNameEl.value);
});

deleteBtn.addEventListener("click", () => {
  localStorage.removeItem("myQuestions");
  myQuestions = [];
  ulEl.innerHTML = "";
  refreshHeading();
});

tabBtn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    let tab = tabs[0].url;

    let quesName = quesNameEl.value ? quesNameEl.value : tab;

    clearInputs();

    myQuestions.push({
      id: crypto.randomUUID(),
      url: tab,
      name: quesName,
    });

    localStorage.setItem("myQuestions", JSON.stringify(myQuestions));
    showQuestion();
    refreshHeading();
  });
});

document.addEventListener("DOMContentLoaded", () => {
  quesNameEl.value = localStorage.getItem("quesNameInput") || "";

  const storedQuestions = JSON.parse(localStorage.getItem("myQuestions"));
  if (storedQuestions) myQuestions = storedQuestions;

  renderQuestions();
  refreshHeading();
});

/* ================= MODIFIED FUNCTIONS ================= */

function showQuestion() {
  const question = myQuestions[myQuestions.length - 1];

  const li = document.createElement("li");

  // 🔴 SVG-only delete button (no behavior)
  const del = document.createElement("button");
  del.type = "button"; // prevents form / default behavior
  del.classList.add("del-btn");
  del.innerHTML =
    "<img src='del.svg' alt='delete icon' class='del-svg'>";

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

  label.append(input, customBox, link);
  li.appendChild(label);
  li.appendChild(del);
  ulEl.appendChild(li);
}

function renderQuestions() {
  ulEl.innerHTML = "";

  const fragment = document.createDocumentFragment();

  for (let question of myQuestions) {
    const li = document.createElement("li");

    // 🔴 SVG-only delete button (no behavior)
    const del = document.createElement("button");
    del.type = "button";
    del.classList.add("del-btn");
    del.innerHTML =
      "<img src='del.svg' alt='delete icon' class='del-svg'>";

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

    label.append(input, customBox, link);
    li.appendChild(label);
    li.appendChild(del);
    fragment.appendChild(li);
  }

  ulEl.appendChild(fragment);
}

/* ===================================================== */

function refreshHeading() {
  if (myQuestions.length == 0) heading.innerText = "Nothing to-do 🗑️";
  else heading.innerText = "Questions to-do:✍️";
}

function getQuestionName(question) {
  return question.name?.trim() || question.url;
}

function clearInputs() {
  inputEl.value = "";
  quesNameEl.value = "";
  localStorage.removeItem("quesNameInput");
}
