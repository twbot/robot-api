import Ed from './ed';
import _ from 'lodash';

class EdMisc extends Ed {
  constructor(robot) {
    super(robot);
    const ros = robot.ros;

    // World model database
    this.models = {};
    this.modelsService = ros.Service({
      name: 'ed/get_model_images',
      serviceType: 'ed_robocup/GetModelImages'
    });
    // this.updateModels();

    // World model fitting
    this.fitModelService = ros.Service({
      name: 'ed/fit_entity_in_image',
      serviceType: 'ed_robocup/FitEntityInImage'
    });

    this.navigateToService = ros.Service({
      name: 'ed/navigate_to',
      serviceType: 'ed_sensor_integration/NavigateTo'
    });

    this.createWallsService = ros.Service({
      name: 'ed/create_walls',
      serviceType: 'std_srvs/Empty'
    });
  }
}

/**
 * World model database
 */

EdMisc.prototype.updateModels = function updateModels() {
  const request = {};

  this.modelsService.callService(request, response => {
    response.model_names.forEach((name, i) => {
      const image_binary = response.model_images[i];

      const encoding = image_binary.encoding;
      image_binary.src = `data:image/${encoding};base64,${image_binary.data}`;

      this.models[name] = image_binary;
    });

    this.emit('models', this.models);
  }, msg => {
    console.warn('update models failed:', msg);
    _.delay(updateModels.bind(this), 5000);
  });
};

/**
 * World model fitting
 */
EdMisc.prototype.fit_model = function (model_name, image_id, click_x_ratio, click_y_ratio) {
  const request = {
    /* eslint camelcase:0 */
    model_name,
    image_id,
    click_x_ratio,
    click_y_ratio
  };

  this.fitModelService.callService(request, response => {
    this.force_update();

    const error_msg = response.error_msg;
    if (error_msg) {
      console.warn('fit model error:', error_msg);
    }
  });
};

EdMisc.prototype.undo_fit_model = function (callback) {
  const request = {
    undo_latest_fit: true
  };

  this.fitModelService.callService(request, response => {
    this.force_update();

    const error_msg = response.error_msg;
    if (error_msg) {
      console.warn('fit model error:', error_msg);
      callback(error_msg);
    } else {
      callback(null);
    }
  }, err => {
    this.force_update();

    console.warn('fit model error:', err);
    callback(err);
  });
};

const navigate_types = {
  NAVIGATE_TO_PIXEL: 1,
  TURN_LEFT: 2,
  TURN_RIGHT: 3
};

EdMisc.prototype.navigate_to = function (x, y, snapshot_id) {
  this.navigateToService.callService({
    snapshot_id,
    navigation_type: navigate_types.NAVIGATE_TO_PIXEL,
    click_x_ratio: x,
    click_y_ratio: y
  }, result => {
    const error_msg = result.error_msg;
    if (error_msg) {
      console.warn(error_msg);
    }
  });
};

EdMisc.prototype.create_walls = function (callback) {
  callback = callback || _.noop;
  this.createWallsService.callService({}, () => {
    callback();
  });
};

export default EdMisc;
