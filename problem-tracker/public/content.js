// Create floating action button
const fab = document.createElement('div');
fab.id = 'problem-tracker-fab';
fab.innerHTML = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
`;

// Add to page
document.body.appendChild(fab);

// Click handler - you'll implement the logic here later
fab.addEventListener('click', () => {
  console.log('Problem Tracker: Button clicked!');
  console.log('URL:', window.location.href);
  // TODO: Add logic to save question
});
