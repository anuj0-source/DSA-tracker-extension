let myQuestions = [];

const inputEl = document.getElementById("input-el");
const inputBtn = document.getElementById("input-btn");
const ulEl = document.querySelector("#ul-el");
const deleteBtn = document.querySelector("#delete-btn");
const tabBtn = document.querySelector("#tab-btn");
const heading = document.querySelector("#heading");
const quesNameEl=document.querySelector("#name");

inputBtn.addEventListener("click", function () {

  if (inputEl.value === "") return;

  myQuestions.push({url:inputEl.value,name:quesNameEl.value});

  clearInputs();

  localStorage.setItem("myQuestions", JSON.stringify(myQuestions)); // save in local storage
  
  showQuestion();
  refreshHeading();

});

deleteBtn.addEventListener("click", () => {
  localStorage.removeItem("myQuestions"); // remove questions from localStorage
  myQuestions = []; // clear array
  ulEl.innerHTML = ""; // clear UI
  refreshHeading();
});

tabBtn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    let tab = tabs[0].url;

    let quesName;
    if(quesNameEl.value) quesName=quesNameEl.value;
    else quesName=tab

    myQuestions.push({url:tab,name:quesName});
    localStorage.setItem("myQuestions", JSON.stringify(myQuestions));

    showQuestion();
    refreshHeading();

  });
});

document.addEventListener("DOMContentLoaded", () => {
  const storedQuestions = JSON.parse(localStorage.getItem("myQuestions"));

  if (storedQuestions) {
    myQuestions = storedQuestions;
  }

  renderQuestions();
  refreshHeading();
});

function showQuestion() {
  const item = myQuestions[myQuestions.length - 1];
  let itemName;

  if(item.name) itemName=item.name;
  else itemName=item.url;

  const fragment = document.createDocumentFragment();

  const li = document.createElement("li");
  li.innerHTML = `<a href="${item.url}" target="_blank">${itemName}</a>`;
  fragment.appendChild(li);

  ulEl.appendChild(fragment);

}

function renderQuestions() {
  const fragment = document.createDocumentFragment();

  for (let question of myQuestions) {
    const url=question.url;

    let quesName=getQuestionName(question);

    const li = document.createElement("li");
    li.innerHTML = `<a href="${url}" target="_blank">${quesName}</a>`;
    fragment.appendChild(li);
  }

  ulEl.appendChild(fragment);
}

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
}
