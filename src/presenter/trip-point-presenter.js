import { replace, render, remove } from '../framework/render';
import { MODE } from '../const';
import TripPointView from '../view/trip-point-view';
import RedactorEventView from '../view/redactor-event-view';

export default class TripPointPresenter{
  #container = null;
  #destinationsModel = null;
  #offersModel = null;
  #point = null;
  #pointComponent = null;
  #redactorComponent = null;
  #mode = MODE.DEFAULT;
  #handleDataChange = null;
  #handleModeChange = null;

  constructor({container, destinationsModel, offersModel, handleDataChange, handleModeChange}){
    this.#container = container;
    this.#destinationsModel = destinationsModel;
    this.#offersModel = offersModel;
    this.#handleDataChange = handleDataChange;
    this.#handleModeChange = handleModeChange;
  }

  init(point){
    this.#point = point;
    const prevPointComponent = this.#pointComponent;
    const prevRedactorComponent = this.#redactorComponent;

    this.#pointComponent = new TripPointView({
      point: this.#point,
      pointDestination: this.#destinationsModel.getById(point.destination),
      pointOffers: this.#offersModel.getByType(point.type),
      onRedactorClick: this.#pointRedactorClickHandler,
      onFavoriteClick: this.#onFavoriteClick,
    }
    );
    this.#redactorComponent = new RedactorEventView({
      point: this.#point,
      pointDestination: this.#destinationsModel.getById(point.destination),
      pointOffers: this.#offersModel.getByType(point.type),
      onFormSubmit: this.#pointSubmitHandler,
      onResetClick: this.#resetButtonClickHandler,
    });

    if(!prevPointComponent || !prevRedactorComponent){
      render(this.#pointComponent, this.#container);
      return;
    }
    if(this.#mode === MODE.DEFAULT){
      replace(this.#pointComponent, prevPointComponent);
    }
    if(this.#mode === MODE.EDITING){
      replace(this.#redactorComponent, prevRedactorComponent);
    }

    remove(prevRedactorComponent);
    remove(prevPointComponent);
  }

  resetView() {
    if (this.#mode === MODE.EDITING) {
      this.#switchToPoint();
    }
  }

  destroy() {
    remove(this.#pointComponent);
    remove(this.#redactorComponent);
  }

  #switchToRedactor = () => {
    replace(this.#redactorComponent, this.#pointComponent);
    document.addEventListener('keydown', this.#onEscape);
    this.#handleModeChange();
    this.#mode = MODE.EDITING;
  };

  #switchToPoint = () => {
    replace(this.#pointComponent, this.#redactorComponent);
    document.removeEventListener('keydown', this.#onEscape);
    this.#mode = MODE.DEFAULT;
  };

  #onEscape = (evt) => {
    if(evt.key === 'Escape'){
      evt.preventDefault();
      this.#switchToPoint();
    }
  };

  #onFavoriteClick = () => {
    this.#handleDataChange({
      ...this.#point,
      isFavorite: !this.#point.isFavorite,
    });
  };

  #pointRedactorClickHandler = () => {
    this.#switchToRedactor();
  };

  #pointSubmitHandler = () => {
    this.#switchToPoint();
  };

  #resetButtonClickHandler = () => {
    this.#switchToPoint();
  };

}
