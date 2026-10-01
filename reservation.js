const form = document.querySelector('.reservation-form');
const arrival = document.querySelector('#arrivee');
const departure = document.querySelector('#depart');
const confirmation = document.querySelector('#demo-confirmation');
const submitButton = form.querySelector('button[type="submit"]');
const roomSelect = document.querySelector('#chambre');
const selectedRoom = new URLSearchParams(window.location.search).get('chambre');

if (selectedRoom && Array.from(roomSelect.options).some(option => option.value === selectedRoom)) {
  roomSelect.value = selectedRoom;
}

function validateDates() {
  departure.min = arrival.value;
  departure.setCustomValidity(
    arrival.value && departure.value && departure.value <= arrival.value
      ? "Choisissez une date de départ après la date d’arrivée."
      : ''
  );
}

function updateForm() {
  confirmation.hidden = true;
  validateDates();
}

form.addEventListener('input', updateForm);
form.addEventListener('change', updateForm);

form.addEventListener('submit', (event) => {
  event.preventDefault();
  validateDates();
  if (!form.reportValidity()) return;
  confirmation.hidden = false;
  confirmation.focus();
  confirmation.scrollIntoView({ block: 'center' });
});

// Le bouton reste désactivé si JavaScript ne se charge pas : aucun envoi réel.
submitButton.disabled = false;
