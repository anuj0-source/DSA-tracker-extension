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
    status:false
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
  const items = ulEl.querySelectorAll("li");
  
  if (items.length === 0) return;
  
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
    let quesName = quesNameEl.value ? quesNameEl.value : tab;

    clearInputs();

    myQuestions.push({
      id: crypto.randomUUID(),
      url: tab,
      name: quesName,
      status:false
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


  if(question.status){
    input.checked=true;
    lineThrough(input,link,question);
  }

  input.addEventListener("change",()=>{lineThrough(input,link,question)});


  label.append(input, customBox, link);
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
    myQuestions = myQuestions.filter(q => q.id !== id);
    localStorage.setItem("myQuestions", JSON.stringify(myQuestions));
    li.remove();
    refreshHeading();
  }, 300);
}

function lineThrough(input,link,question){
  if(input.checked){
    link.classList.add("checked");
    question.status=true;
    localStorage.setItem("myQuestions",JSON.stringify(myQuestions));

  }
  else {
    link.classList.remove("checked");
    question.status=false;
    localStorage.setItem("myQuestions",JSON.stringify(myQuestions));
  }
}