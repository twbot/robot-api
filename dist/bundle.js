(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.API = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
'use strict';

var EventEmitter2 = require('eventemitter2').EventEmitter2;
var ROSLIB = (typeof window !== "undefined" ? window['ROSLIB'] : typeof global !== "undefined" ? global['ROSLIB'] : null);

function Base (robot) {
  EventEmitter2.apply(this);

  var ros = robot.ros;

  this.cmd_vel_topic = ros.Topic({
    name: 'base/references',
    messageType: 'geometry_msgs/Twist',
  });

  this.local_planner_topic = ros.Topic({
    name: 'local_planner/action_server/goal',
    messageType: 'cb_planner_msgs_srvs/LocalPlannerActionGoal',
  });
}

Base.prototype = Object.create(EventEmitter2.prototype);

Base.prototype.sendTwist = function(vx, vy, vth) {
  // publish the command
  var twist = new ROSLIB.Message({
    angular : {
      x : 0,
      y : 0,
      z : vth
    },
    linear : {
      x : vx,
      y : vy,
      z : 0
    }
  });
  this.cmd_vel_topic.publish(twist);
  // console.log(this.cmd_vel_topic);
  // console.log(twist);
  console.log("sendTwist: " + vx + "," + vy + "," + vth);
};

Base.prototype.sendLocalPlannerGoal = function(plan, look_at_x, look_at_y) {
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
  var goal = new ROSLIB.Message({
    goal : {
      plan : plan,
      orientation_constraint : {
        frame : "/map",
        look_at : {
          x : look_at_x,
          y : look_at_y
        }
      },
    }
  });
  this.local_planner_topic.publish(goal);
  // console.log(this.cmd_vel_topic);
  // console.log(twist);
  console.log("sendGoal to local planner: " + goal);
};

module.exports = Base;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"eventemitter2":7}],2:[function(require,module,exports){
'use strict';

exports.Robot    = require('./robot');
exports.Ed       = require('./ed');
exports.Hardware = require('./hardware');
exports.Head     = require('./head');
exports.Base     = require('./base');

},{"./base":1,"./ed":3,"./hardware":4,"./head":5,"./robot":6}],3:[function(require,module,exports){
(function (global){
'use strict';

var EventEmitter2 = require('eventemitter2').EventEmitter2;
var _ = (typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);

var entities_topic_name = 'ed/gui/entities';

var query_meshes_service_name = 'ed/gui/query_meshes';

var snapshot_service_name = 'ed/gui/get_snapshots';

var models_service_name ='ed/gui/get_models';

var fit_model_service_name = 'ed/gui/fit_model';

var make_snapshot_service_name = 'ed/make_snapshot';

var navigate_to_service_name = 'ed/navigate_to';

var create_walls_service_name = 'ed/create_walls';

function Ed (robot) {
  EventEmitter2.apply(this);

  var ros = robot.ros;

  // World model entities
  this.entities = [];
  this.meshes = {};
  this.entities_topic = ros.Topic({
    name: entities_topic_name,
    messageType: 'ed_gui_server/EntityInfos',
    throttle_rate: 5000,
  });
  // this.entities_topic.subscribe(this.onEntities.bind(this));

  // Query meshes
  this.query_meshes_service = ros.Service({
    name: query_meshes_service_name,
    serviceType: 'ed_gui_server/QueryMeshes',
  });

  // World model snapshots
  this.snapshots = {};
  this.snapshot_revision = 0;
  this.snapshot_service = ros.Service({
    name: snapshot_service_name,
    serviceType: 'ed_sensor_integration/GetSnapshots',
  });

  this.delete_snapshot_queue = [];

  // timer_id to avoid updating while one is in progress
  // during an update, it will be null
  this.snapshots_timer_id = null;
  this.start_update_loop();

  this.make_snapshot_service = ros.Service({
    name: make_snapshot_service_name,
    serviceType: 'ed_sensor_integration/MakeSnapshot',
  });

  // World model database
  this.models = {};
  this.models_service = ros.Service({
    name: models_service_name,
    serviceType: 'ed_sensor_integration/GetModels',
  });
  this.update_models();

  // World model fitting
  this.fit_model_service = ros.Service({
    name: fit_model_service_name,
    serviceType: 'ed_sensor_integration/FitModel',
  });

  this.navigate_to_service = ros.Service({
    name: navigate_to_service_name,
    serviceType: 'ed_sensor_integration/NavigateTo',
  });

  this.create_walls_service = ros.Service({
    name: create_walls_service_name,
    serviceType: 'std_srvs/Empty',
  });
}

Ed.prototype = Object.create(EventEmitter2.prototype);

/**
 * World model entities
 */

Object.defineProperty(Ed.prototype, 'entities', {
  get: function() {
    return this._entities;
  },
  set: function(entities) {
    this._entities = entities;
    this.emit('entities', entities);
  }
});

Ed.prototype.onEntities = function(msg) {
  console.log(msg);
  this.entities = msg.entities;

  var mesh_queue = [];
  this.entities.forEach(function (entity) {
    if (this.meshes[entity.id] && this.meshes[entity.id].revision === entity.mesh_revision) {
      console.log('correct revision');
    } else {
      mesh_queue.push(entity.id);
    }
  }.bind(this));

  console.log(mesh_queue);
  var request = { entity_ids: mesh_queue};
  this.query_meshes_service.callService(request, function (response) {
    var error_msg = response.error_msg;
    if (error_msg) {
      console.warn('query_meshes_service:', error_msg);
    }

    response.entity_ids.forEach(function (id, i) {
      // TODO: check revisions
      this.meshes[id] = response.meshes[i];
    }.bind(this));
  }.bind(this));
};

/**
 * World model snapshots
 */

Ed.prototype.update_snapshots = function(callback, max_num_revisions) {
  callback = callback || _.noop;
  max_num_revisions = max_num_revisions || 0;

  var request = {
    revision: this.snapshot_revision,
    delete_ids: this.delete_snapshot_queue,
    max_num_revisions: max_num_revisions,
  };
  if (this.delete_snapshot_queue.length) {
    console.log('deleting snapshots:', this.delete_snapshot_queue);
    this.snapshots = _.omit(this.snapshots, this.delete_snapshot_queue);
    this.delete_snapshot_queue = [];
  }

  var start_time = new Date();

  // console.debug('update %d snapshots', max_num_revisions);
  this.snapshot_service.callService(request, function (response) {
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
  }.bind(this), function (err) {
    console.warn('update_snapshots failed:', err);
    callback(err, null);
  }.bind(this));
};

function process_snapshots (response) {
  var snapshots = {};

  response.image_ids.forEach(function (id, i) {
    var image_binary = response.images[i];

    var encoding = image_binary.encoding;
    image_binary.src = 'data:image/' + encoding + ';base64,' + image_binary.data;
    image_binary.short_id = _.trunc(id, {
      'length': 8,
      'omission': '',
    });
    image_binary.id = id;

    var ts = response.image_timestamps[i];
    image_binary.timestamp = new Date(ts.secs + ts.nsecs*1e-9);

    snapshots[id] = image_binary;
  }.bind(this));

  return snapshots;
}

Ed.prototype.delete_snapshot = function(id) {
  this.delete_snapshot_queue.push(id);
  this.force_update();
};

Ed.prototype.start_update_loop = function () {
  this.snapshots_timer_id = null;
  this.update_snapshots(function update_again(err, new_snapshots) {
    // console.debug('i got %d new snapshots', _.size(new_snapshots));

    var delay = 500;
    if (err) {
      delay = 5000;
    } else if (_.size(_.omit(new_snapshots, 'current'))) {
      delay = 0;
    }

    this.snapshots_timer_id = _.delay(function (callback) {
      this.snapshots_timer_id = null;
      this.update_snapshots(callback);
    }.bind(this), delay, update_again.bind(this));
  }.bind(this), 1);
};

Ed.prototype.force_update = function() {
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

Ed.prototype.make_snapshot = function(callback) {
  this.make_snapshot_service.callService(null, callback);
  this.force_update();
};

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

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"eventemitter2":7}],4:[function(require,module,exports){
(function (global){
'use strict';

var EventEmitter2 = require('eventemitter2').EventEmitter2;
var _ = (typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);
var ROSLIB = (typeof window !== "undefined" ? window['ROSLIB'] : typeof global !== "undefined" ? global['ROSLIB'] : null);

// Hardware constants

var levels = {
  STALE:        0,
  IDLE:         1,
  OPERATIONAL:  2,
  HOMING:       3,
  ERROR:        4,
};

// Robot specific Hardware constants that should come from the parameter server

/*
|   Name  | Homeable | HomeableMandatory | Resetable |
|---------|----------|-------------------|-----------|
| Base    | no       | no                | yes       |
| Spindle | yes      | yes               | yes       |
| Arm     | yes      | no                | yes       |
| Head    | no       | no                | no        |
*/
var properties = {
  // Name     | Homeable | HomeableMandatory | Resetable |
  all:        [ true     , false             , true      ],
  base:       [ false    , false             , true      ],
  spindle:    [ true     , true              , true      ],
  left_arm:   [ true     , false             , true      ],
  right_arm:  [ true     , false             , true      ],
  head:       [ false    , false             , false     ],
};
// transform the array of bools to an object
properties = _.mapValues(properties, function (v) {
  return {
    homeable:           v[0],
    homeable_mandatory: v[1],
    resetable:          v[2],
  };
});

// define how the actions map to hardware commands
var commands = {
  home:  21,
  start: 22,
  stop:  23,
  reset: 24,
};

var hardware_ids = {
  'all':        0,
  'base':       1,
  'spindle':    2,
  'left_arm':   3,
  'right_arm':  4,
  'head':       5,
};

var default_status = _.mapValues(hardware_ids, function (value, name) {
  return {
    name: name,
    level: levels.STALE,
    homed: false,
  };
});

var HARDWARE_TIMEOUT = 2000; // ms

var BATTERY_TIMEOUT = 2000; // ms

var EBUTTONS_TIMEOUT = 2000; // ms

/**
 * Hardware module
 * @param {Robot} robot A valid robot object
 */
function Hardware (robot) {
  EventEmitter2.apply(this);

  var ros = robot.ros;

  // hardware status init
  this.status = default_status;
  this.status_topic = ros.Topic({
    name: 'hardware_status',
    messageType: 'diagnostic_msgs/DiagnosticArray',
    throttle_rate: 500,
  });
  this.status_topic.subscribe(this.onStatus.bind(this));

  this.command_topic = ros.Topic({
    name: 'dashboard_ctrlcmds',
    messageType: 'std_msgs/UInt8MultiArray',
  });

  // battery status init
  this.battery = null;
  this.battery_topic = ros.Topic({
    name : 'battery_percentage',
    messageType : 'std_msgs/Float32',
    throttle_rate: 200,
  });
  this.battery_topic.subscribe(this.onBattery.bind(this));

  // ebutton status init
  this.battery = null;
  this.ebutton_topic = ros.Topic({
    name : 'ebutton_status',
    messageType : 'diagnostic_msgs/DiagnosticArray',
    throttle_rate: 200,
  });
  this.ebutton_topic.subscribe(this.onEbuttons.bind(this));
}

Hardware.levels = levels;

Hardware.prototype = Object.create(EventEmitter2.prototype);

/**
 * Public status API
 */

Object.defineProperty(Hardware.prototype, 'status', {
  get: function() {
    return this._status;
  },
  set: function(status) {
    this._status = status;
    this.emit('status', status);
  }
});

var resetHardwareLater = _.debounce(resetHardware, HARDWARE_TIMEOUT);
Hardware.prototype.onStatus = function(msg) {
  this.status = diagnosticMsgToStatus(msg);
  resetHardwareLater.call(this);
};

function resetHardware () {
  console.log('hardware message timeout');
  this.status = default_status;
}

Hardware.prototype.send_command = function(part, command) {
  var i1 = hardware_ids[part];
  var i2 = commands[command];
  console.log('hardware command: %s %s (%i, %i)', command, part, i1, i2);

  var cmd = new ROSLIB.Message({
    data: [i1, i2],
  });

  this.command_topic.publish(cmd);
};

/**
 * Public battery API
 */

Object.defineProperty(Hardware.prototype, 'battery', {
  get: function() {
    return this._battery;
  },
  set: function(battery) {
    this._battery = battery;
    this.emit('battery', battery);
  }
});

var resetBatteryLater = _.debounce(resetBattery, BATTERY_TIMEOUT);
Hardware.prototype.onBattery = function(message) {
    var percent = message.data; // float32
    this.battery = percent;
    resetBatteryLater.call(this);
};

function resetBattery () {
  console.log('battery message timeout');
  this.battery = null;
}

/**
 * Public ebutton status API
 */

var resetEbuttonsLater = _.debounce(resetEbuttons, EBUTTONS_TIMEOUT);
Object.defineProperty(Hardware.prototype, 'ebuttons', {
  get: function() {
    return this._ebuttons;
  },
  set: function(ebuttons) {
    this._ebuttons = ebuttons;
    this.emit('ebuttons', ebuttons);
  }
});

Hardware.prototype.onEbuttons = function(msg) {
  var status = _.map(msg.status, function (status) {
    return _.pick(status, ['name', 'level']);
  });

  this.ebuttons = status;
  resetEbuttonsLater.call(this);
};

function resetEbuttons () {
  console.log('ebuttons message timeout');
  this.ebuttons = null;
}

/**
 * Private functions
 */

// convert an incoming status message to actual workable properties
function diagnosticMsgToStatus(message) {
  var parts = message.status.map(function (part) {
    return {
      name: part.name,
      level: part.level,
      homed: part.message === 'homed',
    };
  });
  var hardware_status = _.indexBy(parts, 'name');

  // fill all missing hardware parts with 'idle'
  _.defaults(hardware_status, default_status);

  _.mapValues(hardware_status, function (part) {
    part.actions = getActions(part);
    return part;
  });

  return hardware_status;
}

// return all possible actions for a hardware part
function getActions(part) {
  var props = properties[part.name];
  if (!props) {
    return;
  }

  var level = part ? part.level : -1;
  var homed = part ? part.homed : false;

  var actions = {};

  // only show the home action if homeable
  if (props.homeable) {
    actions.home = {
      enabled: level === levels.IDLE,
      warning: homed ?
        'This part was already homed, Are you sure you want to redo homing?' : false,
    };
  }

  // always show start action
  actions.start = {
    enabled: level === levels.IDLE && (homed || !props.homeable_mandatory),
    warning: props.homeable && !homed ?
      'This part is not yet homed, Are you sure you want to proceed?' : false,
  };

  // always show stop action
  actions.stop = {
    enabled: level === levels.HOMING || level === levels.OPERATIONAL,
  };

  // only show reset action if resetable
  if (props.resetable) {
    actions.reset = {
      enabled: level === levels.ERROR,
    };
  }

  return actions;
}

module.exports = Hardware;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"eventemitter2":7}],5:[function(require,module,exports){
(function (global){
'use strict';

var EventEmitter2 = require('eventemitter2').EventEmitter2;
var ROSLIB = (typeof window !== "undefined" ? window['ROSLIB'] : typeof global !== "undefined" ? global['ROSLIB'] : null);

function Head (robot) {
  EventEmitter2.apply(this);

  var ros = robot.ros;

  this.goal = null;
  // this.head_ac = ros.ActionClient({
  //   serverName: 'head_ref/action_server',
  //   actionName: 'head_ref/HeadReferenceAction',
  // });
}

Head.prototype = Object.create(EventEmitter2.prototype);

Head.prototype.send_goal = function() {
  this.goal = new ROSLIB.Goal({
    actionClient: this.head_ac,
    goalMessage: {
      goal_type: null,          // either LOOKAT or PAN_TILT

      priority: 1,           // [1-255] (action client calls with the same priority cancel each other)

      pan_vel: null,            // pan_vel
      tilt_vel: null,           // tilt_vel

      // in case of LOOKAT:
      target_point: null,       // use in case of LOOKAT

      // in case of PAN_TILT
      pan: null,                // use in case of PAN_TILT
      tilt: null,               // use in case of PAN_TILT

      end_time: null            // goal cancels automatically after this time (seconds), if 0, no auto cancel
    }
  });

  this.goal.on('feedback', function(feedback) {
    console.log('Feedback:', feedback);
  });
  this.goal.on('result', function(result) {
    console.log('Result:', result);
  });
};

module.exports = Head;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"eventemitter2":7}],6:[function(require,module,exports){
(function (global){
'use strict';

var EventEmitter2 = require('eventemitter2').EventEmitter2;
var ROSLIB = (typeof window !== "undefined" ? window['ROSLIB'] : typeof global !== "undefined" ? global['ROSLIB'] : null);

var Ed       = require('./ed');
var Hardware = require('./hardware');
var Head     = require('./head');
var Base     = require('./base');

// Private variables
var hostname = require('os').hostname() || "localhost";
var default_url = 'ws://' + hostname + ':9090';

var RECONNECT_TIMEOUT = 5000; // ms

// Robot constructor
function Robot () {
  // parent constructor
  EventEmitter2.apply(this);

  this.ros = new ROSLIB.Ros();

  this.ros.on('connection', this.onConnection.bind(this));
  this.ros.on('close', this.onClose.bind(this));
  this.ros.on('error', this.onError.bind(this));

  // reconnect behavior
  this.on('status', function (status) {
    switch (status) {
      case 'closed':
        setTimeout(this.connect.bind(this), RECONNECT_TIMEOUT);
    }
  });

  this.ed       = new Ed(this);
  this.hardware = new Hardware(this);
  this.head     = new Head(this);
  this.base     = new Base(this);
}

// inherit from EventEmitter2
Robot.prototype = Object.create(EventEmitter2.prototype);

// status getter + setter
Object.defineProperty(Robot.prototype, 'status', {
  get: function() {
    return this._status;
  },
  set: function(status) {
    this._status = status;
    this.emit('status', status);
  }
});

// start connection
Robot.prototype.connect = function (url) {
  this.url = url || this.url || default_url;
  console.log('connecting to ' + this.url);
  this.ros.connect(this.url);
  this.status = 'connecting';
};

// ros status event handling
Robot.prototype.onConnection = function() {
  console.log('connection');
  this.status = 'connected';
};

Robot.prototype.onClose = function() {
  console.log('connection closed');
  this.status = 'closed';
};

Robot.prototype.onError = function() {
  // console.log('connection error');
  this.status = 'error';
};

module.exports = Robot;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./base":1,"./ed":3,"./hardware":4,"./head":5,"eventemitter2":7,"os":8}],7:[function(require,module,exports){
(function (global){
'use strict';

module.exports = {
  EventEmitter2: global.EventEmitter2
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],8:[function(require,module,exports){
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

},{}]},{},[2])(2)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvYmFzZS5qcyIsImxpYi9icm93c2VyLmpzIiwibGliL2VkLmpzIiwibGliL2hhcmR3YXJlLmpzIiwibGliL2hlYWQuanMiLCJsaWIvcm9ib3QuanMiLCJsaWIvc2hpbXMvZXZlbnRlbWl0dGVyMi5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9vcy1icm93c2VyaWZ5L2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDL0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2hWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQzNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRXZlbnRFbWl0dGVyMiA9IHJlcXVpcmUoJ2V2ZW50ZW1pdHRlcjInKS5FdmVudEVtaXR0ZXIyO1xudmFyIFJPU0xJQiA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydST1NMSUInXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ1JPU0xJQiddIDogbnVsbCk7XG5cbmZ1bmN0aW9uIEJhc2UgKHJvYm90KSB7XG4gIEV2ZW50RW1pdHRlcjIuYXBwbHkodGhpcyk7XG5cbiAgdmFyIHJvcyA9IHJvYm90LnJvcztcblxuICB0aGlzLmNtZF92ZWxfdG9waWMgPSByb3MuVG9waWMoe1xuICAgIG5hbWU6ICdiYXNlL3JlZmVyZW5jZXMnLFxuICAgIG1lc3NhZ2VUeXBlOiAnZ2VvbWV0cnlfbXNncy9Ud2lzdCcsXG4gIH0pO1xuXG4gIHRoaXMubG9jYWxfcGxhbm5lcl90b3BpYyA9IHJvcy5Ub3BpYyh7XG4gICAgbmFtZTogJ2xvY2FsX3BsYW5uZXIvYWN0aW9uX3NlcnZlci9nb2FsJyxcbiAgICBtZXNzYWdlVHlwZTogJ2NiX3BsYW5uZXJfbXNnc19zcnZzL0xvY2FsUGxhbm5lckFjdGlvbkdvYWwnLFxuICB9KTtcbn1cblxuQmFzZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RW1pdHRlcjIucHJvdG90eXBlKTtcblxuQmFzZS5wcm90b3R5cGUuc2VuZFR3aXN0ID0gZnVuY3Rpb24odngsIHZ5LCB2dGgpIHtcbiAgLy8gcHVibGlzaCB0aGUgY29tbWFuZFxuICB2YXIgdHdpc3QgPSBuZXcgUk9TTElCLk1lc3NhZ2Uoe1xuICAgIGFuZ3VsYXIgOiB7XG4gICAgICB4IDogMCxcbiAgICAgIHkgOiAwLFxuICAgICAgeiA6IHZ0aFxuICAgIH0sXG4gICAgbGluZWFyIDoge1xuICAgICAgeCA6IHZ4LFxuICAgICAgeSA6IHZ5LFxuICAgICAgeiA6IDBcbiAgICB9XG4gIH0pO1xuICB0aGlzLmNtZF92ZWxfdG9waWMucHVibGlzaCh0d2lzdCk7XG4gIC8vIGNvbnNvbGUubG9nKHRoaXMuY21kX3ZlbF90b3BpYyk7XG4gIC8vIGNvbnNvbGUubG9nKHR3aXN0KTtcbiAgY29uc29sZS5sb2coXCJzZW5kVHdpc3Q6IFwiICsgdnggKyBcIixcIiArIHZ5ICsgXCIsXCIgKyB2dGgpO1xufTtcblxuQmFzZS5wcm90b3R5cGUuc2VuZExvY2FsUGxhbm5lckdvYWwgPSBmdW5jdGlvbihwbGFuLCBsb29rX2F0X3gsIGxvb2tfYXRfeSkge1xuICAvLyBzdGRfbXNncy9IZWFkZXIgaGVhZGVyXG4gIC8vICAgdWludDMyIHNlcVxuICAvLyAgIHRpbWUgc3RhbXBcbiAgLy8gICBzdHJpbmcgZnJhbWVfaWRcbiAgLy8gYWN0aW9ubGliX21zZ3MvR29hbElEIGdvYWxfaWRcbiAgLy8gICB0aW1lIHN0YW1wXG4gIC8vICAgc3RyaW5nIGlkXG4gIC8vIGNiX3BsYW5uZXJfbXNnc19zcnZzL0xvY2FsUGxhbm5lckdvYWwgZ29hbFxuICAvLyAgIGdlb21ldHJ5X21zZ3MvUG9zZVN0YW1wZWRbXSBwbGFuXG4gIC8vICAgICBzdGRfbXNncy9IZWFkZXIgaGVhZGVyXG4gIC8vICAgICAgIHVpbnQzMiBzZXFcbiAgLy8gICAgICAgdGltZSBzdGFtcFxuICAvLyAgICAgICBzdHJpbmcgZnJhbWVfaWRcbiAgLy8gICAgIGdlb21ldHJ5X21zZ3MvUG9zZSBwb3NlXG4gIC8vICAgICAgIGdlb21ldHJ5X21zZ3MvUG9pbnQgcG9zaXRpb25cbiAgLy8gICAgICAgICBmbG9hdDY0IHhcbiAgLy8gICAgICAgICBmbG9hdDY0IHlcbiAgLy8gICAgICAgICBmbG9hdDY0IHpcbiAgLy8gICAgICAgZ2VvbWV0cnlfbXNncy9RdWF0ZXJuaW9uIG9yaWVudGF0aW9uXG4gIC8vICAgICAgICAgZmxvYXQ2NCB4XG4gIC8vICAgICAgICAgZmxvYXQ2NCB5XG4gIC8vICAgICAgICAgZmxvYXQ2NCB6XG4gIC8vICAgICAgICAgZmxvYXQ2NCB3XG4gIC8vICAgY2JfcGxhbm5lcl9tc2dzX3NydnMvT3JpZW50YXRpb25Db25zdHJhaW50IG9yaWVudGF0aW9uX2NvbnN0cmFpbnRcbiAgLy8gICAgIHN0cmluZyBmcmFtZVxuICAvLyAgICAgZ2VvbWV0cnlfbXNncy9Qb2ludCBsb29rX2F0XG4gIC8vICAgICAgIGZsb2F0NjQgeFxuICAvLyAgICAgICBmbG9hdDY0IHlcbiAgLy8gICAgICAgZmxvYXQ2NCB6XG4gIC8vICAgICBmbG9hdDY0IGFuZ2xlX29mZnNldFxuXG4gIC8vIHB1Ymxpc2ggdGhlIGNvbW1hbmRcbiAgdmFyIGdvYWwgPSBuZXcgUk9TTElCLk1lc3NhZ2Uoe1xuICAgIGdvYWwgOiB7XG4gICAgICBwbGFuIDogcGxhbixcbiAgICAgIG9yaWVudGF0aW9uX2NvbnN0cmFpbnQgOiB7XG4gICAgICAgIGZyYW1lIDogXCIvbWFwXCIsXG4gICAgICAgIGxvb2tfYXQgOiB7XG4gICAgICAgICAgeCA6IGxvb2tfYXRfeCxcbiAgICAgICAgICB5IDogbG9va19hdF95XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgfVxuICB9KTtcbiAgdGhpcy5sb2NhbF9wbGFubmVyX3RvcGljLnB1Ymxpc2goZ29hbCk7XG4gIC8vIGNvbnNvbGUubG9nKHRoaXMuY21kX3ZlbF90b3BpYyk7XG4gIC8vIGNvbnNvbGUubG9nKHR3aXN0KTtcbiAgY29uc29sZS5sb2coXCJzZW5kR29hbCB0byBsb2NhbCBwbGFubmVyOiBcIiArIGdvYWwpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBCYXNlO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLlJvYm90ICAgID0gcmVxdWlyZSgnLi9yb2JvdCcpO1xuZXhwb3J0cy5FZCAgICAgICA9IHJlcXVpcmUoJy4vZWQnKTtcbmV4cG9ydHMuSGFyZHdhcmUgPSByZXF1aXJlKCcuL2hhcmR3YXJlJyk7XG5leHBvcnRzLkhlYWQgICAgID0gcmVxdWlyZSgnLi9oZWFkJyk7XG5leHBvcnRzLkJhc2UgICAgID0gcmVxdWlyZSgnLi9iYXNlJyk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBFdmVudEVtaXR0ZXIyID0gcmVxdWlyZSgnZXZlbnRlbWl0dGVyMicpLkV2ZW50RW1pdHRlcjI7XG52YXIgXyA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydfJ10gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsWydfJ10gOiBudWxsKTtcblxudmFyIGVudGl0aWVzX3RvcGljX25hbWUgPSAnZWQvZ3VpL2VudGl0aWVzJztcblxudmFyIHF1ZXJ5X21lc2hlc19zZXJ2aWNlX25hbWUgPSAnZWQvZ3VpL3F1ZXJ5X21lc2hlcyc7XG5cbnZhciBzbmFwc2hvdF9zZXJ2aWNlX25hbWUgPSAnZWQvZ3VpL2dldF9zbmFwc2hvdHMnO1xuXG52YXIgbW9kZWxzX3NlcnZpY2VfbmFtZSA9J2VkL2d1aS9nZXRfbW9kZWxzJztcblxudmFyIGZpdF9tb2RlbF9zZXJ2aWNlX25hbWUgPSAnZWQvZ3VpL2ZpdF9tb2RlbCc7XG5cbnZhciBtYWtlX3NuYXBzaG90X3NlcnZpY2VfbmFtZSA9ICdlZC9tYWtlX3NuYXBzaG90JztcblxudmFyIG5hdmlnYXRlX3RvX3NlcnZpY2VfbmFtZSA9ICdlZC9uYXZpZ2F0ZV90byc7XG5cbnZhciBjcmVhdGVfd2FsbHNfc2VydmljZV9uYW1lID0gJ2VkL2NyZWF0ZV93YWxscyc7XG5cbmZ1bmN0aW9uIEVkIChyb2JvdCkge1xuICBFdmVudEVtaXR0ZXIyLmFwcGx5KHRoaXMpO1xuXG4gIHZhciByb3MgPSByb2JvdC5yb3M7XG5cbiAgLy8gV29ybGQgbW9kZWwgZW50aXRpZXNcbiAgdGhpcy5lbnRpdGllcyA9IFtdO1xuICB0aGlzLm1lc2hlcyA9IHt9O1xuICB0aGlzLmVudGl0aWVzX3RvcGljID0gcm9zLlRvcGljKHtcbiAgICBuYW1lOiBlbnRpdGllc190b3BpY19uYW1lLFxuICAgIG1lc3NhZ2VUeXBlOiAnZWRfZ3VpX3NlcnZlci9FbnRpdHlJbmZvcycsXG4gICAgdGhyb3R0bGVfcmF0ZTogNTAwMCxcbiAgfSk7XG4gIC8vIHRoaXMuZW50aXRpZXNfdG9waWMuc3Vic2NyaWJlKHRoaXMub25FbnRpdGllcy5iaW5kKHRoaXMpKTtcblxuICAvLyBRdWVyeSBtZXNoZXNcbiAgdGhpcy5xdWVyeV9tZXNoZXNfc2VydmljZSA9IHJvcy5TZXJ2aWNlKHtcbiAgICBuYW1lOiBxdWVyeV9tZXNoZXNfc2VydmljZV9uYW1lLFxuICAgIHNlcnZpY2VUeXBlOiAnZWRfZ3VpX3NlcnZlci9RdWVyeU1lc2hlcycsXG4gIH0pO1xuXG4gIC8vIFdvcmxkIG1vZGVsIHNuYXBzaG90c1xuICB0aGlzLnNuYXBzaG90cyA9IHt9O1xuICB0aGlzLnNuYXBzaG90X3JldmlzaW9uID0gMDtcbiAgdGhpcy5zbmFwc2hvdF9zZXJ2aWNlID0gcm9zLlNlcnZpY2Uoe1xuICAgIG5hbWU6IHNuYXBzaG90X3NlcnZpY2VfbmFtZSxcbiAgICBzZXJ2aWNlVHlwZTogJ2VkX3NlbnNvcl9pbnRlZ3JhdGlvbi9HZXRTbmFwc2hvdHMnLFxuICB9KTtcblxuICB0aGlzLmRlbGV0ZV9zbmFwc2hvdF9xdWV1ZSA9IFtdO1xuXG4gIC8vIHRpbWVyX2lkIHRvIGF2b2lkIHVwZGF0aW5nIHdoaWxlIG9uZSBpcyBpbiBwcm9ncmVzc1xuICAvLyBkdXJpbmcgYW4gdXBkYXRlLCBpdCB3aWxsIGJlIG51bGxcbiAgdGhpcy5zbmFwc2hvdHNfdGltZXJfaWQgPSBudWxsO1xuICB0aGlzLnN0YXJ0X3VwZGF0ZV9sb29wKCk7XG5cbiAgdGhpcy5tYWtlX3NuYXBzaG90X3NlcnZpY2UgPSByb3MuU2VydmljZSh7XG4gICAgbmFtZTogbWFrZV9zbmFwc2hvdF9zZXJ2aWNlX25hbWUsXG4gICAgc2VydmljZVR5cGU6ICdlZF9zZW5zb3JfaW50ZWdyYXRpb24vTWFrZVNuYXBzaG90JyxcbiAgfSk7XG5cbiAgLy8gV29ybGQgbW9kZWwgZGF0YWJhc2VcbiAgdGhpcy5tb2RlbHMgPSB7fTtcbiAgdGhpcy5tb2RlbHNfc2VydmljZSA9IHJvcy5TZXJ2aWNlKHtcbiAgICBuYW1lOiBtb2RlbHNfc2VydmljZV9uYW1lLFxuICAgIHNlcnZpY2VUeXBlOiAnZWRfc2Vuc29yX2ludGVncmF0aW9uL0dldE1vZGVscycsXG4gIH0pO1xuICB0aGlzLnVwZGF0ZV9tb2RlbHMoKTtcblxuICAvLyBXb3JsZCBtb2RlbCBmaXR0aW5nXG4gIHRoaXMuZml0X21vZGVsX3NlcnZpY2UgPSByb3MuU2VydmljZSh7XG4gICAgbmFtZTogZml0X21vZGVsX3NlcnZpY2VfbmFtZSxcbiAgICBzZXJ2aWNlVHlwZTogJ2VkX3NlbnNvcl9pbnRlZ3JhdGlvbi9GaXRNb2RlbCcsXG4gIH0pO1xuXG4gIHRoaXMubmF2aWdhdGVfdG9fc2VydmljZSA9IHJvcy5TZXJ2aWNlKHtcbiAgICBuYW1lOiBuYXZpZ2F0ZV90b19zZXJ2aWNlX25hbWUsXG4gICAgc2VydmljZVR5cGU6ICdlZF9zZW5zb3JfaW50ZWdyYXRpb24vTmF2aWdhdGVUbycsXG4gIH0pO1xuXG4gIHRoaXMuY3JlYXRlX3dhbGxzX3NlcnZpY2UgPSByb3MuU2VydmljZSh7XG4gICAgbmFtZTogY3JlYXRlX3dhbGxzX3NlcnZpY2VfbmFtZSxcbiAgICBzZXJ2aWNlVHlwZTogJ3N0ZF9zcnZzL0VtcHR5JyxcbiAgfSk7XG59XG5cbkVkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnRFbWl0dGVyMi5wcm90b3R5cGUpO1xuXG4vKipcbiAqIFdvcmxkIG1vZGVsIGVudGl0aWVzXG4gKi9cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEVkLnByb3RvdHlwZSwgJ2VudGl0aWVzJywge1xuICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9lbnRpdGllcztcbiAgfSxcbiAgc2V0OiBmdW5jdGlvbihlbnRpdGllcykge1xuICAgIHRoaXMuX2VudGl0aWVzID0gZW50aXRpZXM7XG4gICAgdGhpcy5lbWl0KCdlbnRpdGllcycsIGVudGl0aWVzKTtcbiAgfVxufSk7XG5cbkVkLnByb3RvdHlwZS5vbkVudGl0aWVzID0gZnVuY3Rpb24obXNnKSB7XG4gIGNvbnNvbGUubG9nKG1zZyk7XG4gIHRoaXMuZW50aXRpZXMgPSBtc2cuZW50aXRpZXM7XG5cbiAgdmFyIG1lc2hfcXVldWUgPSBbXTtcbiAgdGhpcy5lbnRpdGllcy5mb3JFYWNoKGZ1bmN0aW9uIChlbnRpdHkpIHtcbiAgICBpZiAodGhpcy5tZXNoZXNbZW50aXR5LmlkXSAmJiB0aGlzLm1lc2hlc1tlbnRpdHkuaWRdLnJldmlzaW9uID09PSBlbnRpdHkubWVzaF9yZXZpc2lvbikge1xuICAgICAgY29uc29sZS5sb2coJ2NvcnJlY3QgcmV2aXNpb24nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbWVzaF9xdWV1ZS5wdXNoKGVudGl0eS5pZCk7XG4gICAgfVxuICB9LmJpbmQodGhpcykpO1xuXG4gIGNvbnNvbGUubG9nKG1lc2hfcXVldWUpO1xuICB2YXIgcmVxdWVzdCA9IHsgZW50aXR5X2lkczogbWVzaF9xdWV1ZX07XG4gIHRoaXMucXVlcnlfbWVzaGVzX3NlcnZpY2UuY2FsbFNlcnZpY2UocmVxdWVzdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgdmFyIGVycm9yX21zZyA9IHJlc3BvbnNlLmVycm9yX21zZztcbiAgICBpZiAoZXJyb3JfbXNnKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ3F1ZXJ5X21lc2hlc19zZXJ2aWNlOicsIGVycm9yX21zZyk7XG4gICAgfVxuXG4gICAgcmVzcG9uc2UuZW50aXR5X2lkcy5mb3JFYWNoKGZ1bmN0aW9uIChpZCwgaSkge1xuICAgICAgLy8gVE9ETzogY2hlY2sgcmV2aXNpb25zXG4gICAgICB0aGlzLm1lc2hlc1tpZF0gPSByZXNwb25zZS5tZXNoZXNbaV07XG4gICAgfS5iaW5kKHRoaXMpKTtcbiAgfS5iaW5kKHRoaXMpKTtcbn07XG5cbi8qKlxuICogV29ybGQgbW9kZWwgc25hcHNob3RzXG4gKi9cblxuRWQucHJvdG90eXBlLnVwZGF0ZV9zbmFwc2hvdHMgPSBmdW5jdGlvbihjYWxsYmFjaywgbWF4X251bV9yZXZpc2lvbnMpIHtcbiAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBfLm5vb3A7XG4gIG1heF9udW1fcmV2aXNpb25zID0gbWF4X251bV9yZXZpc2lvbnMgfHwgMDtcblxuICB2YXIgcmVxdWVzdCA9IHtcbiAgICByZXZpc2lvbjogdGhpcy5zbmFwc2hvdF9yZXZpc2lvbixcbiAgICBkZWxldGVfaWRzOiB0aGlzLmRlbGV0ZV9zbmFwc2hvdF9xdWV1ZSxcbiAgICBtYXhfbnVtX3JldmlzaW9uczogbWF4X251bV9yZXZpc2lvbnMsXG4gIH07XG4gIGlmICh0aGlzLmRlbGV0ZV9zbmFwc2hvdF9xdWV1ZS5sZW5ndGgpIHtcbiAgICBjb25zb2xlLmxvZygnZGVsZXRpbmcgc25hcHNob3RzOicsIHRoaXMuZGVsZXRlX3NuYXBzaG90X3F1ZXVlKTtcbiAgICB0aGlzLnNuYXBzaG90cyA9IF8ub21pdCh0aGlzLnNuYXBzaG90cywgdGhpcy5kZWxldGVfc25hcHNob3RfcXVldWUpO1xuICAgIHRoaXMuZGVsZXRlX3NuYXBzaG90X3F1ZXVlID0gW107XG4gIH1cblxuICB2YXIgc3RhcnRfdGltZSA9IG5ldyBEYXRlKCk7XG5cbiAgLy8gY29uc29sZS5kZWJ1ZygndXBkYXRlICVkIHNuYXBzaG90cycsIG1heF9udW1fcmV2aXNpb25zKTtcbiAgdGhpcy5zbmFwc2hvdF9zZXJ2aWNlLmNhbGxTZXJ2aWNlKHJlcXVlc3QsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgIHZhciBkaWZmID0gbmV3IERhdGUoKSAtIHN0YXJ0X3RpbWU7XG4gICAgdGhpcy5lbWl0KCd1cGRhdGVfdGltZScsIGRpZmYpO1xuICAgIGlmICghcmVzcG9uc2UubmV3X3JldmlzaW9uICYmIF8uc2l6ZSh0aGlzLnNuYXBzaG90cykgfHwgLy8gcmV2aXNpb24gMCAmJiBvbGQgc25hcHNob3RzXG4gICAgICAgIHJlc3BvbnNlLm5ld19yZXZpc2lvbiA8IHRoaXMuc25hcHNob3RfcmV2aXNpb24pIHtcbiAgICAgIGNvbnNvbGUud2FybignZWQgcmVzdGFydCBkZXRlY3RlZCwgcmVsb2FkaW5nLi4uJyk7XG4gICAgICB0aGlzLnNuYXBzaG90cyA9IHt9OyAvLyBjbGVhciBzbmFwc2hvdHNcbiAgICAgIHRoaXMudXBkYXRlX21vZGVscygpOyAvLyByZWxvYWQgbW9kZWwgZGJcbiAgICB9XG4gICAgdGhpcy5zbmFwc2hvdF9yZXZpc2lvbiA9IHJlc3BvbnNlLm5ld19yZXZpc2lvbjtcblxuICAgIHZhciBzbmFwc2hvdHMgPSBwcm9jZXNzX3NuYXBzaG90cyhyZXNwb25zZSk7XG4gICAgXy5hc3NpZ24odGhpcy5zbmFwc2hvdHMsIHNuYXBzaG90cyk7XG5cbiAgICB0aGlzLmVtaXQoJ3NuYXBzaG90cycsIHRoaXMuc25hcHNob3RzKTtcblxuICAgIGNhbGxiYWNrKG51bGwsIHNuYXBzaG90cyk7XG4gIH0uYmluZCh0aGlzKSwgZnVuY3Rpb24gKGVycikge1xuICAgIGNvbnNvbGUud2FybigndXBkYXRlX3NuYXBzaG90cyBmYWlsZWQ6JywgZXJyKTtcbiAgICBjYWxsYmFjayhlcnIsIG51bGwpO1xuICB9LmJpbmQodGhpcykpO1xufTtcblxuZnVuY3Rpb24gcHJvY2Vzc19zbmFwc2hvdHMgKHJlc3BvbnNlKSB7XG4gIHZhciBzbmFwc2hvdHMgPSB7fTtcblxuICByZXNwb25zZS5pbWFnZV9pZHMuZm9yRWFjaChmdW5jdGlvbiAoaWQsIGkpIHtcbiAgICB2YXIgaW1hZ2VfYmluYXJ5ID0gcmVzcG9uc2UuaW1hZ2VzW2ldO1xuXG4gICAgdmFyIGVuY29kaW5nID0gaW1hZ2VfYmluYXJ5LmVuY29kaW5nO1xuICAgIGltYWdlX2JpbmFyeS5zcmMgPSAnZGF0YTppbWFnZS8nICsgZW5jb2RpbmcgKyAnO2Jhc2U2NCwnICsgaW1hZ2VfYmluYXJ5LmRhdGE7XG4gICAgaW1hZ2VfYmluYXJ5LnNob3J0X2lkID0gXy50cnVuYyhpZCwge1xuICAgICAgJ2xlbmd0aCc6IDgsXG4gICAgICAnb21pc3Npb24nOiAnJyxcbiAgICB9KTtcbiAgICBpbWFnZV9iaW5hcnkuaWQgPSBpZDtcblxuICAgIHZhciB0cyA9IHJlc3BvbnNlLmltYWdlX3RpbWVzdGFtcHNbaV07XG4gICAgaW1hZ2VfYmluYXJ5LnRpbWVzdGFtcCA9IG5ldyBEYXRlKHRzLnNlY3MgKyB0cy5uc2VjcyoxZS05KTtcblxuICAgIHNuYXBzaG90c1tpZF0gPSBpbWFnZV9iaW5hcnk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgcmV0dXJuIHNuYXBzaG90cztcbn1cblxuRWQucHJvdG90eXBlLmRlbGV0ZV9zbmFwc2hvdCA9IGZ1bmN0aW9uKGlkKSB7XG4gIHRoaXMuZGVsZXRlX3NuYXBzaG90X3F1ZXVlLnB1c2goaWQpO1xuICB0aGlzLmZvcmNlX3VwZGF0ZSgpO1xufTtcblxuRWQucHJvdG90eXBlLnN0YXJ0X3VwZGF0ZV9sb29wID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNuYXBzaG90c190aW1lcl9pZCA9IG51bGw7XG4gIHRoaXMudXBkYXRlX3NuYXBzaG90cyhmdW5jdGlvbiB1cGRhdGVfYWdhaW4oZXJyLCBuZXdfc25hcHNob3RzKSB7XG4gICAgLy8gY29uc29sZS5kZWJ1ZygnaSBnb3QgJWQgbmV3IHNuYXBzaG90cycsIF8uc2l6ZShuZXdfc25hcHNob3RzKSk7XG5cbiAgICB2YXIgZGVsYXkgPSA1MDA7XG4gICAgaWYgKGVycikge1xuICAgICAgZGVsYXkgPSA1MDAwO1xuICAgIH0gZWxzZSBpZiAoXy5zaXplKF8ub21pdChuZXdfc25hcHNob3RzLCAnY3VycmVudCcpKSkge1xuICAgICAgZGVsYXkgPSAwO1xuICAgIH1cblxuICAgIHRoaXMuc25hcHNob3RzX3RpbWVyX2lkID0gXy5kZWxheShmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgIHRoaXMuc25hcHNob3RzX3RpbWVyX2lkID0gbnVsbDtcbiAgICAgIHRoaXMudXBkYXRlX3NuYXBzaG90cyhjYWxsYmFjayk7XG4gICAgfS5iaW5kKHRoaXMpLCBkZWxheSwgdXBkYXRlX2FnYWluLmJpbmQodGhpcykpO1xuICB9LmJpbmQodGhpcyksIDEpO1xufTtcblxuRWQucHJvdG90eXBlLmZvcmNlX3VwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5zbmFwc2hvdHNfdGltZXJfaWQpIHtcbiAgICBjb25zb2xlLmxvZygnZm9yY2UgdXBkYXRlJyk7XG4gICAgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLnNuYXBzaG90c190aW1lcl9pZCk7XG4gICAgdGhpcy5zbmFwc2hvdHNfdGltZXJfaWQgPSBudWxsO1xuICAgIHRoaXMuc3RhcnRfdXBkYXRlX2xvb3AoKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBlbHNlIGFuIHVwZGF0ZSBpcyBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgY29uc29sZS5sb2coJ3VwZGF0ZSBpcyBhbHJlYWR5IGluIHByb2dyZXNzJyk7XG4gIH1cbn07XG5cbkVkLnByb3RvdHlwZS5tYWtlX3NuYXBzaG90ID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgdGhpcy5tYWtlX3NuYXBzaG90X3NlcnZpY2UuY2FsbFNlcnZpY2UobnVsbCwgY2FsbGJhY2spO1xuICB0aGlzLmZvcmNlX3VwZGF0ZSgpO1xufTtcblxuLyoqXG4gKiBXb3JsZCBtb2RlbCBkYXRhYmFzZVxuICovXG5cbkVkLnByb3RvdHlwZS51cGRhdGVfbW9kZWxzID0gZnVuY3Rpb24gdXBkYXRlX21vZGVscyAoKSB7XG4gIHZhciByZXF1ZXN0ID0ge307XG4gIHRoaXMubW9kZWxzX3NlcnZpY2UuY2FsbFNlcnZpY2UocmVxdWVzdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG5cbiAgICByZXNwb25zZS5tb2RlbF9uYW1lcy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lLCBpKSB7XG4gICAgICB2YXIgaW1hZ2VfYmluYXJ5ID0gcmVzcG9uc2UubW9kZWxfaW1hZ2VzW2ldO1xuXG4gICAgICB2YXIgZW5jb2RpbmcgPSBpbWFnZV9iaW5hcnkuZW5jb2Rpbmc7XG4gICAgICBpbWFnZV9iaW5hcnkuc3JjID0gJ2RhdGE6aW1hZ2UvJyArIGVuY29kaW5nICsgJztiYXNlNjQsJyArIGltYWdlX2JpbmFyeS5kYXRhO1xuXG4gICAgICB0aGlzLm1vZGVsc1tuYW1lXSA9IGltYWdlX2JpbmFyeTtcbiAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgdGhpcy5lbWl0KCdtb2RlbHMnLCB0aGlzLm1vZGVscyk7XG4gIH0uYmluZCh0aGlzKSwgZnVuY3Rpb24gKG1zZykge1xuICAgIGNvbnNvbGUud2FybigndXBkYXRlX21vZGVscyBmYWlsZWQ6JywgbXNnKTtcbiAgICBfLmRlbGF5KHVwZGF0ZV9tb2RlbHMuYmluZCh0aGlzKSwgNTAwMCk7XG4gIH0uYmluZCh0aGlzKSk7XG59O1xuXG4vKipcbiAqIFdvcmxkIG1vZGVsIGZpdHRpbmdcbiAqL1xuRWQucHJvdG90eXBlLmZpdF9tb2RlbCA9IGZ1bmN0aW9uKG1vZGVsX25hbWUsIGltYWdlX2lkLCBjbGlja194X3JhdGlvLCBjbGlja195X3JhdGlvKSB7XG4gIHZhciByZXF1ZXN0ID0ge1xuICAgIG1vZGVsX25hbWU6IG1vZGVsX25hbWUsXG4gICAgaW1hZ2VfaWQ6IGltYWdlX2lkLFxuICAgIGNsaWNrX3hfcmF0aW86IGNsaWNrX3hfcmF0aW8sXG4gICAgY2xpY2tfeV9yYXRpbzogY2xpY2tfeV9yYXRpbyxcbiAgfTtcblxuICB0aGlzLmZpdF9tb2RlbF9zZXJ2aWNlLmNhbGxTZXJ2aWNlKHJlcXVlc3QsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgIHRoaXMuZm9yY2VfdXBkYXRlKCk7XG5cbiAgICB2YXIgZXJyb3JfbXNnID0gcmVzcG9uc2UuZXJyb3JfbXNnO1xuICAgIGlmIChlcnJvcl9tc2cpIHtcbiAgICAgIGNvbnNvbGUud2FybignZml0IG1vZGVsIGVycm9yOicsIGVycm9yX21zZyk7XG4gICAgfVxuICB9LmJpbmQodGhpcykpO1xufTtcblxuRWQucHJvdG90eXBlLnVuZG9fZml0X21vZGVsID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgdmFyIHJlcXVlc3QgPSB7XG4gICAgdW5kb19sYXRlc3RfZml0OiB0cnVlLFxuICB9O1xuXG4gIHRoaXMuZml0X21vZGVsX3NlcnZpY2UuY2FsbFNlcnZpY2UocmVxdWVzdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5mb3JjZV91cGRhdGUoKTtcblxuICAgIHZhciBlcnJvcl9tc2cgPSByZXNwb25zZS5lcnJvcl9tc2c7XG4gICAgaWYgKGVycm9yX21zZykge1xuICAgICAgY29uc29sZS53YXJuKCdmaXQgbW9kZWwgZXJyb3I6JywgZXJyb3JfbXNnKTtcbiAgICAgIGNhbGxiYWNrKGVycm9yX21zZyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxiYWNrKG51bGwpO1xuICAgIH1cbiAgfS5iaW5kKHRoaXMpLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICB0aGlzLmZvcmNlX3VwZGF0ZSgpO1xuXG4gICAgICBjb25zb2xlLndhcm4oJ2ZpdCBtb2RlbCBlcnJvcjonLCBlcnIpO1xuICAgICAgY2FsbGJhY2soZXJyKTtcbiAgfS5iaW5kKHRoaXMpKTtcbn07XG5cbnZhciBuYXZpZ2F0ZV90eXBlcyA9IHtcbiAgTkFWSUdBVEVfVE9fUElYRUw6IDEsXG4gIFRVUk5fTEVGVCAgICAgICAgOiAyLFxuICBUVVJOX1JJR0hUICAgICAgIDogMyxcbn07XG5cbkVkLnByb3RvdHlwZS5uYXZpZ2F0ZV90byA9IGZ1bmN0aW9uKHgsIHksIHNuYXBzaG90X2lkKSB7XG4gIHRoaXMubmF2aWdhdGVfdG9fc2VydmljZS5jYWxsU2VydmljZSh7XG4gICAgc25hcHNob3RfaWQ6IHNuYXBzaG90X2lkLFxuICAgIG5hdmlnYXRpb25fdHlwZTogbmF2aWdhdGVfdHlwZXMuTkFWSUdBVEVfVE9fUElYRUwsXG4gICAgY2xpY2tfeF9yYXRpbzogeCxcbiAgICBjbGlja195X3JhdGlvOiB5LFxuICB9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgdmFyIGVycm9yX21zZyA9IHJlc3VsdC5lcnJvcl9tc2c7XG4gICAgaWYgKGVycm9yX21zZykge1xuICAgICAgY29uc29sZS53YXJuKGVycm9yX21zZyk7XG4gICAgfVxuICB9KTtcbn07XG5cbkVkLnByb3RvdHlwZS5jcmVhdGVfd2FsbHMgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IF8ubm9vcDtcbiAgdGhpcy5jcmVhdGVfd2FsbHNfc2VydmljZS5jYWxsU2VydmljZSh7fSwgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgIGNhbGxiYWNrKCk7XG4gIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFZDtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEV2ZW50RW1pdHRlcjIgPSByZXF1aXJlKCdldmVudGVtaXR0ZXIyJykuRXZlbnRFbWl0dGVyMjtcbnZhciBfID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ18nXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ18nXSA6IG51bGwpO1xudmFyIFJPU0xJQiA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydST1NMSUInXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ1JPU0xJQiddIDogbnVsbCk7XG5cbi8vIEhhcmR3YXJlIGNvbnN0YW50c1xuXG52YXIgbGV2ZWxzID0ge1xuICBTVEFMRTogICAgICAgIDAsXG4gIElETEU6ICAgICAgICAgMSxcbiAgT1BFUkFUSU9OQUw6ICAyLFxuICBIT01JTkc6ICAgICAgIDMsXG4gIEVSUk9SOiAgICAgICAgNCxcbn07XG5cbi8vIFJvYm90IHNwZWNpZmljIEhhcmR3YXJlIGNvbnN0YW50cyB0aGF0IHNob3VsZCBjb21lIGZyb20gdGhlIHBhcmFtZXRlciBzZXJ2ZXJcblxuLypcbnwgICBOYW1lICB8IEhvbWVhYmxlIHwgSG9tZWFibGVNYW5kYXRvcnkgfCBSZXNldGFibGUgfFxufC0tLS0tLS0tLXwtLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS18XG58IEJhc2UgICAgfCBubyAgICAgICB8IG5vICAgICAgICAgICAgICAgIHwgeWVzICAgICAgIHxcbnwgU3BpbmRsZSB8IHllcyAgICAgIHwgeWVzICAgICAgICAgICAgICAgfCB5ZXMgICAgICAgfFxufCBBcm0gICAgIHwgeWVzICAgICAgfCBubyAgICAgICAgICAgICAgICB8IHllcyAgICAgICB8XG58IEhlYWQgICAgfCBubyAgICAgICB8IG5vICAgICAgICAgICAgICAgIHwgbm8gICAgICAgIHxcbiovXG52YXIgcHJvcGVydGllcyA9IHtcbiAgLy8gTmFtZSAgICAgfCBIb21lYWJsZSB8IEhvbWVhYmxlTWFuZGF0b3J5IHwgUmVzZXRhYmxlIHxcbiAgYWxsOiAgICAgICAgWyB0cnVlICAgICAsIGZhbHNlICAgICAgICAgICAgICwgdHJ1ZSAgICAgIF0sXG4gIGJhc2U6ICAgICAgIFsgZmFsc2UgICAgLCBmYWxzZSAgICAgICAgICAgICAsIHRydWUgICAgICBdLFxuICBzcGluZGxlOiAgICBbIHRydWUgICAgICwgdHJ1ZSAgICAgICAgICAgICAgLCB0cnVlICAgICAgXSxcbiAgbGVmdF9hcm06ICAgWyB0cnVlICAgICAsIGZhbHNlICAgICAgICAgICAgICwgdHJ1ZSAgICAgIF0sXG4gIHJpZ2h0X2FybTogIFsgdHJ1ZSAgICAgLCBmYWxzZSAgICAgICAgICAgICAsIHRydWUgICAgICBdLFxuICBoZWFkOiAgICAgICBbIGZhbHNlICAgICwgZmFsc2UgICAgICAgICAgICAgLCBmYWxzZSAgICAgXSxcbn07XG4vLyB0cmFuc2Zvcm0gdGhlIGFycmF5IG9mIGJvb2xzIHRvIGFuIG9iamVjdFxucHJvcGVydGllcyA9IF8ubWFwVmFsdWVzKHByb3BlcnRpZXMsIGZ1bmN0aW9uICh2KSB7XG4gIHJldHVybiB7XG4gICAgaG9tZWFibGU6ICAgICAgICAgICB2WzBdLFxuICAgIGhvbWVhYmxlX21hbmRhdG9yeTogdlsxXSxcbiAgICByZXNldGFibGU6ICAgICAgICAgIHZbMl0sXG4gIH07XG59KTtcblxuLy8gZGVmaW5lIGhvdyB0aGUgYWN0aW9ucyBtYXAgdG8gaGFyZHdhcmUgY29tbWFuZHNcbnZhciBjb21tYW5kcyA9IHtcbiAgaG9tZTogIDIxLFxuICBzdGFydDogMjIsXG4gIHN0b3A6ICAyMyxcbiAgcmVzZXQ6IDI0LFxufTtcblxudmFyIGhhcmR3YXJlX2lkcyA9IHtcbiAgJ2FsbCc6ICAgICAgICAwLFxuICAnYmFzZSc6ICAgICAgIDEsXG4gICdzcGluZGxlJzogICAgMixcbiAgJ2xlZnRfYXJtJzogICAzLFxuICAncmlnaHRfYXJtJzogIDQsXG4gICdoZWFkJzogICAgICAgNSxcbn07XG5cbnZhciBkZWZhdWx0X3N0YXR1cyA9IF8ubWFwVmFsdWVzKGhhcmR3YXJlX2lkcywgZnVuY3Rpb24gKHZhbHVlLCBuYW1lKSB7XG4gIHJldHVybiB7XG4gICAgbmFtZTogbmFtZSxcbiAgICBsZXZlbDogbGV2ZWxzLlNUQUxFLFxuICAgIGhvbWVkOiBmYWxzZSxcbiAgfTtcbn0pO1xuXG52YXIgSEFSRFdBUkVfVElNRU9VVCA9IDIwMDA7IC8vIG1zXG5cbnZhciBCQVRURVJZX1RJTUVPVVQgPSAyMDAwOyAvLyBtc1xuXG52YXIgRUJVVFRPTlNfVElNRU9VVCA9IDIwMDA7IC8vIG1zXG5cbi8qKlxuICogSGFyZHdhcmUgbW9kdWxlXG4gKiBAcGFyYW0ge1JvYm90fSByb2JvdCBBIHZhbGlkIHJvYm90IG9iamVjdFxuICovXG5mdW5jdGlvbiBIYXJkd2FyZSAocm9ib3QpIHtcbiAgRXZlbnRFbWl0dGVyMi5hcHBseSh0aGlzKTtcblxuICB2YXIgcm9zID0gcm9ib3Qucm9zO1xuXG4gIC8vIGhhcmR3YXJlIHN0YXR1cyBpbml0XG4gIHRoaXMuc3RhdHVzID0gZGVmYXVsdF9zdGF0dXM7XG4gIHRoaXMuc3RhdHVzX3RvcGljID0gcm9zLlRvcGljKHtcbiAgICBuYW1lOiAnaGFyZHdhcmVfc3RhdHVzJyxcbiAgICBtZXNzYWdlVHlwZTogJ2RpYWdub3N0aWNfbXNncy9EaWFnbm9zdGljQXJyYXknLFxuICAgIHRocm90dGxlX3JhdGU6IDUwMCxcbiAgfSk7XG4gIHRoaXMuc3RhdHVzX3RvcGljLnN1YnNjcmliZSh0aGlzLm9uU3RhdHVzLmJpbmQodGhpcykpO1xuXG4gIHRoaXMuY29tbWFuZF90b3BpYyA9IHJvcy5Ub3BpYyh7XG4gICAgbmFtZTogJ2Rhc2hib2FyZF9jdHJsY21kcycsXG4gICAgbWVzc2FnZVR5cGU6ICdzdGRfbXNncy9VSW50OE11bHRpQXJyYXknLFxuICB9KTtcblxuICAvLyBiYXR0ZXJ5IHN0YXR1cyBpbml0XG4gIHRoaXMuYmF0dGVyeSA9IG51bGw7XG4gIHRoaXMuYmF0dGVyeV90b3BpYyA9IHJvcy5Ub3BpYyh7XG4gICAgbmFtZSA6ICdiYXR0ZXJ5X3BlcmNlbnRhZ2UnLFxuICAgIG1lc3NhZ2VUeXBlIDogJ3N0ZF9tc2dzL0Zsb2F0MzInLFxuICAgIHRocm90dGxlX3JhdGU6IDIwMCxcbiAgfSk7XG4gIHRoaXMuYmF0dGVyeV90b3BpYy5zdWJzY3JpYmUodGhpcy5vbkJhdHRlcnkuYmluZCh0aGlzKSk7XG5cbiAgLy8gZWJ1dHRvbiBzdGF0dXMgaW5pdFxuICB0aGlzLmJhdHRlcnkgPSBudWxsO1xuICB0aGlzLmVidXR0b25fdG9waWMgPSByb3MuVG9waWMoe1xuICAgIG5hbWUgOiAnZWJ1dHRvbl9zdGF0dXMnLFxuICAgIG1lc3NhZ2VUeXBlIDogJ2RpYWdub3N0aWNfbXNncy9EaWFnbm9zdGljQXJyYXknLFxuICAgIHRocm90dGxlX3JhdGU6IDIwMCxcbiAgfSk7XG4gIHRoaXMuZWJ1dHRvbl90b3BpYy5zdWJzY3JpYmUodGhpcy5vbkVidXR0b25zLmJpbmQodGhpcykpO1xufVxuXG5IYXJkd2FyZS5sZXZlbHMgPSBsZXZlbHM7XG5cbkhhcmR3YXJlLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnRFbWl0dGVyMi5wcm90b3R5cGUpO1xuXG4vKipcbiAqIFB1YmxpYyBzdGF0dXMgQVBJXG4gKi9cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEhhcmR3YXJlLnByb3RvdHlwZSwgJ3N0YXR1cycsIHtcbiAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fc3RhdHVzO1xuICB9LFxuICBzZXQ6IGZ1bmN0aW9uKHN0YXR1cykge1xuICAgIHRoaXMuX3N0YXR1cyA9IHN0YXR1cztcbiAgICB0aGlzLmVtaXQoJ3N0YXR1cycsIHN0YXR1cyk7XG4gIH1cbn0pO1xuXG52YXIgcmVzZXRIYXJkd2FyZUxhdGVyID0gXy5kZWJvdW5jZShyZXNldEhhcmR3YXJlLCBIQVJEV0FSRV9USU1FT1VUKTtcbkhhcmR3YXJlLnByb3RvdHlwZS5vblN0YXR1cyA9IGZ1bmN0aW9uKG1zZykge1xuICB0aGlzLnN0YXR1cyA9IGRpYWdub3N0aWNNc2dUb1N0YXR1cyhtc2cpO1xuICByZXNldEhhcmR3YXJlTGF0ZXIuY2FsbCh0aGlzKTtcbn07XG5cbmZ1bmN0aW9uIHJlc2V0SGFyZHdhcmUgKCkge1xuICBjb25zb2xlLmxvZygnaGFyZHdhcmUgbWVzc2FnZSB0aW1lb3V0Jyk7XG4gIHRoaXMuc3RhdHVzID0gZGVmYXVsdF9zdGF0dXM7XG59XG5cbkhhcmR3YXJlLnByb3RvdHlwZS5zZW5kX2NvbW1hbmQgPSBmdW5jdGlvbihwYXJ0LCBjb21tYW5kKSB7XG4gIHZhciBpMSA9IGhhcmR3YXJlX2lkc1twYXJ0XTtcbiAgdmFyIGkyID0gY29tbWFuZHNbY29tbWFuZF07XG4gIGNvbnNvbGUubG9nKCdoYXJkd2FyZSBjb21tYW5kOiAlcyAlcyAoJWksICVpKScsIGNvbW1hbmQsIHBhcnQsIGkxLCBpMik7XG5cbiAgdmFyIGNtZCA9IG5ldyBST1NMSUIuTWVzc2FnZSh7XG4gICAgZGF0YTogW2kxLCBpMl0sXG4gIH0pO1xuXG4gIHRoaXMuY29tbWFuZF90b3BpYy5wdWJsaXNoKGNtZCk7XG59O1xuXG4vKipcbiAqIFB1YmxpYyBiYXR0ZXJ5IEFQSVxuICovXG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShIYXJkd2FyZS5wcm90b3R5cGUsICdiYXR0ZXJ5Jywge1xuICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9iYXR0ZXJ5O1xuICB9LFxuICBzZXQ6IGZ1bmN0aW9uKGJhdHRlcnkpIHtcbiAgICB0aGlzLl9iYXR0ZXJ5ID0gYmF0dGVyeTtcbiAgICB0aGlzLmVtaXQoJ2JhdHRlcnknLCBiYXR0ZXJ5KTtcbiAgfVxufSk7XG5cbnZhciByZXNldEJhdHRlcnlMYXRlciA9IF8uZGVib3VuY2UocmVzZXRCYXR0ZXJ5LCBCQVRURVJZX1RJTUVPVVQpO1xuSGFyZHdhcmUucHJvdG90eXBlLm9uQmF0dGVyeSA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICB2YXIgcGVyY2VudCA9IG1lc3NhZ2UuZGF0YTsgLy8gZmxvYXQzMlxuICAgIHRoaXMuYmF0dGVyeSA9IHBlcmNlbnQ7XG4gICAgcmVzZXRCYXR0ZXJ5TGF0ZXIuY2FsbCh0aGlzKTtcbn07XG5cbmZ1bmN0aW9uIHJlc2V0QmF0dGVyeSAoKSB7XG4gIGNvbnNvbGUubG9nKCdiYXR0ZXJ5IG1lc3NhZ2UgdGltZW91dCcpO1xuICB0aGlzLmJhdHRlcnkgPSBudWxsO1xufVxuXG4vKipcbiAqIFB1YmxpYyBlYnV0dG9uIHN0YXR1cyBBUElcbiAqL1xuXG52YXIgcmVzZXRFYnV0dG9uc0xhdGVyID0gXy5kZWJvdW5jZShyZXNldEVidXR0b25zLCBFQlVUVE9OU19USU1FT1VUKTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShIYXJkd2FyZS5wcm90b3R5cGUsICdlYnV0dG9ucycsIHtcbiAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fZWJ1dHRvbnM7XG4gIH0sXG4gIHNldDogZnVuY3Rpb24oZWJ1dHRvbnMpIHtcbiAgICB0aGlzLl9lYnV0dG9ucyA9IGVidXR0b25zO1xuICAgIHRoaXMuZW1pdCgnZWJ1dHRvbnMnLCBlYnV0dG9ucyk7XG4gIH1cbn0pO1xuXG5IYXJkd2FyZS5wcm90b3R5cGUub25FYnV0dG9ucyA9IGZ1bmN0aW9uKG1zZykge1xuICB2YXIgc3RhdHVzID0gXy5tYXAobXNnLnN0YXR1cywgZnVuY3Rpb24gKHN0YXR1cykge1xuICAgIHJldHVybiBfLnBpY2soc3RhdHVzLCBbJ25hbWUnLCAnbGV2ZWwnXSk7XG4gIH0pO1xuXG4gIHRoaXMuZWJ1dHRvbnMgPSBzdGF0dXM7XG4gIHJlc2V0RWJ1dHRvbnNMYXRlci5jYWxsKHRoaXMpO1xufTtcblxuZnVuY3Rpb24gcmVzZXRFYnV0dG9ucyAoKSB7XG4gIGNvbnNvbGUubG9nKCdlYnV0dG9ucyBtZXNzYWdlIHRpbWVvdXQnKTtcbiAgdGhpcy5lYnV0dG9ucyA9IG51bGw7XG59XG5cbi8qKlxuICogUHJpdmF0ZSBmdW5jdGlvbnNcbiAqL1xuXG4vLyBjb252ZXJ0IGFuIGluY29taW5nIHN0YXR1cyBtZXNzYWdlIHRvIGFjdHVhbCB3b3JrYWJsZSBwcm9wZXJ0aWVzXG5mdW5jdGlvbiBkaWFnbm9zdGljTXNnVG9TdGF0dXMobWVzc2FnZSkge1xuICB2YXIgcGFydHMgPSBtZXNzYWdlLnN0YXR1cy5tYXAoZnVuY3Rpb24gKHBhcnQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogcGFydC5uYW1lLFxuICAgICAgbGV2ZWw6IHBhcnQubGV2ZWwsXG4gICAgICBob21lZDogcGFydC5tZXNzYWdlID09PSAnaG9tZWQnLFxuICAgIH07XG4gIH0pO1xuICB2YXIgaGFyZHdhcmVfc3RhdHVzID0gXy5pbmRleEJ5KHBhcnRzLCAnbmFtZScpO1xuXG4gIC8vIGZpbGwgYWxsIG1pc3NpbmcgaGFyZHdhcmUgcGFydHMgd2l0aCAnaWRsZSdcbiAgXy5kZWZhdWx0cyhoYXJkd2FyZV9zdGF0dXMsIGRlZmF1bHRfc3RhdHVzKTtcblxuICBfLm1hcFZhbHVlcyhoYXJkd2FyZV9zdGF0dXMsIGZ1bmN0aW9uIChwYXJ0KSB7XG4gICAgcGFydC5hY3Rpb25zID0gZ2V0QWN0aW9ucyhwYXJ0KTtcbiAgICByZXR1cm4gcGFydDtcbiAgfSk7XG5cbiAgcmV0dXJuIGhhcmR3YXJlX3N0YXR1cztcbn1cblxuLy8gcmV0dXJuIGFsbCBwb3NzaWJsZSBhY3Rpb25zIGZvciBhIGhhcmR3YXJlIHBhcnRcbmZ1bmN0aW9uIGdldEFjdGlvbnMocGFydCkge1xuICB2YXIgcHJvcHMgPSBwcm9wZXJ0aWVzW3BhcnQubmFtZV07XG4gIGlmICghcHJvcHMpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgbGV2ZWwgPSBwYXJ0ID8gcGFydC5sZXZlbCA6IC0xO1xuICB2YXIgaG9tZWQgPSBwYXJ0ID8gcGFydC5ob21lZCA6IGZhbHNlO1xuXG4gIHZhciBhY3Rpb25zID0ge307XG5cbiAgLy8gb25seSBzaG93IHRoZSBob21lIGFjdGlvbiBpZiBob21lYWJsZVxuICBpZiAocHJvcHMuaG9tZWFibGUpIHtcbiAgICBhY3Rpb25zLmhvbWUgPSB7XG4gICAgICBlbmFibGVkOiBsZXZlbCA9PT0gbGV2ZWxzLklETEUsXG4gICAgICB3YXJuaW5nOiBob21lZCA/XG4gICAgICAgICdUaGlzIHBhcnQgd2FzIGFscmVhZHkgaG9tZWQsIEFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byByZWRvIGhvbWluZz8nIDogZmFsc2UsXG4gICAgfTtcbiAgfVxuXG4gIC8vIGFsd2F5cyBzaG93IHN0YXJ0IGFjdGlvblxuICBhY3Rpb25zLnN0YXJ0ID0ge1xuICAgIGVuYWJsZWQ6IGxldmVsID09PSBsZXZlbHMuSURMRSAmJiAoaG9tZWQgfHwgIXByb3BzLmhvbWVhYmxlX21hbmRhdG9yeSksXG4gICAgd2FybmluZzogcHJvcHMuaG9tZWFibGUgJiYgIWhvbWVkID9cbiAgICAgICdUaGlzIHBhcnQgaXMgbm90IHlldCBob21lZCwgQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIHByb2NlZWQ/JyA6IGZhbHNlLFxuICB9O1xuXG4gIC8vIGFsd2F5cyBzaG93IHN0b3AgYWN0aW9uXG4gIGFjdGlvbnMuc3RvcCA9IHtcbiAgICBlbmFibGVkOiBsZXZlbCA9PT0gbGV2ZWxzLkhPTUlORyB8fCBsZXZlbCA9PT0gbGV2ZWxzLk9QRVJBVElPTkFMLFxuICB9O1xuXG4gIC8vIG9ubHkgc2hvdyByZXNldCBhY3Rpb24gaWYgcmVzZXRhYmxlXG4gIGlmIChwcm9wcy5yZXNldGFibGUpIHtcbiAgICBhY3Rpb25zLnJlc2V0ID0ge1xuICAgICAgZW5hYmxlZDogbGV2ZWwgPT09IGxldmVscy5FUlJPUixcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIGFjdGlvbnM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gSGFyZHdhcmU7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBFdmVudEVtaXR0ZXIyID0gcmVxdWlyZSgnZXZlbnRlbWl0dGVyMicpLkV2ZW50RW1pdHRlcjI7XG52YXIgUk9TTElCID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ1JPU0xJQiddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnUk9TTElCJ10gOiBudWxsKTtcblxuZnVuY3Rpb24gSGVhZCAocm9ib3QpIHtcbiAgRXZlbnRFbWl0dGVyMi5hcHBseSh0aGlzKTtcblxuICB2YXIgcm9zID0gcm9ib3Qucm9zO1xuXG4gIHRoaXMuZ29hbCA9IG51bGw7XG4gIC8vIHRoaXMuaGVhZF9hYyA9IHJvcy5BY3Rpb25DbGllbnQoe1xuICAvLyAgIHNlcnZlck5hbWU6ICdoZWFkX3JlZi9hY3Rpb25fc2VydmVyJyxcbiAgLy8gICBhY3Rpb25OYW1lOiAnaGVhZF9yZWYvSGVhZFJlZmVyZW5jZUFjdGlvbicsXG4gIC8vIH0pO1xufVxuXG5IZWFkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnRFbWl0dGVyMi5wcm90b3R5cGUpO1xuXG5IZWFkLnByb3RvdHlwZS5zZW5kX2dvYWwgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5nb2FsID0gbmV3IFJPU0xJQi5Hb2FsKHtcbiAgICBhY3Rpb25DbGllbnQ6IHRoaXMuaGVhZF9hYyxcbiAgICBnb2FsTWVzc2FnZToge1xuICAgICAgZ29hbF90eXBlOiBudWxsLCAgICAgICAgICAvLyBlaXRoZXIgTE9PS0FUIG9yIFBBTl9USUxUXG5cbiAgICAgIHByaW9yaXR5OiAxLCAgICAgICAgICAgLy8gWzEtMjU1XSAoYWN0aW9uIGNsaWVudCBjYWxscyB3aXRoIHRoZSBzYW1lIHByaW9yaXR5IGNhbmNlbCBlYWNoIG90aGVyKVxuXG4gICAgICBwYW5fdmVsOiBudWxsLCAgICAgICAgICAgIC8vIHBhbl92ZWxcbiAgICAgIHRpbHRfdmVsOiBudWxsLCAgICAgICAgICAgLy8gdGlsdF92ZWxcblxuICAgICAgLy8gaW4gY2FzZSBvZiBMT09LQVQ6XG4gICAgICB0YXJnZXRfcG9pbnQ6IG51bGwsICAgICAgIC8vIHVzZSBpbiBjYXNlIG9mIExPT0tBVFxuXG4gICAgICAvLyBpbiBjYXNlIG9mIFBBTl9USUxUXG4gICAgICBwYW46IG51bGwsICAgICAgICAgICAgICAgIC8vIHVzZSBpbiBjYXNlIG9mIFBBTl9USUxUXG4gICAgICB0aWx0OiBudWxsLCAgICAgICAgICAgICAgIC8vIHVzZSBpbiBjYXNlIG9mIFBBTl9USUxUXG5cbiAgICAgIGVuZF90aW1lOiBudWxsICAgICAgICAgICAgLy8gZ29hbCBjYW5jZWxzIGF1dG9tYXRpY2FsbHkgYWZ0ZXIgdGhpcyB0aW1lIChzZWNvbmRzKSwgaWYgMCwgbm8gYXV0byBjYW5jZWxcbiAgICB9XG4gIH0pO1xuXG4gIHRoaXMuZ29hbC5vbignZmVlZGJhY2snLCBmdW5jdGlvbihmZWVkYmFjaykge1xuICAgIGNvbnNvbGUubG9nKCdGZWVkYmFjazonLCBmZWVkYmFjayk7XG4gIH0pO1xuICB0aGlzLmdvYWwub24oJ3Jlc3VsdCcsIGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgIGNvbnNvbGUubG9nKCdSZXN1bHQ6JywgcmVzdWx0KTtcbiAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEhlYWQ7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBFdmVudEVtaXR0ZXIyID0gcmVxdWlyZSgnZXZlbnRlbWl0dGVyMicpLkV2ZW50RW1pdHRlcjI7XG52YXIgUk9TTElCID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ1JPU0xJQiddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnUk9TTElCJ10gOiBudWxsKTtcblxudmFyIEVkICAgICAgID0gcmVxdWlyZSgnLi9lZCcpO1xudmFyIEhhcmR3YXJlID0gcmVxdWlyZSgnLi9oYXJkd2FyZScpO1xudmFyIEhlYWQgICAgID0gcmVxdWlyZSgnLi9oZWFkJyk7XG52YXIgQmFzZSAgICAgPSByZXF1aXJlKCcuL2Jhc2UnKTtcblxuLy8gUHJpdmF0ZSB2YXJpYWJsZXNcbnZhciBob3N0bmFtZSA9IHJlcXVpcmUoJ29zJykuaG9zdG5hbWUoKSB8fCBcImxvY2FsaG9zdFwiO1xudmFyIGRlZmF1bHRfdXJsID0gJ3dzOi8vJyArIGhvc3RuYW1lICsgJzo5MDkwJztcblxudmFyIFJFQ09OTkVDVF9USU1FT1VUID0gNTAwMDsgLy8gbXNcblxuLy8gUm9ib3QgY29uc3RydWN0b3JcbmZ1bmN0aW9uIFJvYm90ICgpIHtcbiAgLy8gcGFyZW50IGNvbnN0cnVjdG9yXG4gIEV2ZW50RW1pdHRlcjIuYXBwbHkodGhpcyk7XG5cbiAgdGhpcy5yb3MgPSBuZXcgUk9TTElCLlJvcygpO1xuXG4gIHRoaXMucm9zLm9uKCdjb25uZWN0aW9uJywgdGhpcy5vbkNvbm5lY3Rpb24uYmluZCh0aGlzKSk7XG4gIHRoaXMucm9zLm9uKCdjbG9zZScsIHRoaXMub25DbG9zZS5iaW5kKHRoaXMpKTtcbiAgdGhpcy5yb3Mub24oJ2Vycm9yJywgdGhpcy5vbkVycm9yLmJpbmQodGhpcykpO1xuXG4gIC8vIHJlY29ubmVjdCBiZWhhdmlvclxuICB0aGlzLm9uKCdzdGF0dXMnLCBmdW5jdGlvbiAoc3RhdHVzKSB7XG4gICAgc3dpdGNoIChzdGF0dXMpIHtcbiAgICAgIGNhc2UgJ2Nsb3NlZCc6XG4gICAgICAgIHNldFRpbWVvdXQodGhpcy5jb25uZWN0LmJpbmQodGhpcyksIFJFQ09OTkVDVF9USU1FT1VUKTtcbiAgICB9XG4gIH0pO1xuXG4gIHRoaXMuZWQgICAgICAgPSBuZXcgRWQodGhpcyk7XG4gIHRoaXMuaGFyZHdhcmUgPSBuZXcgSGFyZHdhcmUodGhpcyk7XG4gIHRoaXMuaGVhZCAgICAgPSBuZXcgSGVhZCh0aGlzKTtcbiAgdGhpcy5iYXNlICAgICA9IG5ldyBCYXNlKHRoaXMpO1xufVxuXG4vLyBpbmhlcml0IGZyb20gRXZlbnRFbWl0dGVyMlxuUm9ib3QucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudEVtaXR0ZXIyLnByb3RvdHlwZSk7XG5cbi8vIHN0YXR1cyBnZXR0ZXIgKyBzZXR0ZXJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShSb2JvdC5wcm90b3R5cGUsICdzdGF0dXMnLCB7XG4gIGdldDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3N0YXR1cztcbiAgfSxcbiAgc2V0OiBmdW5jdGlvbihzdGF0dXMpIHtcbiAgICB0aGlzLl9zdGF0dXMgPSBzdGF0dXM7XG4gICAgdGhpcy5lbWl0KCdzdGF0dXMnLCBzdGF0dXMpO1xuICB9XG59KTtcblxuLy8gc3RhcnQgY29ubmVjdGlvblxuUm9ib3QucHJvdG90eXBlLmNvbm5lY3QgPSBmdW5jdGlvbiAodXJsKSB7XG4gIHRoaXMudXJsID0gdXJsIHx8IHRoaXMudXJsIHx8IGRlZmF1bHRfdXJsO1xuICBjb25zb2xlLmxvZygnY29ubmVjdGluZyB0byAnICsgdGhpcy51cmwpO1xuICB0aGlzLnJvcy5jb25uZWN0KHRoaXMudXJsKTtcbiAgdGhpcy5zdGF0dXMgPSAnY29ubmVjdGluZyc7XG59O1xuXG4vLyByb3Mgc3RhdHVzIGV2ZW50IGhhbmRsaW5nXG5Sb2JvdC5wcm90b3R5cGUub25Db25uZWN0aW9uID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCdjb25uZWN0aW9uJyk7XG4gIHRoaXMuc3RhdHVzID0gJ2Nvbm5lY3RlZCc7XG59O1xuXG5Sb2JvdC5wcm90b3R5cGUub25DbG9zZSA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygnY29ubmVjdGlvbiBjbG9zZWQnKTtcbiAgdGhpcy5zdGF0dXMgPSAnY2xvc2VkJztcbn07XG5cblJvYm90LnByb3RvdHlwZS5vbkVycm9yID0gZnVuY3Rpb24oKSB7XG4gIC8vIGNvbnNvbGUubG9nKCdjb25uZWN0aW9uIGVycm9yJyk7XG4gIHRoaXMuc3RhdHVzID0gJ2Vycm9yJztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUm9ib3Q7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBFdmVudEVtaXR0ZXIyOiBnbG9iYWwuRXZlbnRFbWl0dGVyMlxufTtcbiIsImV4cG9ydHMuZW5kaWFubmVzcyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICdMRScgfTtcblxuZXhwb3J0cy5ob3N0bmFtZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodHlwZW9mIGxvY2F0aW9uICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm4gbG9jYXRpb24uaG9zdG5hbWVcbiAgICB9XG4gICAgZWxzZSByZXR1cm4gJyc7XG59O1xuXG5leHBvcnRzLmxvYWRhdmcgPSBmdW5jdGlvbiAoKSB7IHJldHVybiBbXSB9O1xuXG5leHBvcnRzLnVwdGltZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIDAgfTtcblxuZXhwb3J0cy5mcmVlbWVtID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBOdW1iZXIuTUFYX1ZBTFVFO1xufTtcblxuZXhwb3J0cy50b3RhbG1lbSA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gTnVtYmVyLk1BWF9WQUxVRTtcbn07XG5cbmV4cG9ydHMuY3B1cyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIFtdIH07XG5cbmV4cG9ydHMudHlwZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICdCcm93c2VyJyB9O1xuXG5leHBvcnRzLnJlbGVhc2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgaWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiBuYXZpZ2F0b3IuYXBwVmVyc2lvbjtcbiAgICB9XG4gICAgcmV0dXJuICcnO1xufTtcblxuZXhwb3J0cy5uZXR3b3JrSW50ZXJmYWNlc1xuPSBleHBvcnRzLmdldE5ldHdvcmtJbnRlcmZhY2VzXG49IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHt9IH07XG5cbmV4cG9ydHMuYXJjaCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICdqYXZhc2NyaXB0JyB9O1xuXG5leHBvcnRzLnBsYXRmb3JtID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJ2Jyb3dzZXInIH07XG5cbmV4cG9ydHMudG1wZGlyID0gZXhwb3J0cy50bXBEaXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuICcvdG1wJztcbn07XG5cbmV4cG9ydHMuRU9MID0gJ1xcbic7XG4iXX0=
