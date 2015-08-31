(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.API = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var EventEmitter2 = require('eventemitter2').EventEmitter2;

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

},{"eventemitter2":7}],2:[function(require,module,exports){
'use strict';

exports.Robot = require('./robot');

},{"./robot":6}],3:[function(require,module,exports){
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

// public API

function Hardware (robot) {
  EventEmitter2.apply(this);

  var ros = robot.ros;

  this.status = [];
  this.status_topic = ros.Topic({
    name: 'hardware_status',
    messageType: 'diagnostic_msgs/DiagnosticArray',
    throttle_rate: 500,
  });
  this.status_topic.subscribe(this.onStatus.bind(this));

  this.models = [];
}

Hardware.prototype = Object.create(EventEmitter2.prototype);

Object.defineProperty(Hardware.prototype, 'status', {
  get: function() {
    return this._status;
  },
  set: function(status) {
    this._status = status;
    this.emit('status', status);
  }
});

Hardware.prototype.onStatus = function(msg) {
  this.status = diagnosticMsgToStatus(msg);
};

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
'use strict';

var EventEmitter2 = require('eventemitter2').EventEmitter2;

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
var rosbridge_url = 'ws://' + require('os').hostname() + ':9090';

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

  this.connect();

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
Robot.prototype.connect = function () {
  console.log('connecting to ' + rosbridge_url);
  this.ros.connect(rosbridge_url);
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvYmFzZS5qcyIsImxpYi9icm93c2VyLmpzIiwibGliL2VkLmpzIiwibGliL2hhcmR3YXJlLmpzIiwibGliL2hlYWQuanMiLCJsaWIvcm9ib3QuanMiLCJsaWIvc2hpbXMvZXZlbnRlbWl0dGVyMi5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9vcy1icm93c2VyaWZ5L2Jyb3dzZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlGQTtBQUNBO0FBQ0E7QUFDQTs7O0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDaFZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNoS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRXZlbnRFbWl0dGVyMiA9IHJlcXVpcmUoJ2V2ZW50ZW1pdHRlcjInKS5FdmVudEVtaXR0ZXIyO1xuXG5mdW5jdGlvbiBCYXNlIChyb2JvdCkge1xuICBFdmVudEVtaXR0ZXIyLmFwcGx5KHRoaXMpO1xuXG4gIHZhciByb3MgPSByb2JvdC5yb3M7XG5cbiAgdGhpcy5jbWRfdmVsX3RvcGljID0gcm9zLlRvcGljKHtcbiAgICBuYW1lOiAnYmFzZS9yZWZlcmVuY2VzJyxcbiAgICBtZXNzYWdlVHlwZTogJ2dlb21ldHJ5X21zZ3MvVHdpc3QnLFxuICB9KTtcblxuICB0aGlzLmxvY2FsX3BsYW5uZXJfdG9waWMgPSByb3MuVG9waWMoe1xuICAgIG5hbWU6ICdsb2NhbF9wbGFubmVyL2FjdGlvbl9zZXJ2ZXIvZ29hbCcsXG4gICAgbWVzc2FnZVR5cGU6ICdjYl9wbGFubmVyX21zZ3Nfc3J2cy9Mb2NhbFBsYW5uZXJBY3Rpb25Hb2FsJyxcbiAgfSk7XG59XG5cbkJhc2UucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudEVtaXR0ZXIyLnByb3RvdHlwZSk7XG5cbkJhc2UucHJvdG90eXBlLnNlbmRUd2lzdCA9IGZ1bmN0aW9uKHZ4LCB2eSwgdnRoKSB7XG4gIC8vIHB1Ymxpc2ggdGhlIGNvbW1hbmRcbiAgdmFyIHR3aXN0ID0gbmV3IFJPU0xJQi5NZXNzYWdlKHtcbiAgICBhbmd1bGFyIDoge1xuICAgICAgeCA6IDAsXG4gICAgICB5IDogMCxcbiAgICAgIHogOiB2dGhcbiAgICB9LFxuICAgIGxpbmVhciA6IHtcbiAgICAgIHggOiB2eCxcbiAgICAgIHkgOiB2eSxcbiAgICAgIHogOiAwXG4gICAgfVxuICB9KTtcbiAgdGhpcy5jbWRfdmVsX3RvcGljLnB1Ymxpc2godHdpc3QpO1xuICAvLyBjb25zb2xlLmxvZyh0aGlzLmNtZF92ZWxfdG9waWMpO1xuICAvLyBjb25zb2xlLmxvZyh0d2lzdCk7XG4gIGNvbnNvbGUubG9nKFwic2VuZFR3aXN0OiBcIiArIHZ4ICsgXCIsXCIgKyB2eSArIFwiLFwiICsgdnRoKTtcbn07XG5cbkJhc2UucHJvdG90eXBlLnNlbmRMb2NhbFBsYW5uZXJHb2FsID0gZnVuY3Rpb24ocGxhbiwgbG9va19hdF94LCBsb29rX2F0X3kpIHtcbiAgLy8gc3RkX21zZ3MvSGVhZGVyIGhlYWRlclxuICAvLyAgIHVpbnQzMiBzZXFcbiAgLy8gICB0aW1lIHN0YW1wXG4gIC8vICAgc3RyaW5nIGZyYW1lX2lkXG4gIC8vIGFjdGlvbmxpYl9tc2dzL0dvYWxJRCBnb2FsX2lkXG4gIC8vICAgdGltZSBzdGFtcFxuICAvLyAgIHN0cmluZyBpZFxuICAvLyBjYl9wbGFubmVyX21zZ3Nfc3J2cy9Mb2NhbFBsYW5uZXJHb2FsIGdvYWxcbiAgLy8gICBnZW9tZXRyeV9tc2dzL1Bvc2VTdGFtcGVkW10gcGxhblxuICAvLyAgICAgc3RkX21zZ3MvSGVhZGVyIGhlYWRlclxuICAvLyAgICAgICB1aW50MzIgc2VxXG4gIC8vICAgICAgIHRpbWUgc3RhbXBcbiAgLy8gICAgICAgc3RyaW5nIGZyYW1lX2lkXG4gIC8vICAgICBnZW9tZXRyeV9tc2dzL1Bvc2UgcG9zZVxuICAvLyAgICAgICBnZW9tZXRyeV9tc2dzL1BvaW50IHBvc2l0aW9uXG4gIC8vICAgICAgICAgZmxvYXQ2NCB4XG4gIC8vICAgICAgICAgZmxvYXQ2NCB5XG4gIC8vICAgICAgICAgZmxvYXQ2NCB6XG4gIC8vICAgICAgIGdlb21ldHJ5X21zZ3MvUXVhdGVybmlvbiBvcmllbnRhdGlvblxuICAvLyAgICAgICAgIGZsb2F0NjQgeFxuICAvLyAgICAgICAgIGZsb2F0NjQgeVxuICAvLyAgICAgICAgIGZsb2F0NjQgelxuICAvLyAgICAgICAgIGZsb2F0NjQgd1xuICAvLyAgIGNiX3BsYW5uZXJfbXNnc19zcnZzL09yaWVudGF0aW9uQ29uc3RyYWludCBvcmllbnRhdGlvbl9jb25zdHJhaW50XG4gIC8vICAgICBzdHJpbmcgZnJhbWVcbiAgLy8gICAgIGdlb21ldHJ5X21zZ3MvUG9pbnQgbG9va19hdFxuICAvLyAgICAgICBmbG9hdDY0IHhcbiAgLy8gICAgICAgZmxvYXQ2NCB5XG4gIC8vICAgICAgIGZsb2F0NjQgelxuICAvLyAgICAgZmxvYXQ2NCBhbmdsZV9vZmZzZXRcblxuICAvLyBwdWJsaXNoIHRoZSBjb21tYW5kXG4gIHZhciBnb2FsID0gbmV3IFJPU0xJQi5NZXNzYWdlKHtcbiAgICBnb2FsIDoge1xuICAgICAgcGxhbiA6IHBsYW4sXG4gICAgICBvcmllbnRhdGlvbl9jb25zdHJhaW50IDoge1xuICAgICAgICBmcmFtZSA6IFwiL21hcFwiLFxuICAgICAgICBsb29rX2F0IDoge1xuICAgICAgICAgIHggOiBsb29rX2F0X3gsXG4gICAgICAgICAgeSA6IGxvb2tfYXRfeVxuICAgICAgICB9XG4gICAgICB9LFxuICAgIH1cbiAgfSk7XG4gIHRoaXMubG9jYWxfcGxhbm5lcl90b3BpYy5wdWJsaXNoKGdvYWwpO1xuICAvLyBjb25zb2xlLmxvZyh0aGlzLmNtZF92ZWxfdG9waWMpO1xuICAvLyBjb25zb2xlLmxvZyh0d2lzdCk7XG4gIGNvbnNvbGUubG9nKFwic2VuZEdvYWwgdG8gbG9jYWwgcGxhbm5lcjogXCIgKyBnb2FsKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQmFzZTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5Sb2JvdCA9IHJlcXVpcmUoJy4vcm9ib3QnKTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEV2ZW50RW1pdHRlcjIgPSByZXF1aXJlKCdldmVudGVtaXR0ZXIyJykuRXZlbnRFbWl0dGVyMjtcbnZhciBfID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3dbJ18nXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ18nXSA6IG51bGwpO1xuXG52YXIgZW50aXRpZXNfdG9waWNfbmFtZSA9ICdlZC9ndWkvZW50aXRpZXMnO1xuXG52YXIgcXVlcnlfbWVzaGVzX3NlcnZpY2VfbmFtZSA9ICdlZC9ndWkvcXVlcnlfbWVzaGVzJztcblxudmFyIHNuYXBzaG90X3NlcnZpY2VfbmFtZSA9ICdlZC9ndWkvZ2V0X3NuYXBzaG90cyc7XG5cbnZhciBtb2RlbHNfc2VydmljZV9uYW1lID0nZWQvZ3VpL2dldF9tb2RlbHMnO1xuXG52YXIgZml0X21vZGVsX3NlcnZpY2VfbmFtZSA9ICdlZC9ndWkvZml0X21vZGVsJztcblxudmFyIG1ha2Vfc25hcHNob3Rfc2VydmljZV9uYW1lID0gJ2VkL21ha2Vfc25hcHNob3QnO1xuXG52YXIgbmF2aWdhdGVfdG9fc2VydmljZV9uYW1lID0gJ2VkL25hdmlnYXRlX3RvJztcblxudmFyIGNyZWF0ZV93YWxsc19zZXJ2aWNlX25hbWUgPSAnZWQvY3JlYXRlX3dhbGxzJztcblxuZnVuY3Rpb24gRWQgKHJvYm90KSB7XG4gIEV2ZW50RW1pdHRlcjIuYXBwbHkodGhpcyk7XG5cbiAgdmFyIHJvcyA9IHJvYm90LnJvcztcblxuICAvLyBXb3JsZCBtb2RlbCBlbnRpdGllc1xuICB0aGlzLmVudGl0aWVzID0gW107XG4gIHRoaXMubWVzaGVzID0ge307XG4gIHRoaXMuZW50aXRpZXNfdG9waWMgPSByb3MuVG9waWMoe1xuICAgIG5hbWU6IGVudGl0aWVzX3RvcGljX25hbWUsXG4gICAgbWVzc2FnZVR5cGU6ICdlZF9ndWlfc2VydmVyL0VudGl0eUluZm9zJyxcbiAgICB0aHJvdHRsZV9yYXRlOiA1MDAwLFxuICB9KTtcbiAgLy8gdGhpcy5lbnRpdGllc190b3BpYy5zdWJzY3JpYmUodGhpcy5vbkVudGl0aWVzLmJpbmQodGhpcykpO1xuXG4gIC8vIFF1ZXJ5IG1lc2hlc1xuICB0aGlzLnF1ZXJ5X21lc2hlc19zZXJ2aWNlID0gcm9zLlNlcnZpY2Uoe1xuICAgIG5hbWU6IHF1ZXJ5X21lc2hlc19zZXJ2aWNlX25hbWUsXG4gICAgc2VydmljZVR5cGU6ICdlZF9ndWlfc2VydmVyL1F1ZXJ5TWVzaGVzJyxcbiAgfSk7XG5cbiAgLy8gV29ybGQgbW9kZWwgc25hcHNob3RzXG4gIHRoaXMuc25hcHNob3RzID0ge307XG4gIHRoaXMuc25hcHNob3RfcmV2aXNpb24gPSAwO1xuICB0aGlzLnNuYXBzaG90X3NlcnZpY2UgPSByb3MuU2VydmljZSh7XG4gICAgbmFtZTogc25hcHNob3Rfc2VydmljZV9uYW1lLFxuICAgIHNlcnZpY2VUeXBlOiAnZWRfc2Vuc29yX2ludGVncmF0aW9uL0dldFNuYXBzaG90cycsXG4gIH0pO1xuXG4gIHRoaXMuZGVsZXRlX3NuYXBzaG90X3F1ZXVlID0gW107XG5cbiAgLy8gdGltZXJfaWQgdG8gYXZvaWQgdXBkYXRpbmcgd2hpbGUgb25lIGlzIGluIHByb2dyZXNzXG4gIC8vIGR1cmluZyBhbiB1cGRhdGUsIGl0IHdpbGwgYmUgbnVsbFxuICB0aGlzLnNuYXBzaG90c190aW1lcl9pZCA9IG51bGw7XG4gIHRoaXMuc3RhcnRfdXBkYXRlX2xvb3AoKTtcblxuICB0aGlzLm1ha2Vfc25hcHNob3Rfc2VydmljZSA9IHJvcy5TZXJ2aWNlKHtcbiAgICBuYW1lOiBtYWtlX3NuYXBzaG90X3NlcnZpY2VfbmFtZSxcbiAgICBzZXJ2aWNlVHlwZTogJ2VkX3NlbnNvcl9pbnRlZ3JhdGlvbi9NYWtlU25hcHNob3QnLFxuICB9KTtcblxuICAvLyBXb3JsZCBtb2RlbCBkYXRhYmFzZVxuICB0aGlzLm1vZGVscyA9IHt9O1xuICB0aGlzLm1vZGVsc19zZXJ2aWNlID0gcm9zLlNlcnZpY2Uoe1xuICAgIG5hbWU6IG1vZGVsc19zZXJ2aWNlX25hbWUsXG4gICAgc2VydmljZVR5cGU6ICdlZF9zZW5zb3JfaW50ZWdyYXRpb24vR2V0TW9kZWxzJyxcbiAgfSk7XG4gIHRoaXMudXBkYXRlX21vZGVscygpO1xuXG4gIC8vIFdvcmxkIG1vZGVsIGZpdHRpbmdcbiAgdGhpcy5maXRfbW9kZWxfc2VydmljZSA9IHJvcy5TZXJ2aWNlKHtcbiAgICBuYW1lOiBmaXRfbW9kZWxfc2VydmljZV9uYW1lLFxuICAgIHNlcnZpY2VUeXBlOiAnZWRfc2Vuc29yX2ludGVncmF0aW9uL0ZpdE1vZGVsJyxcbiAgfSk7XG5cbiAgdGhpcy5uYXZpZ2F0ZV90b19zZXJ2aWNlID0gcm9zLlNlcnZpY2Uoe1xuICAgIG5hbWU6IG5hdmlnYXRlX3RvX3NlcnZpY2VfbmFtZSxcbiAgICBzZXJ2aWNlVHlwZTogJ2VkX3NlbnNvcl9pbnRlZ3JhdGlvbi9OYXZpZ2F0ZVRvJyxcbiAgfSk7XG5cbiAgdGhpcy5jcmVhdGVfd2FsbHNfc2VydmljZSA9IHJvcy5TZXJ2aWNlKHtcbiAgICBuYW1lOiBjcmVhdGVfd2FsbHNfc2VydmljZV9uYW1lLFxuICAgIHNlcnZpY2VUeXBlOiAnc3RkX3NydnMvRW1wdHknLFxuICB9KTtcbn1cblxuRWQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudEVtaXR0ZXIyLnByb3RvdHlwZSk7XG5cbi8qKlxuICogV29ybGQgbW9kZWwgZW50aXRpZXNcbiAqL1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoRWQucHJvdG90eXBlLCAnZW50aXRpZXMnLCB7XG4gIGdldDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX2VudGl0aWVzO1xuICB9LFxuICBzZXQ6IGZ1bmN0aW9uKGVudGl0aWVzKSB7XG4gICAgdGhpcy5fZW50aXRpZXMgPSBlbnRpdGllcztcbiAgICB0aGlzLmVtaXQoJ2VudGl0aWVzJywgZW50aXRpZXMpO1xuICB9XG59KTtcblxuRWQucHJvdG90eXBlLm9uRW50aXRpZXMgPSBmdW5jdGlvbihtc2cpIHtcbiAgY29uc29sZS5sb2cobXNnKTtcbiAgdGhpcy5lbnRpdGllcyA9IG1zZy5lbnRpdGllcztcblxuICB2YXIgbWVzaF9xdWV1ZSA9IFtdO1xuICB0aGlzLmVudGl0aWVzLmZvckVhY2goZnVuY3Rpb24gKGVudGl0eSkge1xuICAgIGlmICh0aGlzLm1lc2hlc1tlbnRpdHkuaWRdICYmIHRoaXMubWVzaGVzW2VudGl0eS5pZF0ucmV2aXNpb24gPT09IGVudGl0eS5tZXNoX3JldmlzaW9uKSB7XG4gICAgICBjb25zb2xlLmxvZygnY29ycmVjdCByZXZpc2lvbicpO1xuICAgIH0gZWxzZSB7XG4gICAgICBtZXNoX3F1ZXVlLnB1c2goZW50aXR5LmlkKTtcbiAgICB9XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgY29uc29sZS5sb2cobWVzaF9xdWV1ZSk7XG4gIHZhciByZXF1ZXN0ID0geyBlbnRpdHlfaWRzOiBtZXNoX3F1ZXVlfTtcbiAgdGhpcy5xdWVyeV9tZXNoZXNfc2VydmljZS5jYWxsU2VydmljZShyZXF1ZXN0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICB2YXIgZXJyb3JfbXNnID0gcmVzcG9uc2UuZXJyb3JfbXNnO1xuICAgIGlmIChlcnJvcl9tc2cpIHtcbiAgICAgIGNvbnNvbGUud2FybigncXVlcnlfbWVzaGVzX3NlcnZpY2U6JywgZXJyb3JfbXNnKTtcbiAgICB9XG5cbiAgICByZXNwb25zZS5lbnRpdHlfaWRzLmZvckVhY2goZnVuY3Rpb24gKGlkLCBpKSB7XG4gICAgICAvLyBUT0RPOiBjaGVjayByZXZpc2lvbnNcbiAgICAgIHRoaXMubWVzaGVzW2lkXSA9IHJlc3BvbnNlLm1lc2hlc1tpXTtcbiAgICB9LmJpbmQodGhpcykpO1xuICB9LmJpbmQodGhpcykpO1xufTtcblxuLyoqXG4gKiBXb3JsZCBtb2RlbCBzbmFwc2hvdHNcbiAqL1xuXG5FZC5wcm90b3R5cGUudXBkYXRlX3NuYXBzaG90cyA9IGZ1bmN0aW9uKGNhbGxiYWNrLCBtYXhfbnVtX3JldmlzaW9ucykge1xuICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IF8ubm9vcDtcbiAgbWF4X251bV9yZXZpc2lvbnMgPSBtYXhfbnVtX3JldmlzaW9ucyB8fCAwO1xuXG4gIHZhciByZXF1ZXN0ID0ge1xuICAgIHJldmlzaW9uOiB0aGlzLnNuYXBzaG90X3JldmlzaW9uLFxuICAgIGRlbGV0ZV9pZHM6IHRoaXMuZGVsZXRlX3NuYXBzaG90X3F1ZXVlLFxuICAgIG1heF9udW1fcmV2aXNpb25zOiBtYXhfbnVtX3JldmlzaW9ucyxcbiAgfTtcbiAgaWYgKHRoaXMuZGVsZXRlX3NuYXBzaG90X3F1ZXVlLmxlbmd0aCkge1xuICAgIGNvbnNvbGUubG9nKCdkZWxldGluZyBzbmFwc2hvdHM6JywgdGhpcy5kZWxldGVfc25hcHNob3RfcXVldWUpO1xuICAgIHRoaXMuc25hcHNob3RzID0gXy5vbWl0KHRoaXMuc25hcHNob3RzLCB0aGlzLmRlbGV0ZV9zbmFwc2hvdF9xdWV1ZSk7XG4gICAgdGhpcy5kZWxldGVfc25hcHNob3RfcXVldWUgPSBbXTtcbiAgfVxuXG4gIHZhciBzdGFydF90aW1lID0gbmV3IERhdGUoKTtcblxuICAvLyBjb25zb2xlLmRlYnVnKCd1cGRhdGUgJWQgc25hcHNob3RzJywgbWF4X251bV9yZXZpc2lvbnMpO1xuICB0aGlzLnNuYXBzaG90X3NlcnZpY2UuY2FsbFNlcnZpY2UocmVxdWVzdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgdmFyIGRpZmYgPSBuZXcgRGF0ZSgpIC0gc3RhcnRfdGltZTtcbiAgICB0aGlzLmVtaXQoJ3VwZGF0ZV90aW1lJywgZGlmZik7XG4gICAgaWYgKCFyZXNwb25zZS5uZXdfcmV2aXNpb24gJiYgXy5zaXplKHRoaXMuc25hcHNob3RzKSB8fCAvLyByZXZpc2lvbiAwICYmIG9sZCBzbmFwc2hvdHNcbiAgICAgICAgcmVzcG9uc2UubmV3X3JldmlzaW9uIDwgdGhpcy5zbmFwc2hvdF9yZXZpc2lvbikge1xuICAgICAgY29uc29sZS53YXJuKCdlZCByZXN0YXJ0IGRldGVjdGVkLCByZWxvYWRpbmcuLi4nKTtcbiAgICAgIHRoaXMuc25hcHNob3RzID0ge307IC8vIGNsZWFyIHNuYXBzaG90c1xuICAgICAgdGhpcy51cGRhdGVfbW9kZWxzKCk7IC8vIHJlbG9hZCBtb2RlbCBkYlxuICAgIH1cbiAgICB0aGlzLnNuYXBzaG90X3JldmlzaW9uID0gcmVzcG9uc2UubmV3X3JldmlzaW9uO1xuXG4gICAgdmFyIHNuYXBzaG90cyA9IHByb2Nlc3Nfc25hcHNob3RzKHJlc3BvbnNlKTtcbiAgICBfLmFzc2lnbih0aGlzLnNuYXBzaG90cywgc25hcHNob3RzKTtcblxuICAgIHRoaXMuZW1pdCgnc25hcHNob3RzJywgdGhpcy5zbmFwc2hvdHMpO1xuXG4gICAgY2FsbGJhY2sobnVsbCwgc25hcHNob3RzKTtcbiAgfS5iaW5kKHRoaXMpLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgY29uc29sZS53YXJuKCd1cGRhdGVfc25hcHNob3RzIGZhaWxlZDonLCBlcnIpO1xuICAgIGNhbGxiYWNrKGVyciwgbnVsbCk7XG4gIH0uYmluZCh0aGlzKSk7XG59O1xuXG5mdW5jdGlvbiBwcm9jZXNzX3NuYXBzaG90cyAocmVzcG9uc2UpIHtcbiAgdmFyIHNuYXBzaG90cyA9IHt9O1xuXG4gIHJlc3BvbnNlLmltYWdlX2lkcy5mb3JFYWNoKGZ1bmN0aW9uIChpZCwgaSkge1xuICAgIHZhciBpbWFnZV9iaW5hcnkgPSByZXNwb25zZS5pbWFnZXNbaV07XG5cbiAgICB2YXIgZW5jb2RpbmcgPSBpbWFnZV9iaW5hcnkuZW5jb2Rpbmc7XG4gICAgaW1hZ2VfYmluYXJ5LnNyYyA9ICdkYXRhOmltYWdlLycgKyBlbmNvZGluZyArICc7YmFzZTY0LCcgKyBpbWFnZV9iaW5hcnkuZGF0YTtcbiAgICBpbWFnZV9iaW5hcnkuc2hvcnRfaWQgPSBfLnRydW5jKGlkLCB7XG4gICAgICAnbGVuZ3RoJzogOCxcbiAgICAgICdvbWlzc2lvbic6ICcnLFxuICAgIH0pO1xuICAgIGltYWdlX2JpbmFyeS5pZCA9IGlkO1xuXG4gICAgdmFyIHRzID0gcmVzcG9uc2UuaW1hZ2VfdGltZXN0YW1wc1tpXTtcbiAgICBpbWFnZV9iaW5hcnkudGltZXN0YW1wID0gbmV3IERhdGUodHMuc2VjcyArIHRzLm5zZWNzKjFlLTkpO1xuXG4gICAgc25hcHNob3RzW2lkXSA9IGltYWdlX2JpbmFyeTtcbiAgfS5iaW5kKHRoaXMpKTtcblxuICByZXR1cm4gc25hcHNob3RzO1xufVxuXG5FZC5wcm90b3R5cGUuZGVsZXRlX3NuYXBzaG90ID0gZnVuY3Rpb24oaWQpIHtcbiAgdGhpcy5kZWxldGVfc25hcHNob3RfcXVldWUucHVzaChpZCk7XG4gIHRoaXMuZm9yY2VfdXBkYXRlKCk7XG59O1xuXG5FZC5wcm90b3R5cGUuc3RhcnRfdXBkYXRlX2xvb3AgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuc25hcHNob3RzX3RpbWVyX2lkID0gbnVsbDtcbiAgdGhpcy51cGRhdGVfc25hcHNob3RzKGZ1bmN0aW9uIHVwZGF0ZV9hZ2FpbihlcnIsIG5ld19zbmFwc2hvdHMpIHtcbiAgICAvLyBjb25zb2xlLmRlYnVnKCdpIGdvdCAlZCBuZXcgc25hcHNob3RzJywgXy5zaXplKG5ld19zbmFwc2hvdHMpKTtcblxuICAgIHZhciBkZWxheSA9IDUwMDtcbiAgICBpZiAoZXJyKSB7XG4gICAgICBkZWxheSA9IDUwMDA7XG4gICAgfSBlbHNlIGlmIChfLnNpemUoXy5vbWl0KG5ld19zbmFwc2hvdHMsICdjdXJyZW50JykpKSB7XG4gICAgICBkZWxheSA9IDA7XG4gICAgfVxuXG4gICAgdGhpcy5zbmFwc2hvdHNfdGltZXJfaWQgPSBfLmRlbGF5KGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgdGhpcy5zbmFwc2hvdHNfdGltZXJfaWQgPSBudWxsO1xuICAgICAgdGhpcy51cGRhdGVfc25hcHNob3RzKGNhbGxiYWNrKTtcbiAgICB9LmJpbmQodGhpcyksIGRlbGF5LCB1cGRhdGVfYWdhaW4uYmluZCh0aGlzKSk7XG4gIH0uYmluZCh0aGlzKSwgMSk7XG59O1xuXG5FZC5wcm90b3R5cGUuZm9yY2VfdXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLnNuYXBzaG90c190aW1lcl9pZCkge1xuICAgIGNvbnNvbGUubG9nKCdmb3JjZSB1cGRhdGUnKTtcbiAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRoaXMuc25hcHNob3RzX3RpbWVyX2lkKTtcbiAgICB0aGlzLnNuYXBzaG90c190aW1lcl9pZCA9IG51bGw7XG4gICAgdGhpcy5zdGFydF91cGRhdGVfbG9vcCgpO1xuICB9IGVsc2Uge1xuICAgIC8vIGVsc2UgYW4gdXBkYXRlIGlzIGFscmVhZHkgaW4gcHJvZ3Jlc3NcbiAgICBjb25zb2xlLmxvZygndXBkYXRlIGlzIGFscmVhZHkgaW4gcHJvZ3Jlc3MnKTtcbiAgfVxufTtcblxuRWQucHJvdG90eXBlLm1ha2Vfc25hcHNob3QgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICB0aGlzLm1ha2Vfc25hcHNob3Rfc2VydmljZS5jYWxsU2VydmljZShudWxsLCBjYWxsYmFjayk7XG4gIHRoaXMuZm9yY2VfdXBkYXRlKCk7XG59O1xuXG4vKipcbiAqIFdvcmxkIG1vZGVsIGRhdGFiYXNlXG4gKi9cblxuRWQucHJvdG90eXBlLnVwZGF0ZV9tb2RlbHMgPSBmdW5jdGlvbiB1cGRhdGVfbW9kZWxzICgpIHtcbiAgdmFyIHJlcXVlc3QgPSB7fTtcbiAgdGhpcy5tb2RlbHNfc2VydmljZS5jYWxsU2VydmljZShyZXF1ZXN0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcblxuICAgIHJlc3BvbnNlLm1vZGVsX25hbWVzLmZvckVhY2goZnVuY3Rpb24gKG5hbWUsIGkpIHtcbiAgICAgIHZhciBpbWFnZV9iaW5hcnkgPSByZXNwb25zZS5tb2RlbF9pbWFnZXNbaV07XG5cbiAgICAgIHZhciBlbmNvZGluZyA9IGltYWdlX2JpbmFyeS5lbmNvZGluZztcbiAgICAgIGltYWdlX2JpbmFyeS5zcmMgPSAnZGF0YTppbWFnZS8nICsgZW5jb2RpbmcgKyAnO2Jhc2U2NCwnICsgaW1hZ2VfYmluYXJ5LmRhdGE7XG5cbiAgICAgIHRoaXMubW9kZWxzW25hbWVdID0gaW1hZ2VfYmluYXJ5O1xuICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLmVtaXQoJ21vZGVscycsIHRoaXMubW9kZWxzKTtcbiAgfS5iaW5kKHRoaXMpLCBmdW5jdGlvbiAobXNnKSB7XG4gICAgY29uc29sZS53YXJuKCd1cGRhdGVfbW9kZWxzIGZhaWxlZDonLCBtc2cpO1xuICAgIF8uZGVsYXkodXBkYXRlX21vZGVscy5iaW5kKHRoaXMpLCA1MDAwKTtcbiAgfS5iaW5kKHRoaXMpKTtcbn07XG5cbi8qKlxuICogV29ybGQgbW9kZWwgZml0dGluZ1xuICovXG5FZC5wcm90b3R5cGUuZml0X21vZGVsID0gZnVuY3Rpb24obW9kZWxfbmFtZSwgaW1hZ2VfaWQsIGNsaWNrX3hfcmF0aW8sIGNsaWNrX3lfcmF0aW8pIHtcbiAgdmFyIHJlcXVlc3QgPSB7XG4gICAgbW9kZWxfbmFtZTogbW9kZWxfbmFtZSxcbiAgICBpbWFnZV9pZDogaW1hZ2VfaWQsXG4gICAgY2xpY2tfeF9yYXRpbzogY2xpY2tfeF9yYXRpbyxcbiAgICBjbGlja195X3JhdGlvOiBjbGlja195X3JhdGlvLFxuICB9O1xuXG4gIHRoaXMuZml0X21vZGVsX3NlcnZpY2UuY2FsbFNlcnZpY2UocmVxdWVzdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5mb3JjZV91cGRhdGUoKTtcblxuICAgIHZhciBlcnJvcl9tc2cgPSByZXNwb25zZS5lcnJvcl9tc2c7XG4gICAgaWYgKGVycm9yX21zZykge1xuICAgICAgY29uc29sZS53YXJuKCdmaXQgbW9kZWwgZXJyb3I6JywgZXJyb3JfbXNnKTtcbiAgICB9XG4gIH0uYmluZCh0aGlzKSk7XG59O1xuXG5FZC5wcm90b3R5cGUudW5kb19maXRfbW9kZWwgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICB2YXIgcmVxdWVzdCA9IHtcbiAgICB1bmRvX2xhdGVzdF9maXQ6IHRydWUsXG4gIH07XG5cbiAgdGhpcy5maXRfbW9kZWxfc2VydmljZS5jYWxsU2VydmljZShyZXF1ZXN0LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICB0aGlzLmZvcmNlX3VwZGF0ZSgpO1xuXG4gICAgdmFyIGVycm9yX21zZyA9IHJlc3BvbnNlLmVycm9yX21zZztcbiAgICBpZiAoZXJyb3JfbXNnKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ2ZpdCBtb2RlbCBlcnJvcjonLCBlcnJvcl9tc2cpO1xuICAgICAgY2FsbGJhY2soZXJyb3JfbXNnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FsbGJhY2sobnVsbCk7XG4gICAgfVxuICB9LmJpbmQodGhpcyksIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgIHRoaXMuZm9yY2VfdXBkYXRlKCk7XG5cbiAgICAgIGNvbnNvbGUud2FybignZml0IG1vZGVsIGVycm9yOicsIGVycik7XG4gICAgICBjYWxsYmFjayhlcnIpO1xuICB9LmJpbmQodGhpcykpO1xufTtcblxudmFyIG5hdmlnYXRlX3R5cGVzID0ge1xuICBOQVZJR0FURV9UT19QSVhFTDogMSxcbiAgVFVSTl9MRUZUICAgICAgICA6IDIsXG4gIFRVUk5fUklHSFQgICAgICAgOiAzLFxufTtcblxuRWQucHJvdG90eXBlLm5hdmlnYXRlX3RvID0gZnVuY3Rpb24oeCwgeSwgc25hcHNob3RfaWQpIHtcbiAgdGhpcy5uYXZpZ2F0ZV90b19zZXJ2aWNlLmNhbGxTZXJ2aWNlKHtcbiAgICBzbmFwc2hvdF9pZDogc25hcHNob3RfaWQsXG4gICAgbmF2aWdhdGlvbl90eXBlOiBuYXZpZ2F0ZV90eXBlcy5OQVZJR0FURV9UT19QSVhFTCxcbiAgICBjbGlja194X3JhdGlvOiB4LFxuICAgIGNsaWNrX3lfcmF0aW86IHksXG4gIH0sIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICB2YXIgZXJyb3JfbXNnID0gcmVzdWx0LmVycm9yX21zZztcbiAgICBpZiAoZXJyb3JfbXNnKSB7XG4gICAgICBjb25zb2xlLndhcm4oZXJyb3JfbXNnKTtcbiAgICB9XG4gIH0pO1xufTtcblxuRWQucHJvdG90eXBlLmNyZWF0ZV93YWxscyA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgXy5ub29wO1xuICB0aGlzLmNyZWF0ZV93YWxsc19zZXJ2aWNlLmNhbGxTZXJ2aWNlKHt9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgY2FsbGJhY2soKTtcbiAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVkO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRXZlbnRFbWl0dGVyMiA9IHJlcXVpcmUoJ2V2ZW50ZW1pdHRlcjInKS5FdmVudEVtaXR0ZXIyO1xudmFyIF8gPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvd1snXyddIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbFsnXyddIDogbnVsbCk7XG5cbi8vIEhhcmR3YXJlIGNvbnN0YW50c1xuXG52YXIgbGV2ZWxzID0ge1xuICBTVEFMRTogICAgICAgIDAsXG4gIElETEU6ICAgICAgICAgMSxcbiAgT1BFUkFUSU9OQUw6ICAyLFxuICBIT01JTkc6ICAgICAgIDMsXG4gIEVSUk9SOiAgICAgICAgNCxcbn07XG5cbi8vIFJvYm90IHNwZWNpZmljIEhhcmR3YXJlIGNvbnN0YW50cyB0aGF0IHNob3VsZCBjb21lIGZyb20gdGhlIHBhcmFtZXRlciBzZXJ2ZXJcblxuLypcbnwgICBOYW1lICB8IEhvbWVhYmxlIHwgSG9tZWFibGVNYW5kYXRvcnkgfCBSZXNldGFibGUgfFxufC0tLS0tLS0tLXwtLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS18XG58IEJhc2UgICAgfCBubyAgICAgICB8IG5vICAgICAgICAgICAgICAgIHwgeWVzICAgICAgIHxcbnwgU3BpbmRsZSB8IHllcyAgICAgIHwgeWVzICAgICAgICAgICAgICAgfCB5ZXMgICAgICAgfFxufCBBcm0gICAgIHwgeWVzICAgICAgfCBubyAgICAgICAgICAgICAgICB8IHllcyAgICAgICB8XG58IEhlYWQgICAgfCBubyAgICAgICB8IG5vICAgICAgICAgICAgICAgIHwgbm8gICAgICAgIHxcbiovXG52YXIgcHJvcGVydGllcyA9IHtcbiAgLy8gTmFtZSAgICAgfCBIb21lYWJsZSB8IEhvbWVhYmxlTWFuZGF0b3J5IHwgUmVzZXRhYmxlIHxcbiAgYWxsOiAgICAgICAgWyB0cnVlICAgICAsIGZhbHNlICAgICAgICAgICAgICwgdHJ1ZSAgICAgIF0sXG4gIGJhc2U6ICAgICAgIFsgZmFsc2UgICAgLCBmYWxzZSAgICAgICAgICAgICAsIHRydWUgICAgICBdLFxuICBzcGluZGxlOiAgICBbIHRydWUgICAgICwgdHJ1ZSAgICAgICAgICAgICAgLCB0cnVlICAgICAgXSxcbiAgbGVmdF9hcm06ICAgWyB0cnVlICAgICAsIGZhbHNlICAgICAgICAgICAgICwgdHJ1ZSAgICAgIF0sXG4gIHJpZ2h0X2FybTogIFsgdHJ1ZSAgICAgLCBmYWxzZSAgICAgICAgICAgICAsIHRydWUgICAgICBdLFxuICBoZWFkOiAgICAgICBbIGZhbHNlICAgICwgZmFsc2UgICAgICAgICAgICAgLCBmYWxzZSAgICAgXSxcbn07XG4vLyB0cmFuc2Zvcm0gdGhlIGFycmF5IG9mIGJvb2xzIHRvIGFuIG9iamVjdFxucHJvcGVydGllcyA9IF8ubWFwVmFsdWVzKHByb3BlcnRpZXMsIGZ1bmN0aW9uICh2KSB7XG4gIHJldHVybiB7XG4gICAgaG9tZWFibGU6ICAgICAgICAgICB2WzBdLFxuICAgIGhvbWVhYmxlX21hbmRhdG9yeTogdlsxXSxcbiAgICByZXNldGFibGU6ICAgICAgICAgIHZbMl0sXG4gIH07XG59KTtcblxudmFyIGhhcmR3YXJlX2lkcyA9IHtcbiAgJ2FsbCc6ICAgICAgICAwLFxuICAnYmFzZSc6ICAgICAgIDEsXG4gICdzcGluZGxlJzogICAgMixcbiAgJ2xlZnRfYXJtJzogICAzLFxuICAncmlnaHRfYXJtJzogIDQsXG4gICdoZWFkJzogICAgICAgNSxcbn07XG5cbnZhciBkZWZhdWx0X3N0YXR1cyA9IF8ubWFwVmFsdWVzKGhhcmR3YXJlX2lkcywgZnVuY3Rpb24gKHZhbHVlLCBuYW1lKSB7XG4gIHJldHVybiB7XG4gICAgbmFtZTogbmFtZSxcbiAgICBsZXZlbDogbGV2ZWxzLlNUQUxFLFxuICAgIGhvbWVkOiBmYWxzZSxcbiAgfTtcbn0pO1xuXG4vLyBwdWJsaWMgQVBJXG5cbmZ1bmN0aW9uIEhhcmR3YXJlIChyb2JvdCkge1xuICBFdmVudEVtaXR0ZXIyLmFwcGx5KHRoaXMpO1xuXG4gIHZhciByb3MgPSByb2JvdC5yb3M7XG5cbiAgdGhpcy5zdGF0dXMgPSBbXTtcbiAgdGhpcy5zdGF0dXNfdG9waWMgPSByb3MuVG9waWMoe1xuICAgIG5hbWU6ICdoYXJkd2FyZV9zdGF0dXMnLFxuICAgIG1lc3NhZ2VUeXBlOiAnZGlhZ25vc3RpY19tc2dzL0RpYWdub3N0aWNBcnJheScsXG4gICAgdGhyb3R0bGVfcmF0ZTogNTAwLFxuICB9KTtcbiAgdGhpcy5zdGF0dXNfdG9waWMuc3Vic2NyaWJlKHRoaXMub25TdGF0dXMuYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5tb2RlbHMgPSBbXTtcbn1cblxuSGFyZHdhcmUucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudEVtaXR0ZXIyLnByb3RvdHlwZSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShIYXJkd2FyZS5wcm90b3R5cGUsICdzdGF0dXMnLCB7XG4gIGdldDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMuX3N0YXR1cztcbiAgfSxcbiAgc2V0OiBmdW5jdGlvbihzdGF0dXMpIHtcbiAgICB0aGlzLl9zdGF0dXMgPSBzdGF0dXM7XG4gICAgdGhpcy5lbWl0KCdzdGF0dXMnLCBzdGF0dXMpO1xuICB9XG59KTtcblxuSGFyZHdhcmUucHJvdG90eXBlLm9uU3RhdHVzID0gZnVuY3Rpb24obXNnKSB7XG4gIHRoaXMuc3RhdHVzID0gZGlhZ25vc3RpY01zZ1RvU3RhdHVzKG1zZyk7XG59O1xuXG4vLyBjb252ZXJ0IGFuIGluY29taW5nIHN0YXR1cyBtZXNzYWdlIHRvIGFjdHVhbCB3b3JrYWJsZSBwcm9wZXJ0aWVzXG5mdW5jdGlvbiBkaWFnbm9zdGljTXNnVG9TdGF0dXMobWVzc2FnZSkge1xuICB2YXIgcGFydHMgPSBtZXNzYWdlLnN0YXR1cy5tYXAoZnVuY3Rpb24gKHBhcnQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogcGFydC5uYW1lLFxuICAgICAgbGV2ZWw6IHBhcnQubGV2ZWwsXG4gICAgICBob21lZDogcGFydC5tZXNzYWdlID09PSAnaG9tZWQnLFxuICAgIH07XG4gIH0pO1xuICB2YXIgaGFyZHdhcmVfc3RhdHVzID0gXy5pbmRleEJ5KHBhcnRzLCAnbmFtZScpO1xuXG4gIC8vIGZpbGwgYWxsIG1pc3NpbmcgaGFyZHdhcmUgcGFydHMgd2l0aCAnaWRsZSdcbiAgXy5kZWZhdWx0cyhoYXJkd2FyZV9zdGF0dXMsIGRlZmF1bHRfc3RhdHVzKTtcblxuICBfLm1hcFZhbHVlcyhoYXJkd2FyZV9zdGF0dXMsIGZ1bmN0aW9uIChwYXJ0KSB7XG4gICAgcGFydC5hY3Rpb25zID0gZ2V0QWN0aW9ucyhwYXJ0KTtcbiAgICByZXR1cm4gcGFydDtcbiAgfSk7XG5cbiAgcmV0dXJuIGhhcmR3YXJlX3N0YXR1cztcbn1cblxuLy8gcmV0dXJuIGFsbCBwb3NzaWJsZSBhY3Rpb25zIGZvciBhIGhhcmR3YXJlIHBhcnRcbmZ1bmN0aW9uIGdldEFjdGlvbnMocGFydCkge1xuICB2YXIgcHJvcHMgPSBwcm9wZXJ0aWVzW3BhcnQubmFtZV07XG4gIGlmICghcHJvcHMpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgbGV2ZWwgPSBwYXJ0ID8gcGFydC5sZXZlbCA6IC0xO1xuICB2YXIgaG9tZWQgPSBwYXJ0ID8gcGFydC5ob21lZCA6IGZhbHNlO1xuXG4gIHZhciBhY3Rpb25zID0ge307XG5cbiAgLy8gb25seSBzaG93IHRoZSBob21lIGFjdGlvbiBpZiBob21lYWJsZVxuICBpZiAocHJvcHMuaG9tZWFibGUpIHtcbiAgICBhY3Rpb25zLmhvbWUgPSB7XG4gICAgICBlbmFibGVkOiBsZXZlbCA9PT0gbGV2ZWxzLklETEUsXG4gICAgICB3YXJuaW5nOiBob21lZCA/XG4gICAgICAgICdUaGlzIHBhcnQgd2FzIGFscmVhZHkgaG9tZWQsIEFyZSB5b3Ugc3VyZSB5b3Ugd2FudCB0byByZWRvIGhvbWluZz8nIDogZmFsc2UsXG4gICAgfTtcbiAgfVxuXG4gIC8vIGFsd2F5cyBzaG93IHN0YXJ0IGFjdGlvblxuICBhY3Rpb25zLnN0YXJ0ID0ge1xuICAgIGVuYWJsZWQ6IGxldmVsID09PSBsZXZlbHMuSURMRSAmJiAoaG9tZWQgfHwgIXByb3BzLmhvbWVhYmxlX21hbmRhdG9yeSksXG4gICAgd2FybmluZzogcHJvcHMuaG9tZWFibGUgJiYgIWhvbWVkID9cbiAgICAgICdUaGlzIHBhcnQgaXMgbm90IHlldCBob21lZCwgQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIHByb2NlZWQ/JyA6IGZhbHNlLFxuICB9O1xuXG4gIC8vIGFsd2F5cyBzaG93IHN0b3AgYWN0aW9uXG4gIGFjdGlvbnMuc3RvcCA9IHtcbiAgICBlbmFibGVkOiBsZXZlbCA9PT0gbGV2ZWxzLkhPTUlORyB8fCBsZXZlbCA9PT0gbGV2ZWxzLk9QRVJBVElPTkFMLFxuICB9O1xuXG4gIC8vIG9ubHkgc2hvdyByZXNldCBhY3Rpb24gaWYgcmVzZXRhYmxlXG4gIGlmIChwcm9wcy5yZXNldGFibGUpIHtcbiAgICBhY3Rpb25zLnJlc2V0ID0ge1xuICAgICAgZW5hYmxlZDogbGV2ZWwgPT09IGxldmVscy5FUlJPUixcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIGFjdGlvbnM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gSGFyZHdhcmU7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBFdmVudEVtaXR0ZXIyID0gcmVxdWlyZSgnZXZlbnRlbWl0dGVyMicpLkV2ZW50RW1pdHRlcjI7XG5cbmZ1bmN0aW9uIEhlYWQgKHJvYm90KSB7XG4gIEV2ZW50RW1pdHRlcjIuYXBwbHkodGhpcyk7XG5cbiAgdmFyIHJvcyA9IHJvYm90LnJvcztcblxuICB0aGlzLmdvYWwgPSBudWxsO1xuICAvLyB0aGlzLmhlYWRfYWMgPSByb3MuQWN0aW9uQ2xpZW50KHtcbiAgLy8gICBzZXJ2ZXJOYW1lOiAnaGVhZF9yZWYvYWN0aW9uX3NlcnZlcicsXG4gIC8vICAgYWN0aW9uTmFtZTogJ2hlYWRfcmVmL0hlYWRSZWZlcmVuY2VBY3Rpb24nLFxuICAvLyB9KTtcbn1cblxuSGVhZC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RW1pdHRlcjIucHJvdG90eXBlKTtcblxuSGVhZC5wcm90b3R5cGUuc2VuZF9nb2FsID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuZ29hbCA9IG5ldyBST1NMSUIuR29hbCh7XG4gICAgYWN0aW9uQ2xpZW50OiB0aGlzLmhlYWRfYWMsXG4gICAgZ29hbE1lc3NhZ2U6IHtcbiAgICAgIGdvYWxfdHlwZTogbnVsbCwgICAgICAgICAgLy8gZWl0aGVyIExPT0tBVCBvciBQQU5fVElMVFxuXG4gICAgICBwcmlvcml0eTogMSwgICAgICAgICAgIC8vIFsxLTI1NV0gKGFjdGlvbiBjbGllbnQgY2FsbHMgd2l0aCB0aGUgc2FtZSBwcmlvcml0eSBjYW5jZWwgZWFjaCBvdGhlcilcblxuICAgICAgcGFuX3ZlbDogbnVsbCwgICAgICAgICAgICAvLyBwYW5fdmVsXG4gICAgICB0aWx0X3ZlbDogbnVsbCwgICAgICAgICAgIC8vIHRpbHRfdmVsXG5cbiAgICAgIC8vIGluIGNhc2Ugb2YgTE9PS0FUOlxuICAgICAgdGFyZ2V0X3BvaW50OiBudWxsLCAgICAgICAvLyB1c2UgaW4gY2FzZSBvZiBMT09LQVRcblxuICAgICAgLy8gaW4gY2FzZSBvZiBQQU5fVElMVFxuICAgICAgcGFuOiBudWxsLCAgICAgICAgICAgICAgICAvLyB1c2UgaW4gY2FzZSBvZiBQQU5fVElMVFxuICAgICAgdGlsdDogbnVsbCwgICAgICAgICAgICAgICAvLyB1c2UgaW4gY2FzZSBvZiBQQU5fVElMVFxuXG4gICAgICBlbmRfdGltZTogbnVsbCAgICAgICAgICAgIC8vIGdvYWwgY2FuY2VscyBhdXRvbWF0aWNhbGx5IGFmdGVyIHRoaXMgdGltZSAoc2Vjb25kcyksIGlmIDAsIG5vIGF1dG8gY2FuY2VsXG4gICAgfVxuICB9KTtcblxuICB0aGlzLmdvYWwub24oJ2ZlZWRiYWNrJywgZnVuY3Rpb24oZmVlZGJhY2spIHtcbiAgICBjb25zb2xlLmxvZygnRmVlZGJhY2s6JywgZmVlZGJhY2spO1xuICB9KTtcbiAgdGhpcy5nb2FsLm9uKCdyZXN1bHQnLCBmdW5jdGlvbihyZXN1bHQpIHtcbiAgICBjb25zb2xlLmxvZygnUmVzdWx0OicsIHJlc3VsdCk7XG4gIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBIZWFkO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRXZlbnRFbWl0dGVyMiA9IHJlcXVpcmUoJ2V2ZW50ZW1pdHRlcjInKS5FdmVudEVtaXR0ZXIyO1xudmFyIFJPU0xJQiA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93WydST1NMSUInXSA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxbJ1JPU0xJQiddIDogbnVsbCk7XG5cbnZhciBFZCAgICAgICA9IHJlcXVpcmUoJy4vZWQnKTtcbnZhciBIYXJkd2FyZSA9IHJlcXVpcmUoJy4vaGFyZHdhcmUnKTtcbnZhciBIZWFkICAgICA9IHJlcXVpcmUoJy4vaGVhZCcpO1xudmFyIEJhc2UgICAgID0gcmVxdWlyZSgnLi9iYXNlJyk7XG5cbi8vIFByaXZhdGUgdmFyaWFibGVzXG52YXIgcm9zYnJpZGdlX3VybCA9ICd3czovLycgKyByZXF1aXJlKCdvcycpLmhvc3RuYW1lKCkgKyAnOjkwOTAnO1xuXG52YXIgUkVDT05ORUNUX1RJTUVPVVQgPSA1MDAwOyAvLyBtc1xuXG4vLyBSb2JvdCBjb25zdHJ1Y3RvclxuZnVuY3Rpb24gUm9ib3QgKCkge1xuICAvLyBwYXJlbnQgY29uc3RydWN0b3JcbiAgRXZlbnRFbWl0dGVyMi5hcHBseSh0aGlzKTtcblxuICB0aGlzLnJvcyA9IG5ldyBST1NMSUIuUm9zKCk7XG5cbiAgdGhpcy5yb3Mub24oJ2Nvbm5lY3Rpb24nLCB0aGlzLm9uQ29ubmVjdGlvbi5iaW5kKHRoaXMpKTtcbiAgdGhpcy5yb3Mub24oJ2Nsb3NlJywgdGhpcy5vbkNsb3NlLmJpbmQodGhpcykpO1xuICB0aGlzLnJvcy5vbignZXJyb3InLCB0aGlzLm9uRXJyb3IuYmluZCh0aGlzKSk7XG5cbiAgLy8gcmVjb25uZWN0IGJlaGF2aW9yXG4gIHRoaXMub24oJ3N0YXR1cycsIGZ1bmN0aW9uIChzdGF0dXMpIHtcbiAgICBzd2l0Y2ggKHN0YXR1cykge1xuICAgICAgY2FzZSAnY2xvc2VkJzpcbiAgICAgICAgc2V0VGltZW91dCh0aGlzLmNvbm5lY3QuYmluZCh0aGlzKSwgUkVDT05ORUNUX1RJTUVPVVQpO1xuICAgIH1cbiAgfSk7XG5cbiAgdGhpcy5jb25uZWN0KCk7XG5cbiAgdGhpcy5lZCAgICAgICA9IG5ldyBFZCh0aGlzKTtcbiAgdGhpcy5oYXJkd2FyZSA9IG5ldyBIYXJkd2FyZSh0aGlzKTtcbiAgdGhpcy5oZWFkICAgICA9IG5ldyBIZWFkKHRoaXMpO1xuICB0aGlzLmJhc2UgICAgID0gbmV3IEJhc2UodGhpcyk7XG59XG5cbi8vIGluaGVyaXQgZnJvbSBFdmVudEVtaXR0ZXIyXG5Sb2JvdC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RW1pdHRlcjIucHJvdG90eXBlKTtcblxuLy8gc3RhdHVzIGdldHRlciArIHNldHRlclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvYm90LnByb3RvdHlwZSwgJ3N0YXR1cycsIHtcbiAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fc3RhdHVzO1xuICB9LFxuICBzZXQ6IGZ1bmN0aW9uKHN0YXR1cykge1xuICAgIHRoaXMuX3N0YXR1cyA9IHN0YXR1cztcbiAgICB0aGlzLmVtaXQoJ3N0YXR1cycsIHN0YXR1cyk7XG4gIH1cbn0pO1xuXG4vLyBzdGFydCBjb25uZWN0aW9uXG5Sb2JvdC5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgY29uc29sZS5sb2coJ2Nvbm5lY3RpbmcgdG8gJyArIHJvc2JyaWRnZV91cmwpO1xuICB0aGlzLnJvcy5jb25uZWN0KHJvc2JyaWRnZV91cmwpO1xuICB0aGlzLnN0YXR1cyA9ICdjb25uZWN0aW5nJztcbn07XG5cbi8vIHJvcyBzdGF0dXMgZXZlbnQgaGFuZGxpbmdcblJvYm90LnByb3RvdHlwZS5vbkNvbm5lY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJ2Nvbm5lY3Rpb24nKTtcbiAgdGhpcy5zdGF0dXMgPSAnY29ubmVjdGVkJztcbn07XG5cblJvYm90LnByb3RvdHlwZS5vbkNsb3NlID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCdjb25uZWN0aW9uIGNsb3NlZCcpO1xuICB0aGlzLnN0YXR1cyA9ICdjbG9zZWQnO1xufTtcblxuUm9ib3QucHJvdG90eXBlLm9uRXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgLy8gY29uc29sZS5sb2coJ2Nvbm5lY3Rpb24gZXJyb3InKTtcbiAgdGhpcy5zdGF0dXMgPSAnZXJyb3InO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBSb2JvdDtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIEV2ZW50RW1pdHRlcjI6IGdsb2JhbC5FdmVudEVtaXR0ZXIyXG59O1xuIiwiZXhwb3J0cy5lbmRpYW5uZXNzID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJ0xFJyB9O1xuXG5leHBvcnRzLmhvc3RuYW1lID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0eXBlb2YgbG9jYXRpb24gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybiBsb2NhdGlvbi5ob3N0bmFtZVxuICAgIH1cbiAgICBlbHNlIHJldHVybiAnJztcbn07XG5cbmV4cG9ydHMubG9hZGF2ZyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIFtdIH07XG5cbmV4cG9ydHMudXB0aW1lID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gMCB9O1xuXG5leHBvcnRzLmZyZWVtZW0gPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIE51bWJlci5NQVhfVkFMVUU7XG59O1xuXG5leHBvcnRzLnRvdGFsbWVtID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBOdW1iZXIuTUFYX1ZBTFVFO1xufTtcblxuZXhwb3J0cy5jcHVzID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gW10gfTtcblxuZXhwb3J0cy50eXBlID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJ0Jyb3dzZXInIH07XG5cbmV4cG9ydHMucmVsZWFzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodHlwZW9mIG5hdmlnYXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgcmV0dXJuIG5hdmlnYXRvci5hcHBWZXJzaW9uO1xuICAgIH1cbiAgICByZXR1cm4gJyc7XG59O1xuXG5leHBvcnRzLm5ldHdvcmtJbnRlcmZhY2VzXG49IGV4cG9ydHMuZ2V0TmV0d29ya0ludGVyZmFjZXNcbj0gZnVuY3Rpb24gKCkgeyByZXR1cm4ge30gfTtcblxuZXhwb3J0cy5hcmNoID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJ2phdmFzY3JpcHQnIH07XG5cbmV4cG9ydHMucGxhdGZvcm0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnYnJvd3NlcicgfTtcblxuZXhwb3J0cy50bXBkaXIgPSBleHBvcnRzLnRtcERpciA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gJy90bXAnO1xufTtcblxuZXhwb3J0cy5FT0wgPSAnXFxuJztcbiJdfQ==
