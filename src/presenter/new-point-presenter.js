import RedactorEventView from '../view/redactor-event-view';
import { render, remove, RenderPosition } from '../framework/render';
import { UserAction, UpdateType, EditType} from '../const';

export default class NewPointPresenter{
  #container = null;
  #component = null;
  #destinationsModel = null;
  #offersModel = null;
  #handleDataChange = null;
  #handleDestroy = null;

  constructor({container, destinationsModel, offersModel, onDataChange, onDestroy}){
    this.#container = container;
    this.#destinationsModel = destinationsModel;
    this.#offersModel = offersModel;
    this.#handleDataChange = onDataChange;
    this.#handleDestroy = onDestroy;
  }

  init(){
    if (!this.#component) {
      this.#component = new RedactorEventView({
        pointDestination: this.#destinationsModel.get(),
        pointOffers: this.#offersModel.get(),
        onFormClose: this.#handleFormClose,
        onFormSubmit: this.#handleFormSubmit,
        pointType: EditType.CREATING,
      });

      render(this.#component, this.#container, RenderPosition.AFTERBEGIN);
      document.addEventListener('keydown', this.#onEscape);
    }
  }

  #handleFormClose = () => {
    this.destroy();
  };

  #handleFormSubmit = (update) => {
    this.#handleDataChange(UserAction.ADD_POINT, UpdateType.MINOR, update);
  };

  #onEscape = (evt) => {
    if (evt.key === 'Escape') {
      evt.preventDefault();
      this.destroy();
    }
  };

  destroy = ({isCanceled = true} = {}) => {
    if(!this.#component){
      return;
    }

    remove(this.#component);
    this.#component = null;
    document.removeEventListener('keydown', this.#onEscape);
    this.#handleDestroy({isCanceled});
  };

  setSaving = () => {
    this.#component.updateElement({isDisabled: true, isSaving: true,});
  };

  setAborting = () => {
    const resetFormState = () => {
      this.#component.updateElement({ isDisabled: false, isSaving: false, isDeleting: false, });
    };
    this.#component.shake(resetFormState);
  };
}
