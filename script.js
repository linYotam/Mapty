'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

//^ Workout Class
class Workout {
  date = new Date();
  //Uniqe index (without external library)
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; // in KM
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    //Set description with worktype & date
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

//^ Running Class
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    //Calculate the pace of the workout
    this.calcPace();
    //Get workout discription
    this._setDescription();
  }

  //-Calcualte pace
  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;

    return this.pace;
  }
}

//^ Cycling Class
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    //Calculate the speed of the workout
    this.calcSpeed();
    //Get workout discription
    this._setDescription();
  }

  //-Calcualte speed
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

//^ Mapty APP Class
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  //- Constructor
  constructor() {
    //get user current location
    this._getPosition();

    //submiting a new workout in form
    form.addEventListener('submit', this._newWorkout.bind(this));
    //When changing type in form, change input field of activity info
    inputType.addEventListener('change', this.toggleElevationField);
    // When click on workout in the workout list --> move to position on map
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  //- Get user current location
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your location');
        }
      );
    }
  }

  //- Load map --> set in user location
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    //Get data from local storage
    this._getLocalStorage();
  }

  //- Show form
  _showForm(e) {
    this.#mapEvent = e;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  //- Hide form
  _hideForm() {
    // prettier-ignore
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  //- Toggle field info (elevation/cadence) when changing activity type
  toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  //- Add marker & popup on map after submiting an activity
  _newWorkout(e) {
    //Helper function --> check if the form inputs are numbers
    const validInput = (...inputs) =>
      inputs.every(input => Number.isFinite(input));
    //Helper function --> check if inputs are positive
    const allPositive = (...inputs) => inputs.every(input => input > 0);

    e.preventDefault();

    //Get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //If activity running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      //Check if data is valid
      if (
        !validInput(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Input have to be a positive number');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //If activity cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      //Check if data is valid
      if (
        !validInput(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Input have to be a positive number');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //Add new object to the workouts array
    this.#workouts.push(workout);

    //render workout on map as marker
    this._renderWorkoutMarker(workout);

    //render workout on list under form
    this._renderWorkout(workout);

    //Hide form + Clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  //- Show workout marker on map with workout details
  _renderWorkoutMarker(workout) {
    //Display marker
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  //- Render workout on workouts list on screen
  _renderWorkout(workout) {
    //Render workout on screen
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === 'running') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;
    }

    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevation}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;
    }
    //Add HTML to activities list
    form.insertAdjacentHTML('afterend', html);
  }

  //- Move map center position to popup location
  _moveToPopup(e) {
    //Get workout element in DOM
    const workoutElm = e.target.closest('.workout');

    //If no workout element --> return
    if (!workoutElm) return;

    //Get workout object by id
    const workout = this.#workouts.find(
      workout => workout.id === workoutElm.dataset.id
    );

    //Move to workout coords
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });
  }

  //- Save workouts in local storage
  _setLocalStorage() {
    //local storage can only store string type
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  //- Get data from local storage
  _getLocalStorage() {
    //Get data from local storage
    const data = localStorage.getItem('workouts');

    //If no data exist --> return
    if (!data) return;

    //Parse data back into array
    this.#workouts = JSON.parse(data);
    //Render each workout into DOM
    this.#workouts.forEach(workout => {
      this._renderWorkout(workout);
      this._renderWorkoutMarker(workout);
    });
  }

  //- Delete local storage
  reset() {
    //Remove workouts from storage
    localStorage.removeItem('workouts');
    //Reload the page
    location.reload();
  }
}

//^ Start APP
const app = new App();
