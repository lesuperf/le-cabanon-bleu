const form = document.querySelector('.stay-form');
const fields = [
  document.querySelector('#stay-arrival'),
  document.querySelector('#stay-departure'),
];
const triggers = [];
const dateLabel = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const monthLabel = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
});
const iso = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const parse = (value) => new Date(`${value}T12:00:00`);
const today = iso(new Date());
let active = 0,
  month;
const dialog = document.createElement('dialog');
dialog.className = 'stay-calendar';
dialog.setAttribute('aria-labelledby', 'calendar-title');
dialog.innerHTML = `
  <div class="calendar-top">
    <h2 id="calendar-title"></h2>
    <button type="button" class="calendar-close" aria-label="Fermer">&times;</button>
  </div>
  <p>Choisissez une date dans le calendrier.</p>
  <div class="calendar-month-nav">
    <button type="button" class="calendar-prev" aria-label="Mois precedent">&lsaquo;</button>
    <strong class="calendar-month" aria-live="polite"></strong>
    <button type="button" class="calendar-next" aria-label="Mois suivant">&rsaquo;</button>
  </div>
  <div class="calendar-weekdays" aria-hidden="true">
    <span>Lun</span><span>Mar</span><span>Mer</span><span>Jeu</span>
    <span>Ven</span><span>Sam</span><span>Dim</span>
  </div>
  <div class="calendar-days"></div>
`;
document.body.append(dialog);
const days = dialog.querySelector('.calendar-days');
function minimum() {
  if (active === 1 && fields[0].value) {
    const date = parse(fields[0].value);
    date.setDate(date.getDate() + 1);
    return iso(date) > today ? iso(date) : today;
  }
  return today;
}
function render() {
  dialog.querySelector('h2').textContent =
    active === 0 ? 'Votre arriv\u00e9e' : 'Votre d\u00e9part';
  dialog.querySelector('.calendar-month').textContent =
    monthLabel.format(month);
  const minMonth = parse(minimum());
  minMonth.setDate(1);
  dialog.querySelector('.calendar-prev').disabled = month <= minMonth;
  days.replaceChildren();
  for (let i = 0; i < (month.getDay() + 6) % 7; i++)
    days.append(document.createElement('span'));
  const count = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  for (let n = 1; n <= count; n++) {
    const date = new Date(month.getFullYear(), month.getMonth(), n, 12);
    const value = iso(date),
      button = document.createElement('button');
    button.type = 'button';
    button.textContent = n;
    button.dataset.date = value;
    button.disabled = value < minimum();
    button.setAttribute('aria-label', dateLabel.format(date));
    if (value === today) button.setAttribute('aria-current', 'date');
    if (value === fields[active].value) {
      button.className = 'selected';
      button.setAttribute(
        'aria-label',
        dateLabel.format(date) + ', date choisie',
      );
    }
    days.append(button);
  }
}
function open(index) {
  active = index;
  const value = fields[index].value;
  month = parse(value && value >= minimum() ? value : minimum());
  month.setDate(1);
  render();
  dialog.showModal();
  (
    days.querySelector('.selected') ||
    days.querySelector('button:not(:disabled)')
  ).focus();
}
function update() {
  fields.forEach(
    (field, index) =>
      (triggers[index].querySelector('span').textContent = field.value
        ? dateLabel.format(parse(field.value))
        : 'Choisir une date'),
  );
}
fields.forEach((field, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'stay-date-button';
  button.id = field.id + '-button';
  button.setAttribute('aria-haspopup', 'dialog');
  button.innerHTML =
    '<span id="' +
    button.id +
    '-text"></span><span aria-hidden="true">&#9638;</span>';
  const label = field.parentElement.querySelector('label');
  label.id = field.id + '-label';
  label.htmlFor = button.id;
  button.setAttribute('aria-labelledby', label.id + ' ' + button.id + '-text');
  field.type = 'hidden';
  field.required = false;
  field.after(button);
  triggers.push(button);
  button.addEventListener('click', () => open(index));
});
update();
dialog
  .querySelector('.calendar-close')
  .addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  if (!dialog.open) triggers[active].focus();
});
dialog.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  const r = dialog.getBoundingClientRect();
  if (
    event.clientX < r.left ||
    event.clientX > r.right ||
    event.clientY < r.top ||
    event.clientY > r.bottom
  )
    dialog.close();
});
for (const [selector, step] of [
  ['.calendar-prev', -1],
  ['.calendar-next', 1],
]) {
  dialog.querySelector(selector).addEventListener('click', () => {
    month.setMonth(month.getMonth() + step);
    render();
  });
}
days.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-date]');
  if (!button || button.disabled) return;
  fields[active].value = button.dataset.date;
  if (active === 0 && fields[1].value <= fields[0].value) fields[1].value = '';
  update();
  const next = active === 0 && !fields[1].value;
  dialog.close();
  if (next) open(1);
});
days.addEventListener('keydown', (event) => {
  const steps = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
  if (!(event.key in steps) || !event.target.dataset.date) return;
  event.preventDefault();
  const date = parse(event.target.dataset.date);
  date.setDate(date.getDate() + steps[event.key]);
  const value = iso(date);
  if (value < minimum()) return;
  month = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  render();
  days.querySelector('[data-date="' + value + '"]').focus();
});
form.addEventListener('submit', (event) => {
  const missing = fields.findIndex((field) => !field.value);
  if (missing !== -1) {
    event.preventDefault();
    open(missing);
  } else if (fields[1].value <= fields[0].value) {
    event.preventDefault();
    open(1);
  }
});
