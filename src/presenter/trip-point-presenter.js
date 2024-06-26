import { replace, render, remove } from '../framework/render';
import { MODE, UserAction, UpdateType, EditType } from '../const';
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

  constructor({container, destinationsModel, offersModel, onDataChange, onModeChange}){
    this.#container = container;
    this.#destinationsModel = destinationsModel;
    this.#offersModel = offersModel;
    this.#handleDataChange = onDataChange;
    this.#handleModeChange = onModeChange;
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
      onFavoriteClick: this.#favoriteClickHandler,
    }
    );
    this.#redactorComponent = new RedactorEventView({
      point: this.#point,
      pointDestination: this.#destinationsModel.get(),
      pointOffers: this.#offersModel.get(),
      onFormClose: this.#redactorCloseHandler,
      onFormSubmit: this.#redactorSubmitHandler,
      onFormDelete: this.#redactorDeleteHandler,
      pointType: EditType.EDITING,
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
      this.#redactorComponent.reset(this.#point);
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
    if(evt.key === 'Escape' && !this.#redactorComponent.isDisabled){
      evt.preventDefault();
      this.#pointComponent.reset(this.#point);
      this.#switchToPoint();
    }
  };

  #favoriteClickHandler = () => {
    this.#handleDataChange(
      UserAction.UPDATE_POINT,
      UpdateType.PATCH,{
        ...this.#point,
        isFavorite: !this.#point.isFavorite,
      });
  };

  #pointRedactorClickHandler = () => {
    this.#switchToRedactor();
  };

  #redactorSubmitHandler = (newPoint) => {
    this.#handleDataChange(UserAction.UPDATE_POINT, UpdateType.PATCH, newPoint);
    if(!this.#redactorComponent.isDisabled){
      this.#switchToPoint();
    }
  };

  #redactorCloseHandler = () => {
    if(!this.#redactorComponent.isDisabled){
      this.#redactorComponent.reset(this.#point);
      this.#switchToPoint();
    }
  };

  #redactorDeleteHandler = (point) => {
    this.#handleDataChange(UserAction.DELETE_POINT, UpdateType.MINOR, point);
  };

  setSaving = () => {
    if(this.#mode === MODE.EDITING){
      this.#redactorComponent.updateElement({
        isDisabled: true,
        isSaving: true,
      });
    }
  };

  setAborting = () => {
    if(this.#mode === MODE.DEFAULT){
      this.#pointComponent.shake();
      return;
    }
    if(this.#mode === MODE.EDITING){
      const resetFormState = () => {
        this.#redactorComponent.updateElement({
          isDisabled: false,
          isSaving: false,
          isDeleting: false,
        });
      };
      this.#redactorComponent.shake(resetFormState);
    }
  };

  setDeleting = () => {
    this.#redactorComponent.updateElement({
      isDisabled: true,
      isSaving: true,
    });
  };
}
