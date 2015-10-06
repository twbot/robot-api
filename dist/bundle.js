(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.API = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
'use strict';

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _eventemitter2 = require('eventemitter2');

var _roslib = (typeof window !== "undefined" ? window['ROSLIB'] : typeof global !== "undefined" ? global['ROSLIB'] : null);

var Base = (function (_EventEmitter2) {
  _inherits(Base, _EventEmitter2);

  function Base(robot) {
    _classCallCheck(this, Base);

    _EventEmitter2.call(this);

    var ros = robot.ros;

    this.cmdVelTopic = ros.Topic({
      name: 'base/references',
      messageType: 'geometry_msgs/Twist'
    });

    this.localPlannerTopic = ros.Topic({
      name: 'local_planner/action_server/goal',
      messageType: 'cb_planner_msgs_srvs/LocalPlannerActionGoal'
    });
  }

  Base.prototype.sendTwist = function sendTwist(vx, vy, vth) {
    // publish the command
    var twist = new _roslib.Message({
      angular: {
        x: 0,
        y: 0,
        z: vth
      },
      linear: {
        x: vx,
        y: vy,
        z: 0
      }
    });
    this.cmdVelTopic.publish(twist);
    // console.log(this.cmdVelTopic);
    // console.log(twist);
    console.log('sendTwist: ' + vx + ', ' + vy + ', ' + vth);
  };

  Base.prototype.sendLocalPlannerGoal = function sendLocalPlannerGoal(plan, look_at_x, look_at_y) {
    // std_msgs/Header header
    //   uint32 seq
    //   time stamp
    //   string frame_id
    // actionlib_msgs/GoalID goal_id
    //   time stamp
    //   string id
    // cb_planner_msgs_srvs/LocalPlannerGoal goal
    //   geometry_msgs/PoseStamped[] plan
    //     std_msgs/Header header
    //       uint32 seq
    //       time stamp
    //       string frame_id
    //     geometry_msgs/Pose pose
    //       geometry_msgs/Point position
    //         float64 x
    //         float64 y
    //         float64 z
    //       geometry_msgs/Quaternion orientation
    //         float64 x
    //         float64 y
    //         float64 z
    //         float64 w
    //   cb_planner_msgs_srvs/OrientationConstraint orientation_constraint
    //     string frame
    //     geometry_msgs/Point look_at
    //       float64 x
    //       float64 y
    //       float64 z
    //     float64 angle_offset

    // publish the command
    var goal = new _roslib.Message({
      /* eslint camelcase:0 */
      goal: {
        plan: plan,
        orientation_constraint: {
          frame: '/map',
          look_at: {
            x: look_at_x,
            y: look_at_y
          }
        }
      }
    });
    this.localPlannerTopic.publish(goal);
    // console.log(this.cmdVelTopic);
    // console.log(twist);
    console.log('sendGoal to local planner: ' + goal);
  };

  return Base;
})(_eventemitter2.EventEmitter2);

exports['default'] = Base;
module.exports = exports['default'];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"eventemitter2":8}],2:[function(require,module,exports){
(function (global){
'use strict';

var EventEmitter2 = require('eventemitter2').EventEmitter2;
var _ = (typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);

var entities_topic_name = 'ed/gui/entities';

var query_meshes_service_name = 'ed/gui/query_meshes';

var snapshot_service_name = 'ed/gui/get_snapshots';

var models_service_name = 'ed/gui/get_models';

var fit_model_service_name = 'ed/gui/fit_model';

var make_snapshot_service_name = 'ed/make_snapshot';

var navigate_to_service_name = 'ed/navigate_to';

var create_walls_service_name = 'ed/create_walls';

function Ed(robot) {
  EventEmitter2.apply(this);

  var ros = robot.ros;

  // World model entities
  this.entities = [];
  this.meshes = {};
  this.entities_topic = ros.Topic({
    name: entities_topic_name,
    messageType: 'ed_gui_server/EntityInfos',
    throttle_rate: 5000
  });
  // this.entities_topic.subscribe(this.onEntities.bind(this));

  // Query meshes
  this.query_meshes_service = ros.Service({
    name: query_meshes_service_name,
    serviceType: 'ed_gui_server/QueryMeshes'
  });

  // World model snapshots
  this.snapshots = {};
  this.snapshot_revision = 0;
  this.snapshot_service = ros.Service({
    name: snapshot_service_name,
    serviceType: 'ed_sensor_integration/GetSnapshots'
  });

  this.delete_snapshot_queue = [];

  // timer_id to avoid updating while one is in progress
  // during an update, it will be null
  this.snapshots_timer_id = null;
  // this.start_update_loop();

  this.make_snapshot_service = ros.Service({
    name: make_snapshot_service_name,
    serviceType: 'ed_sensor_integration/MakeSnapshot'
  });

  // World model database
  this.models = {};
  this.models_service = ros.Service({
    name: models_service_name,
    serviceType: 'ed_sensor_integration/GetModels'
  });
  // this.update_models();

  // World model fitting
  this.fit_model_service = ros.Service({
    name: fit_model_service_name,
    serviceType: 'ed_sensor_integration/FitModel'
  });

  this.navigate_to_service = ros.Service({
    name: navigate_to_service_name,
    serviceType: 'ed_sensor_integration/NavigateTo'
  });

  this.create_walls_service = ros.Service({
    name: create_walls_service_name,
    serviceType: 'std_srvs/Empty'
  });
}

Ed.prototype = Object.create(EventEmitter2.prototype);

/**
 * World model entities
 */

Object.defineProperty(Ed.prototype, 'entities', {
  get: function get() {
    return this._entities;
  },
  set: function set(entities) {
    this._entities = entities;
    this.emit('entities', entities);
  }
});

Ed.prototype.onEntities = function (msg) {
  console.log(msg);
  this.entities = msg.entities;

  var mesh_queue = [];
  this.entities.forEach((function (entity) {
    if (this.meshes[entity.id] && this.meshes[entity.id].revision === entity.mesh_revision) {
      console.log('correct revision');
    } else {
      mesh_queue.push(entity.id);
    }
  }).bind(this));

  console.log(mesh_queue);
  var request = { entity_ids: mesh_queue };
  this.query_meshes_service.callService(request, (function (response) {
    var error_msg = response.error_msg;
    if (error_msg) {
      console.warn('query_meshes_service:', error_msg);
    }

    response.entity_ids.forEach((function (id, i) {
      // TODO: check revisions
      this.meshes[id] = response.meshes[i];
    }).bind(this));
  }).bind(this));
};

/**
 * World model snapshots
 */

Ed.prototype.update_snapshots = function (callback, max_num_revisions) {
  callback = callback || _.noop;
  max_num_revisions = max_num_revisions || 0;

  var request = {
    revision: this.snapshot_revision,
    delete_ids: this.delete_snapshot_queue,
    max_num_revisions: max_num_revisions
  };
  if (this.delete_snapshot_queue.length) {
    console.log('deleting snapshots:', this.delete_snapshot_queue);
    this.snapshots = _.omit(this.snapshots, this.delete_snapshot_queue);
    this.delete_snapshot_queue = [];
  }

  var start_time = new Date();

  // console.debug('update %d snapshots', max_num_revisions);
  this.snapshot_service.callService(request, (function (response) {
    var diff = new Date() - start_time;
    this.emit('update_time', diff);
    if (!response.new_revision && _.size(this.snapshots) || // revision 0 && old snapshots
    response.new_revision < this.snapshot_revision) {
      console.warn('ed restart detected, reloading...');
      this.snapshots = {}; // clear snapshots
      this.update_models(); // reload model db
    }
    this.snapshot_revision = response.new_revision;

    var snapshots = process_snapshots(response);
    _.assign(this.snapshots, snapshots);

    this.emit('snapshots', this.snapshots);

    callback(null, snapshots);
  }).bind(this), (function (err) {
    console.warn('update_snapshots failed:', err);
    callback(err, null);
  }).bind(this));
};

function process_snapshots(response) {
  var snapshots = {};

  response.image_ids.forEach((function (id, i) {
    var image_binary = response.images[i];

    var encoding = image_binary.encoding;
    image_binary.src = 'data:image/' + encoding + ';base64,' + image_binary.data;
    image_binary.short_id = _.trunc(id, {
      'length': 8,
      'omission': ''
    });
    image_binary.id = id;

    var ts = response.image_timestamps[i];
    image_binary.timestamp = new Date(ts.secs + ts.nsecs * 1e-9);

    snapshots[id] = image_binary;
  }).bind(this));

  return snapshots;
}

Ed.prototype.delete_snapshot = function (id) {
  this.delete_snapshot_queue.push(id);
  this.force_update();
};

Ed.prototype.start_update_loop = function () {
  this.snapshots_timer_id = null;
  this.update_snapshots((function update_again(err, new_snapshots) {
    // console.debug('i got %d new snapshots', _.size(new_snapshots));

    var delay = 500;
    if (err) {
      delay = 5000;
    } else if (_.size(_.omit(new_snapshots, 'current'))) {
      delay = 0;
    }

    this.snapshots_timer_id = _.delay((function (callback) {
      this.snapshots_timer_id = null;
      this.update_snapshots(callback);
    }).bind(this), delay, update_again.bind(this));
  }).bind(this), 1);
};

Ed.prototype.force_update = function () {
  if (this.snapshots_timer_id) {
    console.log('force update');
    window.clearTimeout(this.snapshots_timer_id);
    this.snapshots_timer_id = null;
    this.start_update_loop();
  } else {
    // else an update is already in progress
    console.log('update is already in progress');
  }
};

Ed.prototype.make_snapshot = function (callback) {
  this.make_snapshot_service.callService(null, callback);
  this.force_update();
};

/**
 * World model database
 */

Ed.prototype.update_models = function update_models() {
  var request = {};
  this.models_service.callService(request, (function (response) {

    response.model_names.forEach((function (name, i) {
      var image_binary = response.model_images[i];

      var encoding = image_binary.encoding;
      image_binary.src = 'data:image/' + encoding + ';base64,' + image_binary.data;

      this.models[name] = image_binary;
    }).bind(this));

    this.emit('models', this.models);
  }).bind(this), (function (msg) {
    console.warn('update_models failed:', msg);
    _.delay(update_models.bind(this), 5000);
  }).bind(this));
};

/**
 * World model fitting
 */
Ed.prototype.fit_model = function (model_name, image_id, click_x_ratio, click_y_ratio) {
  var request = {
    model_name: model_name,
    image_id: image_id,
    click_x_ratio: click_x_ratio,
    click_y_ratio: click_y_ratio
  };

  this.fit_model_service.callService(request, (function (response) {
    this.force_update();

    var error_msg = response.error_msg;
    if (error_msg) {
      console.warn('fit model error:', error_msg);
    }
  }).bind(this));
};

Ed.prototype.undo_fit_model = function (callback) {
  var request = {
    undo_latest_fit: true
  };

  this.fit_model_service.callService(request, (function (response) {
    this.force_update();

    var error_msg = response.error_msg;
    if (error_msg) {
      console.warn('fit model error:', error_msg);
      callback(error_msg);
    } else {
      callback(null);
    }
  }).bind(this), (function (err) {
    this.force_update();

    console.warn('fit model error:', err);
    callback(err);
  }).bind(this));
};

var navigate_types = {
  NAVIGATE_TO_PIXEL: 1,
  TURN_LEFT: 2,
  TURN_RIGHT: 3
};

Ed.prototype.navigate_to = function (x, y, snapshot_id) {
  this.navigate_to_service.callService({
    snapshot_id: snapshot_id,
    navigation_type: navigate_types.NAVIGATE_TO_PIXEL,
    click_x_ratio: x,
    click_y_ratio: y
  }, function (result) {
    var error_msg = result.error_msg;
    if (error_msg) {
      console.warn(error_msg);
    }
  });
};

Ed.prototype.create_walls = function (callback) {
  callback = callback || _.noop;
  this.create_walls_service.callService({}, function (result) {
    callback();
  });
};

module.exports = Ed;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"eventemitter2":8}],3:[function(require,module,exports){
(function (global){
/* eslint key-spacing: 0 */
/* eslint no-multi-spaces: 0 */

'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _lodash = (typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);

var _lodash2 = _interopRequireDefault(_lodash);

/*
|   Name  | Homeable | HomeableMandatory | Resetable |
|---------|----------|-------------------|-----------|
| Base    | no       | no                | yes       |
| Spindle | yes      | yes               | yes       |
| Arm     | yes      | no                | yes       |
| Head    | no       | no                | no        |
*/

// transform the array of bools to an object
var properties = _lodash2['default'].mapValues({
  /* eslint camelcase:0 */
  // Name     | Homeable |  HomeableMandatory | Resetable
  all: [true, false, true],
  base: [false, false, true],
  spindle: [true, true, true],
  left_arm: [true, false, true],
  right_arm: [true, false, true],
  head: [false, false, false]
}, function (v) {
  return {
    homeable: v[0],
    homeable_mandatory: v[1],
    resetable: v[2]
  };
});

exports['default'] = properties;
module.exports = exports['default'];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],4:[function(require,module,exports){
(function (global){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _eventemitter2 = require('eventemitter2');

var _lodash = (typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);

var _lodash2 = _interopRequireDefault(_lodash);

var _roslib = (typeof window !== "undefined" ? window['ROSLIB'] : typeof global !== "undefined" ? global['ROSLIB'] : null);

// Hardware constants

var levels = {
  STALE: 0,
  IDLE: 1,
  OPERATIONAL: 2,
  HOMING: 3,
  ERROR: 4
};

// Robot specific Hardware constants that should come from the parameter server
var properties = require('./hardware-properties');

// define how the actions map to hardware commands
var commands = {
  home: 21,
  start: 22,
  stop: 23,
  reset: 24
};

var hardwareIds = {
  /* eslint camelcase:0 */
  all: 0,
  base: 1,
  spindle: 2,
  left_arm: 3,
  right_arm: 4,
  head: 5
};

var defaultStatus = _lodash2['default'].mapValues(hardwareIds, function (value, name) {
  return {
    name: name,
    level: levels.STALE,
    homed: false
  };
});

// hardware timeouts in ms
var HARDWARE_TIMEOUT = 2000;
var BATTERY_TIMEOUT = 2000;
var EBUTTONS_TIMEOUT = 2000;

/**
 * Hardware module
 * @param {Robot} robot A valid robot object
 */

var Hardware = (function (_EventEmitter2) {
  _inherits(Hardware, _EventEmitter2);

  _createClass(Hardware, null, [{
    key: 'levels',
    value: levels,
    enumerable: true
  }]);

  function Hardware(robot) {
    _classCallCheck(this, Hardware);

    _EventEmitter2.call(this);
    this._status = defaultStatus;
    this._resetHardwareLater = _lodash2['default'].debounce(this._resetHardware, HARDWARE_TIMEOUT);
    this._battery = null;
    this._resetBatteryLater = _lodash2['default'].debounce(this._resetBattery, BATTERY_TIMEOUT);
    this._ebuttons = null;
    this._resetEbuttonsLater = _lodash2['default'].debounce(this._resetEbuttons, EBUTTONS_TIMEOUT);
    var ros = robot.ros;

    // hardware status init
    var statusTopic = ros.Topic({
      name: 'hardware_status',
      messageType: 'diagnostic_msgs/DiagnosticArray',
      throttle_rate: 500
    });
    statusTopic.subscribe(this._onStatus.bind(this));

    this._commandTopic = ros.Topic({
      name: 'dashboard_ctrlcmds',
      messageType: 'std_msgs/UInt8MultiArray'
    });

    // battery status init
    var batteryTopic = ros.Topic({
      name: 'battery_percentage',
      messageType: 'std_msgs/Float32',
      throttle_rate: 200
    });
    batteryTopic.subscribe(this._onBattery.bind(this));

    // ebutton status init
    var ebuttonTopic = ros.Topic({
      name: 'ebutton_status',
      messageType: 'diagnostic_msgs/DiagnosticArray',
      throttle_rate: 200
    });
    ebuttonTopic.subscribe(this._onEbuttons.bind(this));
  }

  /**
   * Private functions
   */

  // convert an incoming status message to actual workable properties

  /**
   * Public status API
   */

  Hardware.prototype._onStatus = function _onStatus(msg) {
    this.status = diagnosticMsgToStatus(msg);
    this._resetHardwareLater();
  };

  Hardware.prototype._resetHardware = function _resetHardware() {
    console.log('hardware message timeout');
    this.status = defaultStatus;
  };

  /**
   * Send a command to the partware
   *
   * example:
   * > hardware.send_command('head', 'start')
   */

  Hardware.prototype.send_command = function send_command(part, command) {
    var i1 = hardwareIds[part];
    var i2 = commands[command];
    console.log('hardware command: %s %s (%i, %i)', command, part, i1, i2);

    var cmd = new _roslib.Message({
      data: [i1, i2]
    });

    this._commandTopic.publish(cmd);
  };

  /**
   * Public battery API
   */

  /**
   * @param {Object} msg - ROS std_msgs/Float32 message
   */

  Hardware.prototype._onBattery = function _onBattery(msg) {
    var percent = msg.data;
    this.battery = percent;
    this._resetBatteryLater();
  };

  Hardware.prototype._resetBattery = function _resetBattery() {
    console.log('battery message timeout');
    this.battery = null;
  };

  /**
   * Public ebutton status API
   */

  Hardware.prototype._onEbuttons = function _onEbuttons(msg) {
    var status = _lodash2['default'].map(msg.status, function (status) {
      return _lodash2['default'].pick(status, ['name', 'level']);
    });

    this.ebuttons = status;
    this._resetEbuttonsLater();
  };

  Hardware.prototype._resetEbuttons = function _resetEbuttons() {
    console.log('ebuttons message timeout');
    this.ebuttons = null;
  };

  _createClass(Hardware, [{
    key: 'status',
    get: function get() {
      return this._status;
    },
    set: function set(value) {
      this._status = value;
      this.emit('status', value);
    }
  }, {
    key: 'battery',
    get: function get() {
      return this._battery;
    },
    set: function set(value) {
      this._battery = value;
      this.emit('battery', value);
    }
  }, {
    key: 'ebuttons',
    get: function get() {
      return this._ebuttons;
    },
    set: function set(value) {
      this._ebuttons = value;
      this.emit('ebuttons', value);
    }
  }]);

  return Hardware;
})(_eventemitter2.EventEmitter2);

function diagnosticMsgToStatus(msg) {
  var parts = msg.status.map(function (part) {
    return {
      name: part.name,
      level: part.level,
      homed: part.message === 'homed'
    };
  });
  var hardware_status = _lodash2['default'].indexBy(parts, 'name');

  // fill all missing hardware parts with 'idle'
  _lodash2['default'].defaults(hardware_status, defaultStatus);

  _lodash2['default'].mapValues(hardware_status, function (part) {
    part.actions = getActions(part);
    return part;
  });

  return hardware_status;
}

// return all possible actions for a hardware part
function getActions(part) {
  var props = properties[part.name];
  if (!props) {
    return null;
  }

  var level = part ? part.level : -1;
  var homed = part ? part.homed : false;

  var actions = {};

  // only show the home action if homeable
  if (props.homeable) {
    actions.home = {
      enabled: level === levels.IDLE,
      warning: homed ? 'This part was already homed, Are you sure you want to redo homing?' : false
    };
  }

  // always show start action
  actions.start = {
    enabled: level === levels.IDLE && (homed || !props.homeable_mandatory),
    warning: props.homeable && !homed ? 'This part is not yet homed, Are you sure you want to proceed?' : false
  };

  // always show stop action
  actions.stop = {
    enabled: level === levels.HOMING || level === levels.OPERATIONAL
  };

  // only show reset action if resetable
  if (props.resetable) {
    actions.reset = {
      enabled: level === levels.ERROR
    };
  }

  return actions;
}

module.exports = Hardware;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./hardware-properties":3,"eventemitter2":8}],5:[function(require,module,exports){
(function (global){
'use strict';

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _eventemitter2 = require('eventemitter2');

var _roslib = (typeof window !== "undefined" ? window['ROSLIB'] : typeof global !== "undefined" ? global['ROSLIB'] : null);

var Head = (function (_EventEmitter2) {
  _inherits(Head, _EventEmitter2);

  function Head() {
    _classCallCheck(this, Head);

    _EventEmitter2.call(this);

    this.goal = null;
    // this.head_ac = ros.ActionClient({
    //   serverName: 'head_ref/action_server',
    //   actionName: 'head_ref/HeadReferenceAction',
    // });
  }

  Head.prototype.sendGoal = function sendGoal() {
    this.goal = new _roslib.Goal({
      /* eslint camelcase:0 */
      actionClient: this.head_ac,
      goalMessage: {
        // either LOOKAT or PAN_TILT
        goal_type: null,

        // [1-255] (action client calls with the same priority cancel each other)
        priority: 1,

        pan_vel: null,
        tilt_vel: null,

        // in case of LOOKAT:
        target_point: null,

        // in case of PAN_TILT
        pan: null,
        tilt: null,

        // goal cancels automatically after this time (seconds), if 0, no auto cancel
        end_time: null
      }
    });

    this.goal.on('feedback', function (feedback) {
      console.log('Feedback:', feedback);
    });
    this.goal.on('result', function (result) {
      console.log('Result:', result);
    });
  };

  return Head;
})(_eventemitter2.EventEmitter2);

exports['default'] = Head;
module.exports = exports['default'];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"eventemitter2":8}],6:[function(require,module,exports){
'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _base = require('./base');

var _base2 = _interopRequireDefault(_base);

var _ed = require('./ed');

var _ed2 = _interopRequireDefault(_ed);

var _hardware = require('./hardware');

var _hardware2 = _interopRequireDefault(_hardware);

var _head = require('./head');

var _head2 = _interopRequireDefault(_head);

var _robot = require('./robot');

var _robot2 = _interopRequireDefault(_robot);

exports.Base = _base2['default'];
exports.Ed = _ed2['default'];
exports.Hardware = _hardware2['default'];
exports.Head = _head2['default'];
exports.Robot = _robot2['default'];

},{"./base":1,"./ed":2,"./hardware":4,"./head":5,"./robot":7}],7:[function(require,module,exports){
(function (global){
'use strict';

exports.__esModule = true;

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _eventemitter2 = require('eventemitter2');

var _roslib = (typeof window !== "undefined" ? window['ROSLIB'] : typeof global !== "undefined" ? global['ROSLIB'] : null);

var _os = require('os');

var _ed = require('./ed');

var _ed2 = _interopRequireDefault(_ed);

var _hardware = require('./hardware');

var _hardware2 = _interopRequireDefault(_hardware);

var _head = require('./head');

var _head2 = _interopRequireDefault(_head);

var _base = require('./base');

var _base2 = _interopRequireDefault(_base);

// Private variables
var host = _os.hostname() || 'localhost';
var defaultUrl = 'ws://' + host + ':9090';

// reconnect timeout in ms
var RECONNECT_TIMEOUT = 5000;

// Robot constructor

var Robot = (function (_EventEmitter2) {
  _inherits(Robot, _EventEmitter2);

  function Robot() {
    _classCallCheck(this, Robot);

    // parent constructor
    // EventEmitter2.apply(this);
    _EventEmitter2.call(this);

    this.ros = new _roslib.Ros();

    this.ros.on('connection', this.onConnection.bind(this));
    this.ros.on('close', this.onClose.bind(this));
    this.ros.on('error', this.onError.bind(this));

    // reconnect behavior
    this.on('status', function (status) {
      switch (status) {
        case 'closed':
          setTimeout(this.connect.bind(this), RECONNECT_TIMEOUT);
          break;
        default:
          break;
      }
    });

    this.ed = new _ed2['default'](this);
    this.hardware = new _hardware2['default'](this);
    this.head = new _head2['default'](this);
    this.base = new _base2['default'](this);
  }

  // module.exports = Robot;

  /**
   * Connect to rosbridge
   *
   * If an url is provided, it will connect to that one. Else it will
   * use the previous url. Uses a url based on the hostname if no urls
   * are provided.
   */

  Robot.prototype.connect = function connect(url) {
    this.url = url || this.url || defaultUrl;

    console.log('connecting to ' + this.url);
    this.ros.connect(this.url);
    this.status = 'connecting';
  };

  // ros status event handling

  Robot.prototype.onConnection = function onConnection() {
    console.log('connection');
    this.status = 'connected';
  };

  Robot.prototype.onClose = function onClose() {
    console.log('connection closed');
    this.status = 'closed';
  };

  Robot.prototype.onError = function onError() {
    // console.log('connection error');
    this.status = 'error';
  };

  _createClass(Robot, [{
    key: 'status',
    get: function get() {
      return this._status;
    },
    set: function set(value) {
      this._status = value;
      this.emit('status', value);
    }
  }]);

  return Robot;
})(_eventemitter2.EventEmitter2);

exports['default'] = Robot;
module.exports = exports['default'];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./base":1,"./ed":2,"./hardware":4,"./head":5,"eventemitter2":8,"os":9}],8:[function(require,module,exports){
(function (global){
'use strict';

module.exports = {
  EventEmitter2: global.EventEmitter2
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],9:[function(require,module,exports){
exports.endianness = function () { return 'LE' };

exports.hostname = function () {
    if (typeof location !== 'undefined') {
        return location.hostname
    }
    else return '';
};

exports.loadavg = function () { return [] };

exports.uptime = function () { return 0 };

exports.freemem = function () {
    return Number.MAX_VALUE;
};

exports.totalmem = function () {
    return Number.MAX_VALUE;
};

exports.cpus = function () { return [] };

exports.type = function () { return 'Browser' };

exports.release = function () {
    if (typeof navigator !== 'undefined') {
        return navigator.appVersion;
    }
    return '';
};

exports.networkInterfaces
= exports.getNetworkInterfaces
= function () { return {} };

exports.arch = function () { return 'javascript' };

exports.platform = function () { return 'browser' };

exports.tmpdir = exports.tmpDir = function () {
    return '/tmp';
};

exports.EOL = '\n';

},{}]},{},[6])(6)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvYmFzZS5qcyIsImxpYi9lZC5qcyIsImxpYi9oYXJkd2FyZS1wcm9wZXJ0aWVzLmpzIiwibGliL2hhcmR3YXJlLmpzIiwibGliL2hlYWQuanMiLCJsaWIvaW5kZXguanMiLCJsaWIvcm9ib3QuanMiLCJsaWIvc2hpbXMvZXZlbnRlbWl0dGVyMi5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9vcy1icm93c2VyaWZ5L2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7NkJDQTRCLGVBQWU7O3NCQUNyQixRQUFROztJQUV4QixJQUFJO1lBQUosSUFBSTs7QUFDRyxXQURQLElBQUksQ0FDSSxLQUFLLEVBQUU7MEJBRGYsSUFBSTs7QUFFTiw2QkFBTyxDQUFDOztBQUVSLFFBQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUM7O0FBRXRCLFFBQUksQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztBQUMzQixVQUFJLEVBQUUsaUJBQWlCO0FBQ3ZCLGlCQUFXLEVBQUUscUJBQXFCO0tBQ25DLENBQUMsQ0FBQzs7QUFFSCxRQUFJLENBQUMsaUJBQWlCLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztBQUNqQyxVQUFJLEVBQUUsa0NBQWtDO0FBQ3hDLGlCQUFXLEVBQUUsNkNBQTZDO0tBQzNELENBQUMsQ0FBQztHQUNKOztBQWZHLE1BQUksV0FpQlIsU0FBUyxHQUFBLG1CQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFOztBQUVyQixRQUFNLEtBQUssR0FBRyxvQkFBWTtBQUN4QixhQUFPLEVBQUU7QUFDUCxTQUFDLEVBQUUsQ0FBQztBQUNKLFNBQUMsRUFBRSxDQUFDO0FBQ0osU0FBQyxFQUFFLEdBQUc7T0FDUDtBQUNELFlBQU0sRUFBRTtBQUNO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QUc7O0FBRVIsUUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUM7R0FDdkI7O2VBcEVHLEtBQUs7O1NBOEJDLGVBQUc7QUFDWCxhQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7S0FDckI7U0FFUyxhQUFDLEtBQUssRUFBRTtBQUNoQixVQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztBQUNyQixVQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztLQUM1Qjs7O1NBckNHLEtBQUs7OztxQkF3RUksS0FBSzs7Ozs7OztBQ3pGcEIsWUFBWSxDQUFDOztBQUViLE1BQU0sQ0FBQyxPQUFPLEdBQUc7QUFDZixlQUFhLEVBQUUsTUFBTSxDQUFDLGFBQWE7Q0FDcEMsQ0FBQzs7Ozs7QUNKRjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJpbXBvcnQge0V2ZW50RW1pdHRlcjJ9IGZyb20gJ2V2ZW50ZW1pdHRlcjInO1xuaW1wb3J0IHtNZXNzYWdlfSBmcm9tICdyb3NsaWInO1xuXG5jbGFzcyBCYXNlIGV4dGVuZHMgRXZlbnRFbWl0dGVyMiB7XG4gIGNvbnN0cnVjdG9yKHJvYm90KSB7XG4gICAgc3VwZXIoKTtcblxuICAgIGNvbnN0IHJvcyA9IHJvYm90LnJvcztcblxuICAgIHRoaXMuY21kVmVsVG9waWMgPSByb3MuVG9waWMoe1xuICAgICAgbmFtZTogJ2Jhc2UvcmVmZXJlbmNlcycsXG4gICAgICBtZXNzYWdlVHlwZTogJ2dlb21ldHJ5X21zZ3MvVHdpc3QnXG4gICAgfSk7XG5cbiAgICB0aGlzLmxvY2FsUGxhbm5lclRvcGljID0gcm9zLlRvcGljKHtcbiAgICAgIG5hbWU6ICdsb2NhbF9wbGFubmVyL2FjdGlvbl9zZXJ2ZXIvZ29hbCcsXG4gICAgICBtZXNzYWdlVHlwZTogJ2NiX3BsYW5uZXJfbXNnc19zcnZzL0xvY2FsUGxhbm5lckFjdGlvbkdvYWwnXG4gICAgfSk7XG4gIH1cblxuICBzZW5kVHdpc3QodngsIHZ5LCB2dGgpIHtcbiAgICAvLyBwdWJsaXNoIHRoZSBjb21tYW5kXG4gICAgY29uc3QgdHdpc3QgPSBuZXcgTWVzc2FnZSh7XG4gICAgICBhbmd1bGFyOiB7XG4gICAgICAgIHg6IDAsXG4gICAgICAgIHk6IDAsXG4gICAgICAgIHo6IHZ0aFxuICAgICAgfSxcbiAgICAgIGxpbmVhcjoge1xuICAgICAgICB4OiB2eCxcbiAgICAgICAgeTogdnksXG4gICAgICAgIHo6IDBcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLmNtZFZlbFRvcGljLnB1Ymxpc2godHdpc3QpO1xuICAgIC8vIGNvbnNvbGUubG9nKHRoaXMuY21kVmVsVG9waWMpO1xuICAgIC8vIGNvbnNvbGUubG9nKHR3aXN0KTtcbiAgICBjb25zb2xlLmxvZyhgc2VuZFR3aXN0OiAke3Z4fSwgJHt2eX0sICR7dnRofWApO1xuICB9XG5cbiAgc2VuZExvY2FsUGxhbm5lckdvYWwocGxhbiwgbG9va19hdF94LCBsb29rX2F0X3kpIHtcbiAgICAvLyBzdGRfbXNncy9IZWFkZXIgaGVhZGVyXG4gICAgLy8gICB1aW50MzIgc2VxXG4gICAgLy8gICB0aW1lIHN0YW1wXG4gICAgLy8gICBzdHJpbmcgZnJhbWVfaWRcbiAgICAvLyBhY3Rpb25saWJfbXNncy9Hb2FsSUQgZ29hbF9pZFxuICAgIC8vICAgdGltZSBzdGFtcFxuICAgIC8vICAgc3RyaW5nIGlkXG4gICAgLy8gY2JfcGxhbm5lcl9tc2dzX3NydnMvTG9jYWxQbGFubmVyR29hbCBnb2FsXG4gICAgLy8gICBnZW9tZXRyeV9tc2dzL1Bvc2VTdGFtcGVkW10gcGxhblxuICAgIC8vICAgICBzdGRfbXNncy9IZWFkZXIgaGVhZGVyXG4gICAgLy8gICAgICAgdWludDMyIHNlcVxuICAgIC8vICAgICAgIHRpbWUgc3RhbXBcbiAgICAvLyAgICAgICBzdHJpbmcgZnJhbWVfaWRcbiAgICAvLyAgICAgZ2VvbWV0cnlfbXNncy9Qb3NlIHBvc2VcbiAgICAvLyAgICAgICBnZW9tZXRyeV9tc2dzL1BvaW50IHBvc2l0aW9uXG4gICAgLy8gICAgICAgICBmbG9hdDY0IHhcbiAgICAvLyAgICAgICAgIGZsb2F0NjQgeVxuICAgIC8vICAgICAgICAgZmxvYXQ2NCB6XG4gICAgLy8gICAgICAgZ2VvbWV0cnlfbXNncy9RdWF0ZXJuaW9uIG9yaWVudGF0aW9uXG4gICAgLy8gICAgICAgICBmbG9hdDY0IHhcbiAgICAvLyAgICAgICAgIGZsb2F0NjQgeVxuICAgIC8vICAgICAgICAgZmxvYXQ2NCB6XG4gICAgLy8gICAgICAgICBmbG9hdDY0IHdcbiAgICAvLyAgIGNiX3BsYW5uZXJfbXNnc19zcnZzL09yaWVudGF0aW9uQ29uc3RyYWludCBvcmllbnRhdGlvbl9jb25zdHJhaW50XG4gICAgLy8gICAgIHN0cmluZyBmcmFtZVxuICAgIC8vICAgICBnZW9tZXRyeV9tc2dzL1BvaW50IGxvb2tfYXRcbiAgICAvLyAgICAgICBmbG9hdDY0IHhcbiAgICAvLyAgICAgICBmbG9hdDY0IHlcbiAgICAvLyAgICAgICBmbG9hdDY0IHpcbiAgICAvLyAgICAgZmxvYXQ2NCBhbmdsZV9vZmZzZXRcblxuICAgIC8vIHB1Ymxpc2ggdGhlIGNvbW1hbmRcbiAgICBjb25zdCBnb2FsID0gbmV3IE1lc3NhZ2Uoe1xuICAgICAgLyogZXNsaW50IGNhbWVsY2FzZTowICovXG4gICAgICBnb2FsOiB7XG4gICAgICAgIHBsYW4sXG4gICAgICAgIG9yaWVudGF0aW9uX2NvbnN0cmFpbnQ6IHtcbiAgICAgICAgICBmcmFtZTogJy9tYXAnLFxuICAgICAgICAgIGxvb2tfYXQ6IHtcbiAgICAgICAgICAgIHg6IGxvb2tfYXRfeCxcbiAgICAgICAgICAgIHk6IGxvb2tfYXRfeVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMubG9jYWxQbGFubmVyVG9waWMucHVibGlzaChnb2FsKTtcbiAgICAvLyBjb25zb2xlLmxvZyh0aGlzLmNtZFZlbFRvcGljKTtcbiAgICAvLyBjb25zb2xlLmxvZyh0d2lzdCk7XG4gICAgY29uc29sZS5sb2coYHNlbmRHb2FsIHRvIGxvY2FsIHBsYW5uZXI6ICR7Z29hbH1gKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBCYXNlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRXZlbnRFbWl0dGVyMiA9IHJlcXVpcmUoJ2V2ZW50ZW1pdHRlcjInKS5FdmVudEVtaXR0ZXIyO1xudmFyIF8gPSByZXF1aXJlKCdsb2Rhc2gnKTtcblxudmFyIGVudGl0aWVzX3RvcGljX25hbWUgPSAnZWQvZ3VpL2VudGl0aWVzJztcblxudmFyIHF1ZXJ5X21lc2hlc19zZXJ2aWNlX25hbWUgPSAnZWQvZ3VpL3F1ZXJ5X21lc2hlcyc7XG5cbnZhciBzbmFwc2hvdF9zZXJ2aWNlX25hbWUgPSAnZWQvZ3VpL2dldF9zbmFwc2hvdHMnO1xuXG52YXIgbW9kZWxzX3NlcnZpY2VfbmFtZSA9J2VkL2d1aS9nZXRfbW9kZWxzJztcblxudmFyIGZpdF9tb2RlbF9zZXJ2aWNlX25hbWUgPSAnZWQvZ3VpL2ZpdF9tb2RlbCc7XG5cbnZhciBtYWtlX3NuYXBzaG90X3NlcnZpY2VfbmFtZSA9ICdlZC9tYWtlX3NuYXBzaG90JztcblxudmFyIG5hdmlnYXRlX3RvX3NlcnZpY2VfbmFtZSA9ICdlZC9uYXZpZ2F0ZV90byc7XG5cbnZhciBjcmVhdGVfd2FsbHNfc2VydmljZV9uYW1lID0gJ2VkL2NyZWF0ZV93YWxscyc7XG5cbmZ1bmN0aW9uIEVkIChyb2JvdCkge1xuICBFdmVudEVtaXR0ZXIyLmFwcGx5KHRoaXMpO1xuXG4gIHZhciByb3MgPSByb2JvdC5yb3M7XG5cbiAgLy8gV29ybGQgbW9kZWwgZW50aXRpZXNcbiAgdGhpcy5lbnRpdGllcyA9IFtdO1xuICB0aGlzLm1lc2hlcyA9IHt9O1xuICB0aGlzLmVudGl0aWVzX3RvcGljID0gcm9zLlRvcGljKHtcbiAgICBuYW1lOiBlbnRpdGllc190b3BpY19uYW1lLFxuICAgIG1lc3NhZ2VUeXBlOiAnZWRfZ3VpX3NlcnZlci9FbnRpdHlJbmZvcycsXG4gICAgdGhyb3R0bGVfcmF0ZTogNTAwMCxcbiAgfSk7XG4gIC8vIHRoaXMuZW50aXRpZXNfdG9waWMuc3Vic2NyaWJlKHRoaXMub25FbnRpdGllcy5iaW5kKHRoaXMpKTtcblxuICAvLyBRdWVyeSBtZXNoZXNcbiAgdGhpcy5xdWVyeV9tZXNoZXNfc2VydmljZSA9IHJvcy5TZXJ2aWNlKHtcbiAgICBuYW1lOiBxdWVyeV9tZXNoZXNfc2VydmljZV9uYW1lLFxuICAgIHNlcnZpY2VUeXBlOiAnZWRfZ3VpX3NlcnZlci9RdWVyeU1lc2hlcycsXG4gIH0pO1xuXG4gIC8vIFdvcmxkIG1vZGVsIHNuYXBzaG90c1xuICB0aGlzLnNuYXBzaG90cyA9IHt9O1xuICB0aGlzLnNuYXBzaG90X3JldmlzaW9uID0gMDtcbiAgdGhpcy5zbmFwc2hvdF9zZXJ2aWNlID0gcm9zLlNlcnZpY2Uoe1xuICAgIG5hbWU6IHNuYXBzaG90X3NlcnZpY2VfbmFtZSxcbiAgICBzZXJ2aWNlVHlwZTogJ2VkX3NlbnNvcl9pbnRlZ3JhdGlvbi9HZXRTbmFwc2hvdHMnLFxuICB9KTtcblxuICB0aGlzLmRlbGV0ZV9zbmFwc2hvdF9xdWV1ZSA9IFtdO1xuXG4gIC8vIHRpbWVyX2lkIHRvIGF2b2lkIHVwZGF0aW5nIHdoaWxlIG9uZSBpcyBpbiBwcm9ncmVzc1xuICAvLyBkdXJpbmcgYW4gdXBkYXRlLCBpdCB3aWxsIGJlIG51bGxcbiAgdGhpcy5zbmFwc2hvdHNfdGltZXJfaWQgPSBudWxsO1xuICAvLyB0aGlzLnN0YXJ0X3VwZGF0ZV9sb29wKCk7XG5cbiAgdGhpcy5tYWtlX3NuYXBzaG90X3NlcnZpY2UgPSByb3MuU2VydmljZSh7XG4gICAgbmFtZTogbWFrZV9zbmFwc2hvdF9zZXJ2aWNlX25hbWUsXG4gICAgc2VydmljZVR5cGU6ICdlZF9zZW5zb3JfaW50ZWdyYXRpb24vTWFrZVNuYXBzaG90JyxcbiAgfSk7XG5cbiAgLy8gV29ybGQgbW9kZWwgZGF0YWJhc2VcbiAgdGhpcy5tb2RlbHMgPSB7fTtcbiAgdGhpcy5tb2RlbHNfc2VydmljZSA9IHJvcy5TZXJ2aWNlKHtcbiAgICBuYW1lOiBtb2RlbHNfc2VydmljZV9uYW1lLFxuICAgIHNlcnZpY2VUeXBlOiAnZWRfc2Vuc29yX2ludGVncmF0aW9uL0dldE1vZGVscycsXG4gIH0pO1xuICAvLyB0aGlzLnVwZGF0ZV9tb2RlbHMoKTtcblxuICAvLyBXb3JsZCBtb2RlbCBmaXR0aW5nXG4gIHRoaXMuZml0X21vZGVsX3NlcnZpY2UgPSByb3MuU2VydmljZSh7XG4gICAgbmFtZTogZml0X21vZGVsX3NlcnZpY2VfbmFtZSxcbiAgICBzZXJ2aWNlVHlwZTogJ2VkX3NlbnNvcl9pbnRlZ3JhdGlvbi9GaXRNb2RlbCcsXG4gIH0pO1xuXG4gIHRoaXMubmF2aWdhdGVfdG9fc2VydmljZSA9IHJvcy5TZXJ2aWNlKHtcbiAgICBuYW1lOiBuYXZpZ2F0ZV90b19zZXJ2aWNlX25hbWUsXG4gICAgc2VydmljZVR5cGU6ICdlZF9zZW5zb3JfaW50ZWdyYXRpb24vTmF2aWdhdGVUbycsXG4gIH0pO1xuXG4gIHRoaXMuY3JlYXRlX3dhbGxzX3NlcnZpY2UgPSByb3MuU2VydmljZSh7XG4gICAgbmFtZTogY3JlYXRlX3dhbGxzX3NlcnZpY2VfbmFtZSxcbiAgICBzZXJ2aWNlVHlwZTogJ3N0ZF9zcnZzL0VtcHR5JyxcbiAgfSk7XG59XG5cbkVkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnRFbWl0dGVyMi5wcm90b3R5cGUpO1xuXG4vKipcbiAqIFdvcmxkIG1vZGVsIGVudGl0aWVzXG4gKi9cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEVkLnByb3RvdHlwZSwgJ2VudGl0aWVzJywge1xuICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9lbnRpdGllcztcbiAgfSxcbiAgc2V0OiBmdW5jdGlvbihlbnRpdGllcykge1xuICAgIHRoaXMuX2VudGl0aWVzID0gZW50aXRpZXM7XG4gICAgdGhpcy5lbWl0KCdlbnRpdGllcycsIGVudGl0aWVzKTtcbiAgfVxufSk7XG5cbkVkLnByb3RvdHlwZS5vbkVudGl0aWVzID0gZnVuY3Rpb24obXNnKSB7XG4gIGNvbnNvbGUubG9nKG1zZyk7XG4gIHRoaXMuZW50aXRpZXMgPSBtc2cuZW50aXRpZXM7XG5cbiAgdmFyIG1lc2hfcXVldWUgPSBbXTtcbiAgdGhpcy5lbnRpdGllcy5mb3JFYWNoKGZ1bmN0aW9uIChlbnRpdHkpIHtcbiAgICBpZiAodGhpcy5tZXNoZXNbZW50aXR5LmlkXSAmJiB0aGlzLm1lc2hlc1tlbnRpdHkuaWRdLnJldmlzaW9uID09PSBlbnRpdHkubWVzaF9yZXZpc2lvbikge1xuICAgICAgY29uc29sZS5sb2coJ2NvcnJlY3QgcmV2aXNpb24nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbWVzaF9xdWV1ZS5wdXNoKGVudGl0eS5pZCk7XG4gICAgfVxuICB9LmJpbmQodGhpcykpO1xuXG4gIGNvbnNvbGUubG9nKG1lc2hfcXVldWUpO1xuICB2YXIgcmVxdWVzdCA9IHsgZW50aXR5X2lkczogbWVzaF9xdWV1ZX07XG4gIHRoaXMucXVlcnlfbWVzaGVzX3NlcnZpY2UuY2FsbFNlcnZpY2UocmVxdWVzdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgdmFyIGVycm9yX21zZyA9IHJlc3BvbnNlLmVycm9yX21zZztcbiAgICBpZiAoZXJyb3JfbXNnKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ3F1ZXJ5X21lc2hlc19zZXJ2aWNlOicsIGVycm9yX21zZyk7XG4gICAgfVxuXG4gICAgcmVzcG9uc2UuZW50aXR5X2lkcy5mb3JFYWNoKGZ1bmN0aW9uIChpZCwgaSkge1xuICAgICAgLy8gVE9ETzogY2hlY2sgcmV2aXNpb25zXG4gICAgICB0aGlzLm1lc2hlc1tpZF0gPSByZXNwb25zZS5tZXNoZXNbaV07XG4gICAgfS5iaW5kKHRoaXMpKTtcbiAgfS5iaW5kKHRoaXMpKTtcbn07XG5cbi8qKlxuICogV29ybGQgbW9kZWwgc25hcHNob3RzXG4gKi9cblxuRWQucHJvdG90eXBlLnVwZGF0ZV9zbmFwc2hvdHMgPSBmdW5jdGlvbihjYWxsYmFjaywgbWF4X251bV9yZXZpc2lvbnMpIHtcbiAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBfLm5vb3A7XG4gIG1heF9udW1fcmV2aXNpb25zID0gbWF4X251bV9yZXZpc2lvbnMgfHwgMDtcblxuICB2YXIgcmVxdWVzdCA9IHtcbiAgICByZXZpc2lvbjogdGhpcy5zbmFwc2hvdF9yZXZpc2lvbixcbiAgICBkZWxldGVfaWRzOiB0aGlzLmRlbGV0ZV9zbmFwc2hvdF9xdWV1ZSxcbiAgICBtYXhfbnVtX3JldmlzaW9uczogbWF4X251bV9yZXZpc2lvbnMsXG4gIH07XG4gIGlmICh0aGlzLmRlbGV0ZV9zbmFwc2hvdF9xdWV1ZS5sZW5ndGgpIHtcbiAgICBjb25zb2xlLmxvZygnZGVsZXRpbmcgc25hcHNob3RzOicsIHRoaXMuZGVsZXRlX3NuYXBzaG90X3F1ZXVlKTtcbiAgICB0aGlzLnNuYXBzaG90cyA9IF8ub21pdCh0aGlzLnNuYXBzaG90cywgdGhpcy5kZWxldGVfc25hcHNob3RfcXVldWUpO1xuICAgIHRoaXMuZGVsZXRlX3NuYXBzaG90X3F1ZXVlID0gW107XG4gIH1cblxuICB2YXIgc3RhcnRfdGltZSA9IG5ldyBEYXRlKCk7XG5cbiAgLy8gY29uc29sZS5kZWJ1ZygndXBkYXRlICVkIHNuYXBzaG90cycsIG1heF9udW1fcmV2aXNpb25zKTtcbiAgdGhpcy5zbmFwc2hvdF9zZXJ2aWNlLmNhbGxTZXJ2aWNlKHJlcXVlc3QsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgIHZhciBkaWZmID0gbmV3IERhdGUoKSAtIHN0YXJ0X3RpbWU7XG4gICAgdGhpcy5lbWl0KCd1cGRhdGVfdGltZScsIGRpZmYpO1xuICAgIGlmICghcmVzcG9uc2UubmV3X3JldmlzaW9uICYmIF8uc2l6ZSh0aGlzLnNuYXBzaG90cykgfHwgLy8gcmV2aXNpb24gMCAmJiBvbGQgc25hcHNob3RzXG4gICAgICAgIHJlc3BvbnNlLm5ld19yZXZpc2lvbiA8IHRoaXMuc25hcHNob3RfcmV2aXNpb24pIHtcbiAgICAgIGNvbnNvbGUud2FybignZWQgcmVzdGFydCBkZXRlY3RlZCwgcmVsb2FkaW5nLi4uJyk7XG4gICAgICB0aGlzLnNuYXBzaG90cyA9IHt9OyAvLyBjbGVhciBzbmFwc2hvdHNcbiAgICAgIHRoaXMudXBkYXRlX21vZGVscygpOyAvLyByZWxvYWQgbW9kZWwgZGJcbiAgICB9XG4gICAgdGhpcy5zbmFwc2hvdF9yZXZpc2lvbiA9IHJlc3BvbnNlLm5ld19yZXZpc2lvbjtcblxuICAgIHZhciBzbmFwc2hvdHMgPSBwcm9jZXNzX3NuYXBzaG90cyhyZXNwb25zZSk7XG4gICAgXy5hc3NpZ24odGhpcy5zbmFwc2hvdHMsIHNuYXBzaG90cyk7XG5cbiAgICB0aGlzLmVtaXQoJ3NuYXBzaG90cycsIHRoaXMuc25hcHNob3RzKTtcblxuICAgIGNhbGxiYWNrKG51bGwsIHNuYXBzaG90cyk7XG4gIH0uYmluZCh0aGlzKSwgZnVuY3Rpb24gKGVycikge1xuICAgIGNvbnNvbGUud2FybigndXBkYXRlX3NuYXBzaG90cyBmYWlsZWQ6JywgZXJyKTtcbiAgICBjYWxsYmFjayhlcnIsIG51bGwpO1xuICB9LmJpbmQodGhpcykpO1xufTtcblxuZnVuY3Rpb24gcHJvY2Vzc19zbmFwc2hvdHMgKHJlc3BvbnNlKSB7XG4gIHZhciBzbmFwc2hvdHMgPSB7fTtcblxuICByZXNwb25zZS5pbWFnZV9pZHMuZm9yRWFjaChmdW5jdGlvbiAoaWQsIGkpIHtcbiAgICB2YXIgaW1hZ2VfYmluYXJ5ID0gcmVzcG9uc2UuaW1hZ2VzW2ldO1xuXG4gICAgdmFyIGVuY29kaW5nID0gaW1hZ2VfYmluYXJ5LmVuY29kaW5nO1xuICAgIGltYWdlX2JpbmFyeS5zcmMgPSAnZGF0YTppbWFnZS8nICsgZW5jb2RpbmcgKyAnO2Jhc2U2NCwnICsgaW1hZ2VfYmluYXJ5LmRhdGE7XG4gICAgaW1hZ2VfYmluYXJ5LnNob3J0X2lkID0gXy50cnVuYyhpZCwge1xuICAgICAgJ2xlbmd0aCc6IDgsXG4gICAgICAnb21pc3Npb24nOiAnJyxcbiAgICB9KTtcbiAgICBpbWFnZV9iaW5hcnkuaWQgPSBpZDtcblxuICAgIHZhciB0cyA9IHJlc3BvbnNlLmltYWdlX3RpbWVzdGFtcHNbaV07XG4gICAgaW1hZ2VfYmluYXJ5LnRpbWVzdGFtcCA9IG5ldyBEYXRlKHRzLnNlY3MgKyB0cy5uc2VjcyoxZS05KTtcblxuICAgIHNuYXBzaG90c1tpZF0gPSBpbWFnZV9iaW5hcnk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgcmV0dXJuIHNuYXBzaG90cztcbn1cblxuRWQucHJvdG90eXBlLmRlbGV0ZV9zbmFwc2hvdCA9IGZ1bmN0aW9uKGlkKSB7XG4gIHRoaXMuZGVsZXRlX3NuYXBzaG90X3F1ZXVlLnB1c2goaWQpO1xuICB0aGlzLmZvcmNlX3VwZGF0ZSgpO1xufTtcblxuRWQucHJvdG90eXBlLnN0YXJ0X3VwZGF0ZV9sb29wID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNuYXBzaG90c190aW1lcl9pZCA9IG51bGw7XG4gIHRoaXMudXBkYXRlX3NuYXBzaG90cyhmdW5jdGlvbiB1cGRhdGVfYWdhaW4oZXJyLCBuZXdfc25hcHNob3RzKSB7XG4gICAgLy8gY29uc29sZS5kZWJ1ZygnaSBnb3QgJWQgbmV3IHNuYXBzaG90cycsIF8uc2l6ZShuZXdfc25hcHNob3RzKSk7XG5cbiAgICB2YXIgZGVsYXkgPSA1MDA7XG4gICAgaWYgKGVycikge1xuICAgICAgZGVsYXkgPSA1MDAwO1xuICAgIH0gZWxzZSBpZiAoXy5zaXplKF8ub21pdChuZXdfc25hcHNob3RzLCAnY3VycmVudCcpKSkge1xuICAgICAgZGVsYXkgPSAwO1xuICAgIH1cblxuICAgIHRoaXMuc25hcHNob3RzX3RpbWVyX2lkID0gXy5kZWxheShmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgIHRoaXMuc25hcHNob3RzX3RpbWVyX2lkID0gbnVsbDtcbiAgICAgIHRoaXMudXBkYXRlX3NuYXBzaG90cyhjYWxsYmFjayk7XG4gICAgfS5iaW5kKHRoaXMpLCBkZWxheSwgdXBkYXRlX2FnYWluLmJpbmQodGhpcykpO1xuICB9LmJpbmQodGhpcyksIDEpO1xufTtcblxuRWQucHJvdG90eXBlLmZvcmNlX3VwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5zbmFwc2hvdHNfdGltZXJfaWQpIHtcbiAgICBjb25zb2xlLmxvZygnZm9yY2UgdXBkYXRlJyk7XG4gICAgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLnNuYXBzaG90c190aW1lcl9pZCk7XG4gICAgdGhpcy5zbmFwc2hvdHNfdGltZXJfaWQgPSBudWxsO1xuICAgIHRoaXMuc3RhcnRfdXBkYXRlX2xvb3AoKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBlbHNlIGFuIHVwZGF0ZSBpcyBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgY29uc29sZS5sb2coJ3VwZGF0ZSBpcyBhbHJlYWR5IGluIHByb2dyZXNzJyk7XG4gIH1cbn07XG5cbkVkLnByb3RvdHlwZS5tYWtlX3NuYXBzaG90ID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgdGhpcy5tYWtlX3NuYXBzaG90X3NlcnZpY2UuY2FsbFNlcnZpY2UobnVsbCwgY2FsbGJhY2spO1xuICB0aGlzLmZvcmNlX3VwZGF0ZSgpO1xufTtcblxuLyoqXG4gKiBXb3JsZCBtb2RlbCBkYXRhYmFzZVxuICovXG5cbkVkLnByb3RvdHlwZS51cGRhdGVfbW9kZWxzID0gZnVuY3Rpb24gdXBkYXRlX21vZGVscyAoKSB7XG4gIHZhciByZXF1ZXN0ID0ge307XG4gIHRoaXMubW9kZWxzX3NlcnZpY2UuY2FsbFNlcnZpY2UocmVxdWVzdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG5cbiAgICByZXNwb25zZS5tb2RlbF9uYW1lcy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lLCBpKSB7XG4gICAgICB2YXIgaW1hZ2VfYmluYXJ5ID0gcmVzcG9uc2UubW9kZWxfaW1hZ2VzW2ldO1xuXG4gICAgICB2YXIgZW5jb2RpbmcgPSBpbWFnZV9iaW5hcnkuZW5jb2Rpbmc7XG4gICAgICBpbWFnZV9iaW5hcnkuc3JjID0gJ2RhdGE6aW1hZ2UvJyArIGVuY29kaW5nICsgJztiYXNlNjQsJyArIGltYWdlX2JpbmFyeS5kYXRhO1xuXG4gICAgICB0aGlzLm1vZGVsc1tuYW1lXSA9IGltYWdlX2JpbmFyeTtcbiAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgdGhpcy5lbWl0KCdtb2RlbHMnLCB0aGlzLm1vZGVscyk7XG4gIH0uYmluZCh0aGlzKSwgZnVuY3Rpb24gKG1zZykge1xuICAgIGNvbnNvbGUud2FybigndXBkYXRlX21vZGVscyBmYWlsZWQ6JywgbXNnKTtcbiAgICBfLmRlbGF5KHVwZGF0ZV9tb2RlbHMuYmluZCh0aGlzKSwgNTAwMCk7XG4gIH0uYmluZCh0aGlzKSk7XG59O1xuXG4vKipcbiAqIFdvcmxkIG1vZGVsIGZpdHRpbmdcbiAqL1xuRWQucHJvdG90eXBlLmZpdF9tb2RlbCA9IGZ1bmN0aW9uKG1vZGVsX25hbWUsIGltYWdlX2lkLCBjbGlja194X3JhdGlvLCBjbGlja195X3JhdGlvKSB7XG4gIHZhciByZXF1ZXN0ID0ge1xuICAgIG1vZGVsX25hbWU6IG1vZGVsX25hbWUsXG4gICAgaW1hZ2VfaWQ6IGltYWdlX2lkLFxuICAgIGNsaWNrX3hfcmF0aW86IGNsaWNrX3hfcmF0aW8sXG4gICAgY2xpY2tfeV9yYXRpbzogY2xpY2tfeV9yYXRpbyxcbiAgfTtcblxuICB0aGlzLmZpdF9tb2RlbF9zZXJ2aWNlLmNhbGxTZXJ2aWNlKHJlcXVlc3QsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgIHRoaXMuZm9yY2VfdXBkYXRlKCk7XG5cbiAgICB2YXIgZXJyb3JfbXNnID0gcmVzcG9uc2UuZXJyb3JfbXNnO1xuICAgIGlmIChlcnJvcl9tc2cpIHtcbiAgICAgIGNvbnNvbGUud2FybignZml0IG1vZGVsIGVycm9yOicsIGVycm9yX21zZyk7XG4gICAgfVxuICB9LmJpbmQodGhpcykpO1xufTtcblxuRWQucHJvdG90eXBlLnVuZG9fZml0X21vZGVsID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgdmFyIHJlcXVlc3QgPSB7XG4gICAgdW5kb19sYXRlc3RfZml0OiB0cnVlLFxuICB9O1xuXG4gIHRoaXMuZml0X21vZGVsX3NlcnZpY2UuY2FsbFNlcnZpY2UocmVxdWVzdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5mb3JjZV91cGRhdGUoKTtcblxuICAgIHZhciBlcnJvcl9tc2cgPSByZXNwb25zZS5lcnJvcl9tc2c7XG4gICAgaWYgKGVycm9yX21zZykge1xuICAgICAgY29uc29sZS53YXJuKCdmaXQgbW9kZWwgZXJyb3I6JywgZXJyb3JfbXNnKTtcbiAgICAgIGNhbGxiYWNrKGVycm9yX21zZyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxiYWNrKG51bGwpO1xuICAgIH1cbiAgfS5iaW5kKHRoaXMpLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICB0aGlzLmZvcmNlX3VwZGF0ZSgpO1xuXG4gICAgICBjb25zb2xlLndhcm4oJ2ZpdCBtb2RlbCBlcnJvcjonLCBlcnIpO1xuICAgICAgY2FsbGJhY2soZXJyKTtcbiAgfS5iaW5kKHRoaXMpKTtcbn07XG5cbnZhciBuYXZpZ2F0ZV90eXBlcyA9IHtcbiAgTkFWSUdBVEVfVE9fUElYRUw6IDEsXG4gIFRVUk5fTEVGVCAgICAgICAgOiAyLFxuICBUVVJOX1JJR0hUICAgICAgIDogMyxcbn07XG5cbkVkLnByb3RvdHlwZS5uYXZpZ2F0ZV90byA9IGZ1bmN0aW9uKHgsIHksIHNuYXBzaG90X2lkKSB7XG4gIHRoaXMubmF2aWdhdGVfdG9fc2VydmljZS5jYWxsU2VydmljZSh7XG4gICAgc25hcHNob3RfaWQ6IHNuYXBzaG90X2lkLFxuICAgIG5hdmlnYXRpb25fdHlwZTogbmF2aWdhdGVfdHlwZXMuTkFWSUdBVEVfVE9fUElYRUwsXG4gICAgY2xpY2tfeF9yYXRpbzogeCxcbiAgICBjbGlja195X3JhdGlvOiB5LFxuICB9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgdmFyIGVycm9yX21zZyA9IHJlc3VsdC5lcnJvcl9tc2c7XG4gICAgaWYgKGVycm9yX21zZykge1xuICAgICAgY29uc29sZS53YXJuKGVycm9yX21zZyk7XG4gICAgfVxuICB9KTtcbn07XG5cbkVkLnByb3RvdHlwZS5jcmVhdGVfd2FsbHMgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IF8ubm9vcDtcbiAgdGhpcy5jcmVhdGVfd2FsbHNfc2VydmljZS5jYWxsU2VydmljZSh7fSwgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgIGNhbGxiYWNrKCk7XG4gIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFZDtcbiIsIi8qIGVzbGludCBrZXktc3BhY2luZzogMCAqL1xuLyogZXNsaW50IG5vLW11bHRpLXNwYWNlczogMCAqL1xuXG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuXG4vKlxufCAgIE5hbWUgIHwgSG9tZWFibGUgfCBIb21lYWJsZU1hbmRhdG9yeSB8IFJlc2V0YWJsZSB8XG58LS0tLS0tLS0tfC0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tLXxcbnwgQmFzZSAgICB8IG5vICAgICAgIHwgbm8gICAgICAgICAgICAgICAgfCB5ZXMgICAgICAgfFxufCBTcGluZGxlIHwgeWVzICAgICAgfCB5ZXMgICAgICAgICAgICAgICB8IHllcyAgICAgICB8XG58IEFybSAgICAgfCB5ZXMgICAgICB8IG5vICAgICAgICAgICAgICAgIHwgeWVzICAgICAgIHxcbnwgSGVhZCAgICB8IG5vICAgICAgIHwgbm8gICAgICAgICAgICAgICAgfCBubyAgICAgICAgfFxuKi9cblxuLy8gdHJhbnNmb3JtIHRoZSBhcnJheSBvZiBib29scyB0byBhbiBvYmplY3RcbmNvbnN0IHByb3BlcnRpZXMgPSBfLm1hcFZhbHVlcyh7XG4gIC8qIGVzbGludCBjYW1lbGNhc2U6MCAqL1xuICAvLyBOYW1lICAgICB8IEhvbWVhYmxlIHwgIEhvbWVhYmxlTWFuZGF0b3J5IHwgUmVzZXRhYmxlXG4gIGFsbDogICAgICAgIFt0cnVlLCAgICAgICAgZmFsc2UsICAgICAgICAgICAgICB0cnVlXSxcbiAgYmFzZTogICAgICAgW2ZhbHNlLCAgICAgICBmYWxzZSwgICAgICAgICAgICAgIHRydWVdLFxuICBzcGluZGxlOiAgICBbdHJ1ZSwgICAgICAgIHRydWUsICAgICAgICAgICAgICAgdHJ1ZV0sXG4gIGxlZnRfYXJtOiAgIFt0cnVlLCAgICAgICAgZmFsc2UsICAgICAgICAgICAgICB0cnVlXSxcbiAgcmlnaHRfYXJtOiAgW3RydWUsICAgICAgICBmYWxzZSwgICAgICAgICAgICAgIHRydWVdLFxuICBoZWFkOiAgICAgICBbZmFsc2UsICAgICAgIGZhbHNlLCAgICAgICAgICAgICAgZmFsc2VdXG59LCB2ID0+IHtcbiAgcmV0dXJuIHtcbiAgICBob21lYWJsZTogdlswXSxcbiAgICBob21lYWJsZV9tYW5kYXRvcnk6IHZbMV0sXG4gICAgcmVzZXRhYmxlOiB2WzJdXG4gIH07XG59KTtcblxuZXhwb3J0IGRlZmF1bHQgcHJvcGVydGllcztcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IHtFdmVudEVtaXR0ZXIyfSBmcm9tICdldmVudGVtaXR0ZXIyJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge01lc3NhZ2V9IGZyb20gJ3Jvc2xpYic7XG5cbi8vIEhhcmR3YXJlIGNvbnN0YW50c1xuXG5jb25zdCBsZXZlbHMgPSB7XG4gIFNUQUxFOiAwLFxuICBJRExFOiAxLFxuICBPUEVSQVRJT05BTDogMixcbiAgSE9NSU5HOiAzLFxuICBFUlJPUjogNFxufTtcblxuLy8gUm9ib3Qgc3BlY2lmaWMgSGFyZHdhcmUgY29uc3RhbnRzIHRoYXQgc2hvdWxkIGNvbWUgZnJvbSB0aGUgcGFyYW1ldGVyIHNlcnZlclxuY29uc3QgcHJvcGVydGllcyA9IHJlcXVpcmUoJy4vaGFyZHdhcmUtcHJvcGVydGllcycpO1xuXG4vLyBkZWZpbmUgaG93IHRoZSBhY3Rpb25zIG1hcCB0byBoYXJkd2FyZSBjb21tYW5kc1xuY29uc3QgY29tbWFuZHMgPSB7XG4gIGhvbWU6IDIxLFxuICBzdGFydDogMjIsXG4gIHN0b3A6IDIzLFxuICByZXNldDogMjRcbn07XG5cbmNvbnN0IGhhcmR3YXJlSWRzID0ge1xuICAvKiBlc2xpbnQgY2FtZWxjYXNlOjAgKi9cbiAgYWxsOiAwLFxuICBiYXNlOiAxLFxuICBzcGluZGxlOiAyLFxuICBsZWZ0X2FybTogMyxcbiAgcmlnaHRfYXJtOiA0LFxuICBoZWFkOiA1XG59O1xuXG5jb25zdCBkZWZhdWx0U3RhdHVzID0gXy5tYXBWYWx1ZXMoaGFyZHdhcmVJZHMsICh2YWx1ZSwgbmFtZSkgPT4ge1xuICByZXR1cm4ge1xuICAgIG5hbWUsXG4gICAgbGV2ZWw6IGxldmVscy5TVEFMRSxcbiAgICBob21lZDogZmFsc2VcbiAgfTtcbn0pO1xuXG4vLyBoYXJkd2FyZSB0aW1lb3V0cyBpbiBtc1xuY29uc3QgSEFSRFdBUkVfVElNRU9VVCA9IDIwMDA7XG5jb25zdCBCQVRURVJZX1RJTUVPVVQgPSAyMDAwO1xuY29uc3QgRUJVVFRPTlNfVElNRU9VVCA9IDIwMDA7XG5cbi8qKlxuICogSGFyZHdhcmUgbW9kdWxlXG4gKiBAcGFyYW0ge1JvYm90fSByb2JvdCBBIHZhbGlkIHJvYm90IG9iamVjdFxuICovXG5jbGFzcyBIYXJkd2FyZSBleHRlbmRzIEV2ZW50RW1pdHRlcjIge1xuXG4gIHN0YXRpYyBsZXZlbHMgPSBsZXZlbHNcblxuICBjb25zdHJ1Y3Rvcihyb2JvdCkge1xuICAgIHN1cGVyKCk7XG4gICAgY29uc3Qgcm9zID0gcm9ib3Qucm9zO1xuXG4gICAgLy8gaGFyZHdhcmUgc3RhdHVzIGluaXRcbiAgICBjb25zdCBzdGF0dXNUb3BpYyA9IHJvcy5Ub3BpYyh7XG4gICAgICBuYW1lOiAnaGFyZHdhcmVfc3RhdHVzJyxcbiAgICAgIG1lc3NhZ2VUeXBlOiAnZGlhZ25vc3RpY19tc2dzL0RpYWdub3N0aWNBcnJheScsXG4gICAgICB0aHJvdHRsZV9yYXRlOiA1MDBcbiAgICB9KTtcbiAgICBzdGF0dXNUb3BpYy5zdWJzY3JpYmUodGhpcy5fb25TdGF0dXMuYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLl9jb21tYW5kVG9waWMgPSByb3MuVG9waWMoe1xuICAgICAgbmFtZTogJ2Rhc2hib2FyZF9jdHJsY21kcycsXG4gICAgICBtZXNzYWdlVHlwZTogJ3N0ZF9tc2dzL1VJbnQ4TXVsdGlBcnJheSdcbiAgICB9KTtcblxuICAgIC8vIGJhdHRlcnkgc3RhdHVzIGluaXRcbiAgICBjb25zdCBiYXR0ZXJ5VG9waWMgPSByb3MuVG9waWMoe1xuICAgICAgbmFtZTogJ2JhdHRlcnlfcGVyY2VudGFnZScsXG4gICAgICBtZXNzYWdlVHlwZTogJ3N0ZF9tc2dzL0Zsb2F0MzInLFxuICAgICAgdGhyb3R0bGVfcmF0ZTogMjAwXG4gICAgfSk7XG4gICAgYmF0dGVyeVRvcGljLnN1YnNjcmliZSh0aGlzLl9vbkJhdHRlcnkuYmluZCh0aGlzKSk7XG5cbiAgICAvLyBlYnV0dG9uIHN0YXR1cyBpbml0XG4gICAgY29uc3QgZWJ1dHRvblRvcGljID0gcm9zLlRvcGljKHtcbiAgICAgIG5hbWU6ICdlYnV0dG9uX3N0YXR1cycsXG4gICAgICBtZXNzYWdlVHlwZTogJ2RpYWdub3N0aWNfbXNncy9EaWFnbm9zdGljQXJyYXknLFxuICAgICAgdGhyb3R0bGVfcmF0ZTogMjAwXG4gICAgfSk7XG4gICAgZWJ1dHRvblRvcGljLnN1YnNjcmliZSh0aGlzLl9vbkVidXR0b25zLmJpbmQodGhpcykpO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYyBzdGF0dXMgQVBJXG4gICAqL1xuICBfc3RhdHVzID0gZGVmYXVsdFN0YXR1cztcbiAgZ2V0IHN0YXR1cygpIHtcbiAgICByZXR1cm4gdGhpcy5fc3RhdHVzO1xuICB9XG4gIHNldCBzdGF0dXModmFsdWUpIHtcbiAgICB0aGlzLl9zdGF0dXMgPSB2YWx1ZTtcbiAgICB0aGlzLmVtaXQoJ3N0YXR1cycsIHZhbHVlKTtcbiAgfVxuXG4gIF9vblN0YXR1cyhtc2cpIHtcbiAgICB0aGlzLnN0YXR1cyA9IGRpYWdub3N0aWNNc2dUb1N0YXR1cyhtc2cpO1xuICAgIHRoaXMuX3Jlc2V0SGFyZHdhcmVMYXRlcigpO1xuICB9XG5cbiAgX3Jlc2V0SGFyZHdhcmVMYXRlciA9IF8uZGVib3VuY2UodGhpcy5fcmVzZXRIYXJkd2FyZSwgSEFSRFdBUkVfVElNRU9VVCk7XG4gIF9yZXNldEhhcmR3YXJlKCkge1xuICAgIGNvbnNvbGUubG9nKCdoYXJkd2FyZSBtZXNzYWdlIHRpbWVvdXQnKTtcbiAgICB0aGlzLnN0YXR1cyA9IGRlZmF1bHRTdGF0dXM7XG4gIH1cblxuICAvKipcbiAgICogU2VuZCBhIGNvbW1hbmQgdG8gdGhlIHBhcnR3YXJlXG4gICAqXG4gICAqIGV4YW1wbGU6XG4gICAqID4gaGFyZHdhcmUuc2VuZF9jb21tYW5kKCdoZWFkJywgJ3N0YXJ0JylcbiAgICovXG4gIHNlbmRfY29tbWFuZChwYXJ0LCBjb21tYW5kKSB7XG4gICAgY29uc3QgaTEgPSBoYXJkd2FyZUlkc1twYXJ0XTtcbiAgICBjb25zdCBpMiA9IGNvbW1hbmRzW2NvbW1hbmRdO1xuICAgIGNvbnNvbGUubG9nKCdoYXJkd2FyZSBjb21tYW5kOiAlcyAlcyAoJWksICVpKScsIGNvbW1hbmQsIHBhcnQsIGkxLCBpMik7XG5cbiAgICBjb25zdCBjbWQgPSBuZXcgTWVzc2FnZSh7XG4gICAgICBkYXRhOiBbaTEsIGkyXVxuICAgIH0pO1xuXG4gICAgdGhpcy5fY29tbWFuZFRvcGljLnB1Ymxpc2goY21kKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBQdWJsaWMgYmF0dGVyeSBBUElcbiAgICovXG4gIF9iYXR0ZXJ5ID0gbnVsbDtcbiAgZ2V0IGJhdHRlcnkoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2JhdHRlcnk7XG4gIH1cbiAgc2V0IGJhdHRlcnkodmFsdWUpIHtcbiAgICB0aGlzLl9iYXR0ZXJ5ID0gdmFsdWU7XG4gICAgdGhpcy5lbWl0KCdiYXR0ZXJ5JywgdmFsdWUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBtc2cgLSBST1Mgc3RkX21zZ3MvRmxvYXQzMiBtZXNzYWdlXG4gICAqL1xuICBfb25CYXR0ZXJ5KG1zZykge1xuICAgIGNvbnN0IHBlcmNlbnQgPSBtc2cuZGF0YTtcbiAgICB0aGlzLmJhdHRlcnkgPSBwZXJjZW50O1xuICAgIHRoaXMuX3Jlc2V0QmF0dGVyeUxhdGVyKCk7XG4gIH1cblxuICBfcmVzZXRCYXR0ZXJ5TGF0ZXIgPSBfLmRlYm91bmNlKHRoaXMuX3Jlc2V0QmF0dGVyeSwgQkFUVEVSWV9USU1FT1VUKTtcbiAgX3Jlc2V0QmF0dGVyeSgpIHtcbiAgICBjb25zb2xlLmxvZygnYmF0dGVyeSBtZXNzYWdlIHRpbWVvdXQnKTtcbiAgICB0aGlzLmJhdHRlcnkgPSBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFB1YmxpYyBlYnV0dG9uIHN0YXR1cyBBUElcbiAgICovXG4gIF9lYnV0dG9ucyA9IG51bGw7XG4gIGdldCBlYnV0dG9ucygpIHtcbiAgICByZXR1cm4gdGhpcy5fZWJ1dHRvbnM7XG4gIH1cbiAgc2V0IGVidXR0b25zKHZhbHVlKSB7XG4gICAgdGhpcy5fZWJ1dHRvbnMgPSB2YWx1ZTtcbiAgICB0aGlzLmVtaXQoJ2VidXR0b25zJywgdmFsdWUpO1xuICB9XG5cbiAgX29uRWJ1dHRvbnMobXNnKSB7XG4gICAgY29uc3Qgc3RhdHVzID0gXy5tYXAobXNnLnN0YXR1cywgc3RhdHVzID0+IHtcbiAgICAgIHJldHVybiBfLnBpY2soc3RhdHVzLCBbJ25hbWUnLCAnbGV2ZWwnXSk7XG4gICAgfSk7XG5cbiAgICB0aGlzLmVidXR0b25zID0gc3RhdHVzO1xuICAgIHRoaXMuX3Jlc2V0RWJ1dHRvbnNMYXRlcigpO1xuICB9XG5cbiAgX3Jlc2V0RWJ1dHRvbnNMYXRlciA9IF8uZGVib3VuY2UodGhpcy5fcmVzZXRFYnV0dG9ucywgRUJVVFRPTlNfVElNRU9VVCk7XG4gIF9yZXNldEVidXR0b25zKCkge1xuICAgIGNvbnNvbGUubG9nKCdlYnV0dG9ucyBtZXNzYWdlIHRpbWVvdXQnKTtcbiAgICB0aGlzLmVidXR0b25zID0gbnVsbDtcbiAgfVxufVxuXG4vKipcbiAqIFByaXZhdGUgZnVuY3Rpb25zXG4gKi9cblxuLy8gY29udmVydCBhbiBpbmNvbWluZyBzdGF0dXMgbWVzc2FnZSB0byBhY3R1YWwgd29ya2FibGUgcHJvcGVydGllc1xuZnVuY3Rpb24gZGlhZ25vc3RpY01zZ1RvU3RhdHVzKG1zZykge1xuICBjb25zdCBwYXJ0cyA9IG1zZy5zdGF0dXMubWFwKHBhcnQgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBwYXJ0Lm5hbWUsXG4gICAgICBsZXZlbDogcGFydC5sZXZlbCxcbiAgICAgIGhvbWVkOiBwYXJ0Lm1lc3NhZ2UgPT09ICdob21lZCdcbiAgICB9O1xuICB9KTtcbiAgY29uc3QgaGFyZHdhcmVfc3RhdHVzID0gXy5pbmRleEJ5KHBhcnRzLCAnbmFtZScpO1xuXG4gIC8vIGZpbGwgYWxsIG1pc3NpbmcgaGFyZHdhcmUgcGFydHMgd2l0aCAnaWRsZSdcbiAgXy5kZWZhdWx0cyhoYXJkd2FyZV9zdGF0dXMsIGRlZmF1bHRTdGF0dXMpO1xuXG4gIF8ubWFwVmFsdWVzKGhhcmR3YXJlX3N0YXR1cywgcGFydCA9PiB7XG4gICAgcGFydC5hY3Rpb25zID0gZ2V0QWN0aW9ucyhwYXJ0KTtcbiAgICByZXR1cm4gcGFydDtcbiAgfSk7XG5cbiAgcmV0dXJuIGhhcmR3YXJlX3N0YXR1cztcbn1cblxuLy8gcmV0dXJuIGFsbCBwb3NzaWJsZSBhY3Rpb25zIGZvciBhIGhhcmR3YXJlIHBhcnRcbmZ1bmN0aW9uIGdldEFjdGlvbnMocGFydCkge1xuICBjb25zdCBwcm9wcyA9IHByb3BlcnRpZXNbcGFydC5uYW1lXTtcbiAgaWYgKCFwcm9wcykge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgbGV2ZWwgPSBwYXJ0ID8gcGFydC5sZXZlbCA6IC0xO1xuICBjb25zdCBob21lZCA9IHBhcnQgPyBwYXJ0LmhvbWVkIDogZmFsc2U7XG5cbiAgY29uc3QgYWN0aW9ucyA9IHt9O1xuXG4gIC8vIG9ubHkgc2hvdyB0aGUgaG9tZSBhY3Rpb24gaWYgaG9tZWFibGVcbiAgaWYgKHByb3BzLmhvbWVhYmxlKSB7XG4gICAgYWN0aW9ucy5ob21lID0ge1xuICAgICAgZW5hYmxlZDogbGV2ZWwgPT09IGxldmVscy5JRExFLFxuICAgICAgd2FybmluZzogaG9tZWQgP1xuICAgICAgICAnVGhpcyBwYXJ0IHdhcyBhbHJlYWR5IGhvbWVkLCBBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gcmVkbyBob21pbmc/JyA6IGZhbHNlXG4gICAgfTtcbiAgfVxuXG4gIC8vIGFsd2F5cyBzaG93IHN0YXJ0IGFjdGlvblxuICBhY3Rpb25zLnN0YXJ0ID0ge1xuICAgIGVuYWJsZWQ6IGxldmVsID09PSBsZXZlbHMuSURMRSAmJiAoaG9tZWQgfHwgIXByb3BzLmhvbWVhYmxlX21hbmRhdG9yeSksXG4gICAgd2FybmluZzogcHJvcHMuaG9tZWFibGUgJiYgIWhvbWVkID9cbiAgICAgICdUaGlzIHBhcnQgaXMgbm90IHlldCBob21lZCwgQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIHByb2NlZWQ/JyA6IGZhbHNlXG4gIH07XG5cbiAgLy8gYWx3YXlzIHNob3cgc3RvcCBhY3Rpb25cbiAgYWN0aW9ucy5zdG9wID0ge1xuICAgIGVuYWJsZWQ6IGxldmVsID09PSBsZXZlbHMuSE9NSU5HIHx8IGxldmVsID09PSBsZXZlbHMuT1BFUkFUSU9OQUxcbiAgfTtcblxuICAvLyBvbmx5IHNob3cgcmVzZXQgYWN0aW9uIGlmIHJlc2V0YWJsZVxuICBpZiAocHJvcHMucmVzZXRhYmxlKSB7XG4gICAgYWN0aW9ucy5yZXNldCA9IHtcbiAgICAgIGVuYWJsZWQ6IGxldmVsID09PSBsZXZlbHMuRVJST1JcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIGFjdGlvbnM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gSGFyZHdhcmU7XG4iLCIndXNlIHN0cmljdCc7XG5cbmltcG9ydCB7RXZlbnRFbWl0dGVyMn0gZnJvbSAnZXZlbnRlbWl0dGVyMic7XG5pbXBvcnQge0dvYWx9IGZyb20gJ3Jvc2xpYic7XG5cbmNsYXNzIEhlYWQgZXh0ZW5kcyBFdmVudEVtaXR0ZXIyIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHRoaXMuZ29hbCA9IG51bGw7XG4gICAgLy8gdGhpcy5oZWFkX2FjID0gcm9zLkFjdGlvbkNsaWVudCh7XG4gICAgLy8gICBzZXJ2ZXJOYW1lOiAnaGVhZF9yZWYvYWN0aW9uX3NlcnZlcicsXG4gICAgLy8gICBhY3Rpb25OYW1lOiAnaGVhZF9yZWYvSGVhZFJlZmVyZW5jZUFjdGlvbicsXG4gICAgLy8gfSk7XG4gIH1cblxuICBzZW5kR29hbCgpIHtcbiAgICB0aGlzLmdvYWwgPSBuZXcgR29hbCh7XG4gICAgICAvKiBlc2xpbnQgY2FtZWxjYXNlOjAgKi9cbiAgICAgIGFjdGlvbkNsaWVudDogdGhpcy5oZWFkX2FjLFxuICAgICAgZ29hbE1lc3NhZ2U6IHtcbiAgICAgICAgLy8gZWl0aGVyIExPT0tBVCBvciBQQU5fVElMVFxuICAgICAgICBnb2FsX3R5cGU6IG51bGwsXG5cbiAgICAgICAgLy8gWzEtMjU1XSAoYWN0aW9uIGNsaWVudCBjYWxscyB3aXRoIHRoZSBzYW1lIHByaW9yaXR5IGNhbmNlbCBlYWNoIG90aGVyKVxuICAgICAgICBwcmlvcml0eTogMSxcblxuICAgICAgICBwYW5fdmVsOiBudWxsLFxuICAgICAgICB0aWx0X3ZlbDogbnVsbCxcblxuICAgICAgICAvLyBpbiBjYXNlIG9mIExPT0tBVDpcbiAgICAgICAgdGFyZ2V0X3BvaW50OiBudWxsLFxuXG4gICAgICAgIC8vIGluIGNhc2Ugb2YgUEFOX1RJTFRcbiAgICAgICAgcGFuOiBudWxsLFxuICAgICAgICB0aWx0OiBudWxsLFxuXG4gICAgICAgIC8vIGdvYWwgY2FuY2VscyBhdXRvbWF0aWNhbGx5IGFmdGVyIHRoaXMgdGltZSAoc2Vjb25kcyksIGlmIDAsIG5vIGF1dG8gY2FuY2VsXG4gICAgICAgIGVuZF90aW1lOiBudWxsXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICB0aGlzLmdvYWwub24oJ2ZlZWRiYWNrJywgZmVlZGJhY2sgPT4ge1xuICAgICAgY29uc29sZS5sb2coJ0ZlZWRiYWNrOicsIGZlZWRiYWNrKTtcbiAgICB9KTtcbiAgICB0aGlzLmdvYWwub24oJ3Jlc3VsdCcsIHJlc3VsdCA9PiB7XG4gICAgICBjb25zb2xlLmxvZygnUmVzdWx0OicsIHJlc3VsdCk7XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgSGVhZDtcbiIsIid1c2Ugc3RyaWN0JztcblxuaW1wb3J0IEJhc2UgZnJvbSAnLi9iYXNlJztcbmltcG9ydCBFZCBmcm9tICcuL2VkJztcbmltcG9ydCBIYXJkd2FyZSBmcm9tICcuL2hhcmR3YXJlJztcbmltcG9ydCBIZWFkIGZyb20gJy4vaGVhZCc7XG5pbXBvcnQgUm9ib3QgZnJvbSAnLi9yb2JvdCc7XG5cbmV4cG9ydCB7QmFzZSwgRWQsIEhhcmR3YXJlLCBIZWFkLCBSb2JvdH07XG4iLCJpbXBvcnQge0V2ZW50RW1pdHRlcjJ9IGZyb20gJ2V2ZW50ZW1pdHRlcjInO1xuaW1wb3J0IHtSb3N9IGZyb20gJ3Jvc2xpYic7XG5pbXBvcnQge2hvc3RuYW1lfSBmcm9tICdvcyc7XG5cbmltcG9ydCBFZCBmcm9tICcuL2VkJztcbmltcG9ydCBIYXJkd2FyZSBmcm9tICcuL2hhcmR3YXJlJztcbmltcG9ydCBIZWFkIGZyb20gJy4vaGVhZCc7XG5pbXBvcnQgQmFzZSBmcm9tICcuL2Jhc2UnO1xuXG4vLyBQcml2YXRlIHZhcmlhYmxlc1xuY29uc3QgaG9zdCA9IGhvc3RuYW1lKCkgfHwgJ2xvY2FsaG9zdCc7XG5jb25zdCBkZWZhdWx0VXJsID0gYHdzOi8vJHtob3N0fTo5MDkwYDtcblxuLy8gcmVjb25uZWN0IHRpbWVvdXQgaW4gbXNcbmNvbnN0IFJFQ09OTkVDVF9USU1FT1VUID0gNTAwMDtcblxuLy8gUm9ib3QgY29uc3RydWN0b3JcbmNsYXNzIFJvYm90IGV4dGVuZHMgRXZlbnRFbWl0dGVyMiB7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgLy8gcGFyZW50IGNvbnN0cnVjdG9yXG4gICAgLy8gRXZlbnRFbWl0dGVyMi5hcHBseSh0aGlzKTtcbiAgICBzdXBlcigpO1xuXG4gICAgdGhpcy5yb3MgPSBuZXcgUm9zKCk7XG5cbiAgICB0aGlzLnJvcy5vbignY29ubmVjdGlvbicsIHRoaXMub25Db25uZWN0aW9uLmJpbmQodGhpcykpO1xuICAgIHRoaXMucm9zLm9uKCdjbG9zZScsIHRoaXMub25DbG9zZS5iaW5kKHRoaXMpKTtcbiAgICB0aGlzLnJvcy5vbignZXJyb3InLCB0aGlzLm9uRXJyb3IuYmluZCh0aGlzKSk7XG5cbiAgICAvLyByZWNvbm5lY3QgYmVoYXZpb3JcbiAgICB0aGlzLm9uKCdzdGF0dXMnLCBmdW5jdGlvbiAoc3RhdHVzKSB7XG4gICAgICBzd2l0Y2ggKHN0YXR1cykge1xuICAgICAgICBjYXNlICdjbG9zZWQnOlxuICAgICAgICAgIHNldFRpbWVvdXQodGhpcy5jb25uZWN0LmJpbmQodGhpcyksIFJFQ09OTkVDVF9USU1FT1VUKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHRoaXMuZWQgPSBuZXcgRWQodGhpcyk7XG4gICAgdGhpcy5oYXJkd2FyZSA9IG5ldyBIYXJkd2FyZSh0aGlzKTtcbiAgICB0aGlzLmhlYWQgPSBuZXcgSGVhZCh0aGlzKTtcbiAgICB0aGlzLmJhc2UgPSBuZXcgQmFzZSh0aGlzKTtcbiAgfVxuXG4gIGdldCBzdGF0dXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3N0YXR1cztcbiAgfVxuXG4gIHNldCBzdGF0dXModmFsdWUpIHtcbiAgICB0aGlzLl9zdGF0dXMgPSB2YWx1ZTtcbiAgICB0aGlzLmVtaXQoJ3N0YXR1cycsIHZhbHVlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDb25uZWN0IHRvIHJvc2JyaWRnZVxuICAgKlxuICAgKiBJZiBhbiB1cmwgaXMgcHJvdmlkZWQsIGl0IHdpbGwgY29ubmVjdCB0byB0aGF0IG9uZS4gRWxzZSBpdCB3aWxsXG4gICAqIHVzZSB0aGUgcHJldmlvdXMgdXJsLiBVc2VzIGEgdXJsIGJhc2VkIG9uIHRoZSBob3N0bmFtZSBpZiBubyB1cmxzXG4gICAqIGFyZSBwcm92aWRlZC5cbiAgICovXG4gIGNvbm5lY3QodXJsKSB7XG4gICAgdGhpcy51cmwgPSB1cmwgfHwgdGhpcy51cmwgfHwgZGVmYXVsdFVybDtcblxuICAgIGNvbnNvbGUubG9nKGBjb25uZWN0aW5nIHRvICR7dGhpcy51cmx9YCk7XG4gICAgdGhpcy5yb3MuY29ubmVjdCh0aGlzLnVybCk7XG4gICAgdGhpcy5zdGF0dXMgPSAnY29ubmVjdGluZyc7XG4gIH1cblxuICAvLyByb3Mgc3RhdHVzIGV2ZW50IGhhbmRsaW5nXG4gIG9uQ29ubmVjdGlvbigpIHtcbiAgICBjb25zb2xlLmxvZygnY29ubmVjdGlvbicpO1xuICAgIHRoaXMuc3RhdHVzID0gJ2Nvbm5lY3RlZCc7XG4gIH1cblxuICBvbkNsb3NlKCkge1xuICAgIGNvbnNvbGUubG9nKCdjb25uZWN0aW9uIGNsb3NlZCcpO1xuICAgIHRoaXMuc3RhdHVzID0gJ2Nsb3NlZCc7XG4gIH1cblxuICBvbkVycm9yKCkge1xuICAgIC8vIGNvbnNvbGUubG9nKCdjb25uZWN0aW9uIGVycm9yJyk7XG4gICAgdGhpcy5zdGF0dXMgPSAnZXJyb3InO1xuICB9XG59XG5cbi8vIG1vZHVsZS5leHBvcnRzID0gUm9ib3Q7XG5leHBvcnQgZGVmYXVsdCBSb2JvdDtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIEV2ZW50RW1pdHRlcjI6IGdsb2JhbC5FdmVudEVtaXR0ZXIyXG59O1xuIiwiZXhwb3J0cy5lbmRpYW5uZXNzID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJ0xFJyB9O1xuXG5leHBvcnRzLmhvc3RuYW1lID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0eXBlb2YgbG9jYXRpb24gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiBsb2NhdGlvbi5ob3N0bmFtZVxuICAgIH1cbiAgICBlbHNlIHJldHVybiAnJztcbn07XG5cbmV4cG9ydHMubG9hZGF2ZyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIFtdIH07XG5cbmV4cG9ydHMudXB0aW1lID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gMCB9O1xuXG5leHBvcnRzLmZyZWVtZW0gPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIE51bWJlci5NQVhfVkFMVUU7XG59O1xuXG5leHBvcnRzLnRvdGFsbWVtID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBOdW1iZXIuTUFYX1ZBTFVFO1xufTtcblxuZXhwb3J0cy5jcHVzID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gW10gfTtcblxuZXhwb3J0cy50eXBlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJ0Jyb3dzZXInIH07XG5cbmV4cG9ydHMucmVsZWFzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodHlwZW9mIG5hdmlnYXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuIG5hdmlnYXRvci5hcHBWZXJzaW9uO1xuICAgIH1cbiAgICByZXR1cm4gJyc7XG59O1xuXG5leHBvcnRzLm5ldHdvcmtJbnRlcmZhY2VzXG49IGV4cG9ydHMuZ2V0TmV0d29ya0ludGVyZmFjZXNcbj0gZnVuY3Rpb24gKCkgeyByZXR1cm4ge30gfTtcblxuZXhwb3J0cy5hcmNoID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJ2phdmFzY3JpcHQnIH07XG5cbmV4cG9ydHMucGxhdGZvcm0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnYnJvd3NlcicgfTtcblxuZXhwb3J0cy50bXBkaXIgPSBleHBvcnRzLnRtcERpciA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJy90bXAnO1xufTtcblxuZXhwb3J0cy5FT0wgPSAnXFxuJztcbiJdfQ==
