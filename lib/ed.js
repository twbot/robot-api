'use strict';

var EventEmitter2 = require('eventemitter2').EventEmitter2;
var _ = require('lodash');

import EdSnapshots from './ed-snapshots';
import EdEntities from './ed-entities';

function Ed (robot) {
  EventEmitter2.apply(this);

  var ros = robot.ros;

  // Query meshes
  this.query_meshes_service = ros.Service({
    name: 'ed/gui/query_meshes',
    serviceType: 'ed_gui_server/QueryMeshes',
  });

  // World model database
  this.models = {};
  this.models_service = ros.Service({
    name: 'ed/gui/get_models',
    serviceType: 'ed_sensor_integration/GetModels',
  });
  // this.update_models();

  // World model fitting
  this.fit_model_service = ros.Service({
    name: 'ed/gui/fit_model',
    serviceType: 'ed_sensor_integration/FitModel',
  });

  this.navigate_to_service = ros.Service({
    name: 'ed/navigate_to',
    serviceType: 'ed_sensor_integration/NavigateTo',
  });

  this.create_walls_service = ros.Service({
    name: 'ed/create_walls',
    serviceType: 'std_srvs/Empty',
  });
}

Ed.prototype = Object.create(EventEmitter2.prototype);

/**
 * World model database
 */

Ed.prototype.update_models = function update_models () {
  var request = {};
  this.models_service.callService(request, function (response) {

    response.model_names.forEach(function (name, i) {
      var image_binary = response.model_images[i];

      var encoding = image_binary.encoding;
      image_binary.src = 'data:image/' + encoding + ';base64,' + image_binary.data;

      this.models[name] = image_binary;
    }.bind(this));

    this.emit('models', this.models);
  }.bind(this), function (msg) {
    console.warn('update_models failed:', msg);
    _.delay(update_models.bind(this), 5000);
  }.bind(this));
};

/**
 * World model fitting
 */
Ed.prototype.fit_model = function(model_name, image_id, click_x_ratio, click_y_ratio) {
  var request = {
    model_name: model_name,
    image_id: image_id,
    click_x_ratio: click_x_ratio,
    click_y_ratio: click_y_ratio,
  };

  this.fit_model_service.callService(request, function (response) {
    this.force_update();

    var error_msg = response.error_msg;
    if (error_msg) {
      console.warn('fit model error:', error_msg);
    }
  }.bind(this));
};

Ed.prototype.undo_fit_model = function(callback) {
  var request = {
    undo_latest_fit: true,
  };

  this.fit_model_service.callService(request, function (response) {
    this.force_update();

    var error_msg = response.error_msg;
    if (error_msg) {
      console.warn('fit model error:', error_msg);
      callback(error_msg);
    } else {
      callback(null);
    }
  }.bind(this), function (err) {
      this.force_update();

      console.warn('fit model error:', err);
      callback(err);
  }.bind(this));
};

var navigate_types = {
  NAVIGATE_TO_PIXEL: 1,
  TURN_LEFT        : 2,
  TURN_RIGHT       : 3,
};

Ed.prototype.navigate_to = function(x, y, snapshot_id) {
  this.navigate_to_service.callService({
    snapshot_id: snapshot_id,
    navigation_type: navigate_types.NAVIGATE_TO_PIXEL,
    click_x_ratio: x,
    click_y_ratio: y,
  }, function (result) {
    var error_msg = result.error_msg;
    if (error_msg) {
      console.warn(error_msg);
    }
  });
};

Ed.prototype.create_walls = function(callback) {
  callback = callback || _.noop;
  this.create_walls_service.callService({}, function (result) {
    callback();
  });
};

module.exports = Ed;
