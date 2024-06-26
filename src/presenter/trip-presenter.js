import SortView from '../view/sort-view';
import TripEventsView from '../view/trip-events-view';
import EmptyListView from '../view/empty-list-view';
import LoadingView from '../view/loading-view';
import TripPointPresenter from './trip-point-presenter';
import NewPointPresenter from './new-point-presenter';
import UiBlocker from '../framework/ui-blocker/ui-blocker';
import { remove, render, replace, RenderPosition } from '../framework/render';
import { SORT_TYPE, UserAction, UpdateType, EnabledSortType, FILTER_TYPE, TimeLimit } from '../const';
import { filter } from '../utils/filter';
import {sortTime, sortPrice} from '../utils/sort';

export default class TripPresenter{
  #tripContainer = null;
  #pointList = new TripEventsView();
  #destinationsModel = null;
  #offersModel = null;
  #pointsModel = null;
  #filterModel = null;
  #pointPresenters = new Map();
  #newPointPresenter = null;
  #newPointButtonPresenter = null;
  #sortComponent = null;
  #messageComponent = null;
  #loadingComponent = new LoadingView();
  #currentSortType = SORT_TYPE.DAY;
  #isCreating = false;
  #isLoading = true;
  #isErrorLoading = false;
  #blocker = new UiBlocker({
    lowerLimit: TimeLimit.LOWER_LIMIT,
    upperLimit: TimeLimit.UPPER_LIMIT,
  });

  constructor({tripContainer, destinationsModel, offersModel, pointsModel, filterModel, newPointButton }){
    this.#tripContainer = tripContainer;
    this.#destinationsModel = destinationsModel;
    this.#offersModel = offersModel;
    this.#pointsModel = pointsModel;
    this.#filterModel = filterModel;
    this.#newPointButtonPresenter = newPointButton;

    this.#newPointPresenter = new NewPointPresenter({
      container: this.#pointList.element,
      destinationsModel: this.#destinationsModel,
      offersModel: this.#offersModel,
      onDataChange: this.#handlePointChange,
      onDestroy: this.#handleNewPointDestroy,
    });

    this.#pointsModel.addObserver(this.#handleModelChange);
    this.#filterModel.addObserver(this.#handleModelChange);
  }

  init(){
    this.#renderTrip();
  }

  get points(){
    const points = this.#pointsModel.get();
    const currentFilter = this.#filterModel.get();
    const filteredPoints = filter[currentFilter](points);
    switch(this.#currentSortType){
      case SORT_TYPE.TIME:
        return filteredPoints.sort(sortTime);
      case SORT_TYPE.PRICE:
        return filteredPoints.sort(sortPrice);
      default:
        return filteredPoints;
    }
  }

  handleNewPointClick = () => {
    this.#isCreating = true;
    this.#currentSortType = SORT_TYPE.DAY;
    this.#filterModel.set(UpdateType.MAJOR, FILTER_TYPE.EVERYTHING);
    this.#newPointButtonPresenter.disableButton();
    this.#newPointPresenter.init();
  };

  #handleNewPointDestroy = ({isCanceled}) => {
    this.#isCreating = false;
    this.#newPointButtonPresenter.enableButton();
    if(!this.points.length && isCanceled){
      this.#clearTrip();
      this.#renderTrip();
    }
  };

  #renderTrip(){
    if(this.#isLoading){
      this.#renderLoading();
      this.#newPointButtonPresenter.disableButton();
      return;
    }

    this.#newPointButtonPresenter.enableButton();

    if(this.#isErrorLoading){
      this.#clearTrip({resetSortType: true});
      return;
    }

    if(!this.points.length && !this.#isCreating){
      this.#renderMessage();
      return;
    }
    this.#renderSort();
    this.#renderPointList();
    this.#renderPoints();
  }

  #renderPointList(){
    render(this.#pointList, this.#tripContainer);
  }

  #renderLoading(){
    render(this.#loadingComponent, this.#tripContainer, RenderPosition.AFTERBEGIN);
  }

  #renderPoints(){
    this.points.forEach((point) => {
      this.#renderPoint(point);
    });
  }

  #renderPoint(point){
    const pointPresenter = new TripPointPresenter({
      container: this.#pointList.element,
      destinationsModel: this.#destinationsModel,
      offersModel: this.#offersModel,
      onDataChange: this.#handlePointChange,
      onModeChange: this.#handleModeChange,
    });
    pointPresenter.init(point);
    this.#pointPresenters.set(point.id, pointPresenter);
  }

  #clearPoints(){
    this.#pointPresenters.forEach((presenter) => presenter.destroy());
    this.#pointPresenters.clear();
    this.#newPointPresenter.destroy();
  }

  #renderSort(){
    const previousSortComponent = this.#sortComponent;
    const sortTypes = Object.values(SORT_TYPE).map((type) => ({
      type,
      isChecked: (type === this.#currentSortType),
      isDisabled: !EnabledSortType[type],
    }));
    this.#sortComponent = new SortView({
      items: sortTypes,
      onSortTypeChange: this.#handleSortTypeChange,
    });
    if(previousSortComponent){
      replace(this.#sortComponent, previousSortComponent);
      remove(previousSortComponent);
    } else{
      render(this.#sortComponent, this.#tripContainer);
    }
  }

  #renderMessage() {
    this.#messageComponent = new EmptyListView({filterType: this.#filterModel.get()});
    render(this.#messageComponent, this.#tripContainer);
  }

  #handleModeChange = () => {
    this.#pointPresenters.forEach((presenter) => presenter.resetView());
    this.#newPointPresenter.destroy();
  };

  #handleSortTypeChange = (sortType) => {
    if(this.#currentSortType === sortType){
      return;
    }
    this.#currentSortType = sortType;
    this.#clearPoints();
    this.#renderSort();
    this.#renderPoints();
  };

  #handlePointChange = async (actionType, updateType, update) => {
    this.#blocker.block();
    switch (actionType) {
      case UserAction.ADD_POINT:
        this.#newPointPresenter.setSaving();
        try{
          await this.#pointsModel.addPoint(updateType, update);
        } catch{
          this.#newPointPresenter.setAborting();
        }
        break;
      case UserAction.UPDATE_POINT:
        this.#pointPresenters.get(update.id).setSaving();
        try{
          await this.#pointsModel.updatePoint(updateType, update);
        } catch{
          this.#pointPresenters.get(update.id).setAborting();
        }
        break;
      case UserAction.DELETE_POINT:
        this.#pointPresenters.get(update.id).setDeleting();
        try{
          await this.#pointsModel.deletePoint(updateType, update);
        } catch{
          this.#pointPresenters.get(update.id).setAborting();
        }
        break;
    }
    this.#blocker.unblock();
  };

  #handleModelChange = (updateType, data) => {
    switch (updateType) {
      case UpdateType.PATCH:
        this.#pointPresenters.get(data.id).init(data);
        break;
      case UpdateType.MINOR:
        this.#clearTrip();
        this.#renderTrip();
        break;
      case UpdateType.MAJOR:
        this.#clearTrip({ resetSortType: true });
        this.#renderTrip();
        break;
      case UpdateType.INIT:
        if(data.isError){
          this.#isLoading = false;
          this.#isErrorLoading = true;
        }else{
          this.#isLoading = false;
          this.#isErrorLoading = false;
          remove(this.#loadingComponent);
        }
        this.#renderTrip();
        break;
    }
  };

  #clearTrip = ({resetSortType = false} = {}) => {
    this.#clearPoints();
    remove(this.#messageComponent);
    remove(this.#loadingComponent);
    remove(this.#sortComponent);
    this.#sortComponent = null;

    if(resetSortType){
      this.#currentSortType = SORT_TYPE.DAY;
    }
  };
}
