const navigation = document.querySelector('.navbar');
const navToggle = navigation.querySelector('.nav-toggle');
const navLabel = navToggle.querySelector('.nav-toggle-label');
const roomMenu = navigation.querySelector('.nav-rooms');
const mobileNavigation = window.matchMedia('(max-width: 900px)');

function closeNavigation(returnFocus = false) {
  navigation.classList.remove('menu-open');
  navToggle.setAttribute('aria-expanded', 'false');
  navLabel.textContent = 'Menu';
  roomMenu.open = false;
  if (returnFocus) navToggle.focus();
}

navToggle.hidden = false;
navigation.classList.add('nav-enhanced');
navToggle.addEventListener('click', () => {
  const open = navigation.classList.toggle('menu-open');
  navToggle.setAttribute('aria-expanded', String(open));
  navLabel.textContent = open ? 'Fermer' : 'Menu';
  if (!open) roomMenu.open = false;
});
navigation.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeNavigation();
});
document.addEventListener('click', (event) => {
  if (!navigation.contains(event.target)) closeNavigation();
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (navigation.classList.contains('menu-open')) closeNavigation(true);
  else if (roomMenu.open) {
    roomMenu.open = false;
    roomMenu.querySelector('summary').focus();
  }
});
navigation.addEventListener('focusout', (event) => {
  if (!navigation.contains(event.relatedTarget)) closeNavigation();
});
mobileNavigation.addEventListener('change', () => closeNavigation());
