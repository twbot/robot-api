(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.API = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

/* global ROSLIB, EventEmitter2 */

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

},{}],2:[function(require,module,exports){
'use strict';

exports.Robot = require('./robot');

},{"./robot":6}],3:[function(require,module,exports){
'use strict';

/* global EventEmitter2, _ */

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

},{}],4:[function(require,module,exports){
'use strict';

/* global EventEmitter2, _ */

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

},{}],5:[function(require,module,exports){
'use strict';

/* global ROSLIB, EventEmitter2 */

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

},{}],6:[function(require,module,exports){
'use strict';

var Ed       = require('./ed');
var Hardware = require('./hardware');
var Head     = require('./head');
var Base     = require('./base');

/* global EventEmitter2, ROSLIB, Hardware, Ed, Head, Base */

// Private variables
var rosbridge_url = 'ws://' + window.location.hostname + ':9090';

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

},{"./base":1,"./ed":3,"./hardware":4,"./head":5}]},{},[2])(2)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvYmFzZS5qcyIsImxpYi9icm93c2VyLmpzIiwibGliL2VkLmpzIiwibGliL2hhcmR3YXJlLmpzIiwibGliL2hlYWQuanMiLCJsaWIvcm9ib3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlGQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxuLyogZ2xvYmFsIFJPU0xJQiwgRXZlbnRFbWl0dGVyMiAqL1xuXG5mdW5jdGlvbiBCYXNlIChyb2JvdCkge1xuICBFdmVudEVtaXR0ZXIyLmFwcGx5KHRoaXMpO1xuXG4gIHZhciByb3MgPSByb2JvdC5yb3M7XG5cbiAgdGhpcy5jbWRfdmVsX3RvcGljID0gcm9zLlRvcGljKHtcbiAgICBuYW1lOiAnYmFzZS9yZWZlcmVuY2VzJyxcbiAgICBtZXNzYWdlVHlwZTogJ2dlb21ldHJ5X21zZ3MvVHdpc3QnLFxuICB9KTtcblxuICB0aGlzLmxvY2FsX3BsYW5uZXJfdG9waWMgPSByb3MuVG9waWMoe1xuICAgIG5hbWU6ICdsb2NhbF9wbGFubmVyL2FjdGlvbl9zZXJ2ZXIvZ29hbCcsXG4gICAgbWVzc2FnZVR5cGU6ICdjYl9wbGFubmVyX21zZ3Nfc3J2cy9Mb2NhbFBsYW5uZXJBY3Rpb25Hb2FsJyxcbiAgfSk7XG59XG5cbkJhc2UucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudEVtaXR0ZXIyLnByb3RvdHlwZSk7XG5cbkJhc2UucHJvdG90eXBlLnNlbmRUd2lzdCA9IGZ1bmN0aW9uKHZ4LCB2eSwgdnRoKSB7XG4gIC8vIHB1Ymxpc2ggdGhlIGNvbW1hbmRcbiAgdmFyIHR3aXN0ID0gbmV3IFJPU0xJQi5NZXNzYWdlKHtcbiAgICBhbmd1bGFyIDoge1xuICAgICAgeCA6IDAsXG4gICAgICB5IDogMCxcbiAgICAgIHogOiB2dGhcbiAgICB9LFxuICAgIGxpbmVhciA6IHtcbiAgICAgIHggOiB2eCxcbiAgICAgIHkgOiB2eSxcbiAgICAgIHogOiAwXG4gICAgfVxuICB9KTtcbiAgdGhpcy5jbWRfdmVsX3RvcGljLnB1Ymxpc2godHdpc3QpO1xuICAvLyBjb25zb2xlLmxvZyh0aGlzLmNtZF92ZWxfdG9waWMpO1xuICAvLyBjb25zb2xlLmxvZyh0d2lzdCk7XG4gIGNvbnNvbGUubG9nKFwic2VuZFR3aXN0OiBcIiArIHZ4ICsgXCIsXCIgKyB2eSArIFwiLFwiICsgdnRoKTtcbn07XG5cbkJhc2UucHJvdG90eXBlLnNlbmRMb2NhbFBsYW5uZXJHb2FsID0gZnVuY3Rpb24ocGxhbiwgbG9va19hdF94LCBsb29rX2F0X3kpIHtcbiAgLy8gc3RkX21zZ3MvSGVhZGVyIGhlYWRlclxuICAvLyAgIHVpbnQzMiBzZXFcbiAgLy8gICB0aW1lIHN0YW1wXG4gIC8vICAgc3RyaW5nIGZyYW1lX2lkXG4gIC8vIGFjdGlvbmxpYl9tc2dzL0dvYWxJRCBnb2FsX2lkXG4gIC8vICAgdGltZSBzdGFtcFxuICAvLyAgIHN0cmluZyBpZFxuICAvLyBjYl9wbGFubmVyX21zZ3Nfc3J2cy9Mb2NhbFBsYW5uZXJHb2FsIGdvYWxcbiAgLy8gICBnZW9tZXRyeV9tc2dzL1Bvc2VTdGFtcGVkW10gcGxhblxuICAvLyAgICAgc3RkX21zZ3MvSGVhZGVyIGhlYWRlclxuICAvLyAgICAgICB1aW50MzIgc2VxXG4gIC8vICAgICAgIHRpbWUgc3RhbXBcbiAgLy8gICAgICAgc3RyaW5nIGZyYW1lX2lkXG4gIC8vICAgICBnZW9tZXRyeV9tc2dzL1Bvc2UgcG9zZVxuICAvLyAgICAgICBnZW9tZXRyeV9tc2dzL1BvaW50IHBvc2l0aW9uXG4gIC8vICAgICAgICAgZmxvYXQ2NCB4XG4gIC8vICAgICAgICAgZmxvYXQ2NCB5XG4gIC8vICAgICAgICAgZmxvYXQ2NCB6XG4gIC8vICAgICAgIGdlb21ldHJ5X21zZ3MvUXVhdGVybmlvbiBvcmllbnRhdGlvblxuICAvLyAgICAgICAgIGZsb2F0NjQgeFxuICAvLyAgICAgICAgIGZsb2F0NjQgeVxuICAvLyAgICAgICAgIGZsb2F0NjQgelxuICAvLyAgICAgICAgIGZsb2F0NjQgd1xuICAvLyAgIGNiX3BsYW5uZXJfbXNnc19zcnZzL09yaWVudGF0aW9uQ29uc3RyYWludCBvcmllbnRhdGlvbl9jb25zdHJhaW50XG4gIC8vICAgICBzdHJpbmcgZnJhbWVcbiAgLy8gICAgIGdlb21ldHJ5X21zZ3MvUG9pbnQgbG9va19hdFxuICAvLyAgICAgICBmbG9hdDY0IHhcbiAgLy8gICAgICAgZmxvYXQ2NCB5XG4gIC8vICAgICAgIGZsb2F0NjQgelxuICAvLyAgICAgZmxvYXQ2NCBhbmdsZV9vZmZzZXRcblxuICAvLyBwdWJsaXNoIHRoZSBjb21tYW5kXG4gIHZhciBnb2FsID0gbmV3IFJPU0xJQi5NZXNzYWdlKHtcbiAgICBnb2FsIDoge1xuICAgICAgcGxhbiA6IHBsYW4sXG4gICAgICBvcmllbnRhdGlvbl9jb25zdHJhaW50IDoge1xuICAgICAgICBmcmFtZSA6IFwiL21hcFwiLFxuICAgICAgICBsb29rX2F0IDoge1xuICAgICAgICAgIHggOiBsb29rX2F0X3gsXG4gICAgICAgICAgeSA6IGxvb2tfYXRfeVxuICAgICAgICB9XG4gICAgICB9LFxuICAgIH1cbiAgfSk7XG4gIHRoaXMubG9jYWxfcGxhbm5lcl90b3BpYy5wdWJsaXNoKGdvYWwpO1xuICAvLyBjb25zb2xlLmxvZyh0aGlzLmNtZF92ZWxfdG9waWMpO1xuICAvLyBjb25zb2xlLmxvZyh0d2lzdCk7XG4gIGNvbnNvbGUubG9nKFwic2VuZEdvYWwgdG8gbG9jYWwgcGxhbm5lcjogXCIgKyBnb2FsKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQmFzZTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5Sb2JvdCA9IHJlcXVpcmUoJy4vcm9ib3QnKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyogZ2xvYmFsIEV2ZW50RW1pdHRlcjIsIF8gKi9cblxudmFyIGVudGl0aWVzX3RvcGljX25hbWUgPSAnZWQvZ3VpL2VudGl0aWVzJztcblxudmFyIHF1ZXJ5X21lc2hlc19zZXJ2aWNlX25hbWUgPSAnZWQvZ3VpL3F1ZXJ5X21lc2hlcyc7XG5cbnZhciBzbmFwc2hvdF9zZXJ2aWNlX25hbWUgPSAnZWQvZ3VpL2dldF9zbmFwc2hvdHMnO1xuXG52YXIgbW9kZWxzX3NlcnZpY2VfbmFtZSA9J2VkL2d1aS9nZXRfbW9kZWxzJztcblxudmFyIGZpdF9tb2RlbF9zZXJ2aWNlX25hbWUgPSAnZWQvZ3VpL2ZpdF9tb2RlbCc7XG5cbnZhciBtYWtlX3NuYXBzaG90X3NlcnZpY2VfbmFtZSA9ICdlZC9tYWtlX3NuYXBzaG90JztcblxudmFyIG5hdmlnYXRlX3RvX3NlcnZpY2VfbmFtZSA9ICdlZC9uYXZpZ2F0ZV90byc7XG5cbnZhciBjcmVhdGVfd2FsbHNfc2VydmljZV9uYW1lID0gJ2VkL2NyZWF0ZV93YWxscyc7XG5cbmZ1bmN0aW9uIEVkIChyb2JvdCkge1xuICBFdmVudEVtaXR0ZXIyLmFwcGx5KHRoaXMpO1xuXG4gIHZhciByb3MgPSByb2JvdC5yb3M7XG5cbiAgLy8gV29ybGQgbW9kZWwgZW50aXRpZXNcbiAgdGhpcy5lbnRpdGllcyA9IFtdO1xuICB0aGlzLm1lc2hlcyA9IHt9O1xuICB0aGlzLmVudGl0aWVzX3RvcGljID0gcm9zLlRvcGljKHtcbiAgICBuYW1lOiBlbnRpdGllc190b3BpY19uYW1lLFxuICAgIG1lc3NhZ2VUeXBlOiAnZWRfZ3VpX3NlcnZlci9FbnRpdHlJbmZvcycsXG4gICAgdGhyb3R0bGVfcmF0ZTogNTAwMCxcbiAgfSk7XG4gIC8vIHRoaXMuZW50aXRpZXNfdG9waWMuc3Vic2NyaWJlKHRoaXMub25FbnRpdGllcy5iaW5kKHRoaXMpKTtcblxuICAvLyBRdWVyeSBtZXNoZXNcbiAgdGhpcy5xdWVyeV9tZXNoZXNfc2VydmljZSA9IHJvcy5TZXJ2aWNlKHtcbiAgICBuYW1lOiBxdWVyeV9tZXNoZXNfc2VydmljZV9uYW1lLFxuICAgIHNlcnZpY2VUeXBlOiAnZWRfZ3VpX3NlcnZlci9RdWVyeU1lc2hlcycsXG4gIH0pO1xuXG4gIC8vIFdvcmxkIG1vZGVsIHNuYXBzaG90c1xuICB0aGlzLnNuYXBzaG90cyA9IHt9O1xuICB0aGlzLnNuYXBzaG90X3JldmlzaW9uID0gMDtcbiAgdGhpcy5zbmFwc2hvdF9zZXJ2aWNlID0gcm9zLlNlcnZpY2Uoe1xuICAgIG5hbWU6IHNuYXBzaG90X3NlcnZpY2VfbmFtZSxcbiAgICBzZXJ2aWNlVHlwZTogJ2VkX3NlbnNvcl9pbnRlZ3JhdGlvbi9HZXRTbmFwc2hvdHMnLFxuICB9KTtcblxuICB0aGlzLmRlbGV0ZV9zbmFwc2hvdF9xdWV1ZSA9IFtdO1xuXG4gIC8vIHRpbWVyX2lkIHRvIGF2b2lkIHVwZGF0aW5nIHdoaWxlIG9uZSBpcyBpbiBwcm9ncmVzc1xuICAvLyBkdXJpbmcgYW4gdXBkYXRlLCBpdCB3aWxsIGJlIG51bGxcbiAgdGhpcy5zbmFwc2hvdHNfdGltZXJfaWQgPSBudWxsO1xuICB0aGlzLnN0YXJ0X3VwZGF0ZV9sb29wKCk7XG5cbiAgdGhpcy5tYWtlX3NuYXBzaG90X3NlcnZpY2UgPSByb3MuU2VydmljZSh7XG4gICAgbmFtZTogbWFrZV9zbmFwc2hvdF9zZXJ2aWNlX25hbWUsXG4gICAgc2VydmljZVR5cGU6ICdlZF9zZW5zb3JfaW50ZWdyYXRpb24vTWFrZVNuYXBzaG90JyxcbiAgfSk7XG5cbiAgLy8gV29ybGQgbW9kZWwgZGF0YWJhc2VcbiAgdGhpcy5tb2RlbHMgPSB7fTtcbiAgdGhpcy5tb2RlbHNfc2VydmljZSA9IHJvcy5TZXJ2aWNlKHtcbiAgICBuYW1lOiBtb2RlbHNfc2VydmljZV9uYW1lLFxuICAgIHNlcnZpY2VUeXBlOiAnZWRfc2Vuc29yX2ludGVncmF0aW9uL0dldE1vZGVscycsXG4gIH0pO1xuICB0aGlzLnVwZGF0ZV9tb2RlbHMoKTtcblxuICAvLyBXb3JsZCBtb2RlbCBmaXR0aW5nXG4gIHRoaXMuZml0X21vZGVsX3NlcnZpY2UgPSByb3MuU2VydmljZSh7XG4gICAgbmFtZTogZml0X21vZGVsX3NlcnZpY2VfbmFtZSxcbiAgICBzZXJ2aWNlVHlwZTogJ2VkX3NlbnNvcl9pbnRlZ3JhdGlvbi9GaXRNb2RlbCcsXG4gIH0pO1xuXG4gIHRoaXMubmF2aWdhdGVfdG9fc2VydmljZSA9IHJvcy5TZXJ2aWNlKHtcbiAgICBuYW1lOiBuYXZpZ2F0ZV90b19zZXJ2aWNlX25hbWUsXG4gICAgc2VydmljZVR5cGU6ICdlZF9zZW5zb3JfaW50ZWdyYXRpb24vTmF2aWdhdGVUbycsXG4gIH0pO1xuXG4gIHRoaXMuY3JlYXRlX3dhbGxzX3NlcnZpY2UgPSByb3MuU2VydmljZSh7XG4gICAgbmFtZTogY3JlYXRlX3dhbGxzX3NlcnZpY2VfbmFtZSxcbiAgICBzZXJ2aWNlVHlwZTogJ3N0ZF9zcnZzL0VtcHR5JyxcbiAgfSk7XG59XG5cbkVkLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXZlbnRFbWl0dGVyMi5wcm90b3R5cGUpO1xuXG4vKipcbiAqIFdvcmxkIG1vZGVsIGVudGl0aWVzXG4gKi9cblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEVkLnByb3RvdHlwZSwgJ2VudGl0aWVzJywge1xuICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzLl9lbnRpdGllcztcbiAgfSxcbiAgc2V0OiBmdW5jdGlvbihlbnRpdGllcykge1xuICAgIHRoaXMuX2VudGl0aWVzID0gZW50aXRpZXM7XG4gICAgdGhpcy5lbWl0KCdlbnRpdGllcycsIGVudGl0aWVzKTtcbiAgfVxufSk7XG5cbkVkLnByb3RvdHlwZS5vbkVudGl0aWVzID0gZnVuY3Rpb24obXNnKSB7XG4gIGNvbnNvbGUubG9nKG1zZyk7XG4gIHRoaXMuZW50aXRpZXMgPSBtc2cuZW50aXRpZXM7XG5cbiAgdmFyIG1lc2hfcXVldWUgPSBbXTtcbiAgdGhpcy5lbnRpdGllcy5mb3JFYWNoKGZ1bmN0aW9uIChlbnRpdHkpIHtcbiAgICBpZiAodGhpcy5tZXNoZXNbZW50aXR5LmlkXSAmJiB0aGlzLm1lc2hlc1tlbnRpdHkuaWRdLnJldmlzaW9uID09PSBlbnRpdHkubWVzaF9yZXZpc2lvbikge1xuICAgICAgY29uc29sZS5sb2coJ2NvcnJlY3QgcmV2aXNpb24nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbWVzaF9xdWV1ZS5wdXNoKGVudGl0eS5pZCk7XG4gICAgfVxuICB9LmJpbmQodGhpcykpO1xuXG4gIGNvbnNvbGUubG9nKG1lc2hfcXVldWUpO1xuICB2YXIgcmVxdWVzdCA9IHsgZW50aXR5X2lkczogbWVzaF9xdWV1ZX07XG4gIHRoaXMucXVlcnlfbWVzaGVzX3NlcnZpY2UuY2FsbFNlcnZpY2UocmVxdWVzdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgdmFyIGVycm9yX21zZyA9IHJlc3BvbnNlLmVycm9yX21zZztcbiAgICBpZiAoZXJyb3JfbXNnKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ3F1ZXJ5X21lc2hlc19zZXJ2aWNlOicsIGVycm9yX21zZyk7XG4gICAgfVxuXG4gICAgcmVzcG9uc2UuZW50aXR5X2lkcy5mb3JFYWNoKGZ1bmN0aW9uIChpZCwgaSkge1xuICAgICAgLy8gVE9ETzogY2hlY2sgcmV2aXNpb25zXG4gICAgICB0aGlzLm1lc2hlc1tpZF0gPSByZXNwb25zZS5tZXNoZXNbaV07XG4gICAgfS5iaW5kKHRoaXMpKTtcbiAgfS5iaW5kKHRoaXMpKTtcbn07XG5cbi8qKlxuICogV29ybGQgbW9kZWwgc25hcHNob3RzXG4gKi9cblxuRWQucHJvdG90eXBlLnVwZGF0ZV9zbmFwc2hvdHMgPSBmdW5jdGlvbihjYWxsYmFjaywgbWF4X251bV9yZXZpc2lvbnMpIHtcbiAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBfLm5vb3A7XG4gIG1heF9udW1fcmV2aXNpb25zID0gbWF4X251bV9yZXZpc2lvbnMgfHwgMDtcblxuICB2YXIgcmVxdWVzdCA9IHtcbiAgICByZXZpc2lvbjogdGhpcy5zbmFwc2hvdF9yZXZpc2lvbixcbiAgICBkZWxldGVfaWRzOiB0aGlzLmRlbGV0ZV9zbmFwc2hvdF9xdWV1ZSxcbiAgICBtYXhfbnVtX3JldmlzaW9uczogbWF4X251bV9yZXZpc2lvbnMsXG4gIH07XG4gIGlmICh0aGlzLmRlbGV0ZV9zbmFwc2hvdF9xdWV1ZS5sZW5ndGgpIHtcbiAgICBjb25zb2xlLmxvZygnZGVsZXRpbmcgc25hcHNob3RzOicsIHRoaXMuZGVsZXRlX3NuYXBzaG90X3F1ZXVlKTtcbiAgICB0aGlzLnNuYXBzaG90cyA9IF8ub21pdCh0aGlzLnNuYXBzaG90cywgdGhpcy5kZWxldGVfc25hcHNob3RfcXVldWUpO1xuICAgIHRoaXMuZGVsZXRlX3NuYXBzaG90X3F1ZXVlID0gW107XG4gIH1cblxuICB2YXIgc3RhcnRfdGltZSA9IG5ldyBEYXRlKCk7XG5cbiAgLy8gY29uc29sZS5kZWJ1ZygndXBkYXRlICVkIHNuYXBzaG90cycsIG1heF9udW1fcmV2aXNpb25zKTtcbiAgdGhpcy5zbmFwc2hvdF9zZXJ2aWNlLmNhbGxTZXJ2aWNlKHJlcXVlc3QsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgIHZhciBkaWZmID0gbmV3IERhdGUoKSAtIHN0YXJ0X3RpbWU7XG4gICAgdGhpcy5lbWl0KCd1cGRhdGVfdGltZScsIGRpZmYpO1xuICAgIGlmICghcmVzcG9uc2UubmV3X3JldmlzaW9uICYmIF8uc2l6ZSh0aGlzLnNuYXBzaG90cykgfHwgLy8gcmV2aXNpb24gMCAmJiBvbGQgc25hcHNob3RzXG4gICAgICAgIHJlc3BvbnNlLm5ld19yZXZpc2lvbiA8IHRoaXMuc25hcHNob3RfcmV2aXNpb24pIHtcbiAgICAgIGNvbnNvbGUud2FybignZWQgcmVzdGFydCBkZXRlY3RlZCwgcmVsb2FkaW5nLi4uJyk7XG4gICAgICB0aGlzLnNuYXBzaG90cyA9IHt9OyAvLyBjbGVhciBzbmFwc2hvdHNcbiAgICAgIHRoaXMudXBkYXRlX21vZGVscygpOyAvLyByZWxvYWQgbW9kZWwgZGJcbiAgICB9XG4gICAgdGhpcy5zbmFwc2hvdF9yZXZpc2lvbiA9IHJlc3BvbnNlLm5ld19yZXZpc2lvbjtcblxuICAgIHZhciBzbmFwc2hvdHMgPSBwcm9jZXNzX3NuYXBzaG90cyhyZXNwb25zZSk7XG4gICAgXy5hc3NpZ24odGhpcy5zbmFwc2hvdHMsIHNuYXBzaG90cyk7XG5cbiAgICB0aGlzLmVtaXQoJ3NuYXBzaG90cycsIHRoaXMuc25hcHNob3RzKTtcblxuICAgIGNhbGxiYWNrKG51bGwsIHNuYXBzaG90cyk7XG4gIH0uYmluZCh0aGlzKSwgZnVuY3Rpb24gKGVycikge1xuICAgIGNvbnNvbGUud2FybigndXBkYXRlX3NuYXBzaG90cyBmYWlsZWQ6JywgZXJyKTtcbiAgICBjYWxsYmFjayhlcnIsIG51bGwpO1xuICB9LmJpbmQodGhpcykpO1xufTtcblxuZnVuY3Rpb24gcHJvY2Vzc19zbmFwc2hvdHMgKHJlc3BvbnNlKSB7XG4gIHZhciBzbmFwc2hvdHMgPSB7fTtcblxuICByZXNwb25zZS5pbWFnZV9pZHMuZm9yRWFjaChmdW5jdGlvbiAoaWQsIGkpIHtcbiAgICB2YXIgaW1hZ2VfYmluYXJ5ID0gcmVzcG9uc2UuaW1hZ2VzW2ldO1xuXG4gICAgdmFyIGVuY29kaW5nID0gaW1hZ2VfYmluYXJ5LmVuY29kaW5nO1xuICAgIGltYWdlX2JpbmFyeS5zcmMgPSAnZGF0YTppbWFnZS8nICsgZW5jb2RpbmcgKyAnO2Jhc2U2NCwnICsgaW1hZ2VfYmluYXJ5LmRhdGE7XG4gICAgaW1hZ2VfYmluYXJ5LnNob3J0X2lkID0gXy50cnVuYyhpZCwge1xuICAgICAgJ2xlbmd0aCc6IDgsXG4gICAgICAnb21pc3Npb24nOiAnJyxcbiAgICB9KTtcbiAgICBpbWFnZV9iaW5hcnkuaWQgPSBpZDtcblxuICAgIHZhciB0cyA9IHJlc3BvbnNlLmltYWdlX3RpbWVzdGFtcHNbaV07XG4gICAgaW1hZ2VfYmluYXJ5LnRpbWVzdGFtcCA9IG5ldyBEYXRlKHRzLnNlY3MgKyB0cy5uc2VjcyoxZS05KTtcblxuICAgIHNuYXBzaG90c1tpZF0gPSBpbWFnZV9iaW5hcnk7XG4gIH0uYmluZCh0aGlzKSk7XG5cbiAgcmV0dXJuIHNuYXBzaG90cztcbn1cblxuRWQucHJvdG90eXBlLmRlbGV0ZV9zbmFwc2hvdCA9IGZ1bmN0aW9uKGlkKSB7XG4gIHRoaXMuZGVsZXRlX3NuYXBzaG90X3F1ZXVlLnB1c2goaWQpO1xuICB0aGlzLmZvcmNlX3VwZGF0ZSgpO1xufTtcblxuRWQucHJvdG90eXBlLnN0YXJ0X3VwZGF0ZV9sb29wID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnNuYXBzaG90c190aW1lcl9pZCA9IG51bGw7XG4gIHRoaXMudXBkYXRlX3NuYXBzaG90cyhmdW5jdGlvbiB1cGRhdGVfYWdhaW4oZXJyLCBuZXdfc25hcHNob3RzKSB7XG4gICAgLy8gY29uc29sZS5kZWJ1ZygnaSBnb3QgJWQgbmV3IHNuYXBzaG90cycsIF8uc2l6ZShuZXdfc25hcHNob3RzKSk7XG5cbiAgICB2YXIgZGVsYXkgPSA1MDA7XG4gICAgaWYgKGVycikge1xuICAgICAgZGVsYXkgPSA1MDAwO1xuICAgIH0gZWxzZSBpZiAoXy5zaXplKF8ub21pdChuZXdfc25hcHNob3RzLCAnY3VycmVudCcpKSkge1xuICAgICAgZGVsYXkgPSAwO1xuICAgIH1cblxuICAgIHRoaXMuc25hcHNob3RzX3RpbWVyX2lkID0gXy5kZWxheShmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgIHRoaXMuc25hcHNob3RzX3RpbWVyX2lkID0gbnVsbDtcbiAgICAgIHRoaXMudXBkYXRlX3NuYXBzaG90cyhjYWxsYmFjayk7XG4gICAgfS5iaW5kKHRoaXMpLCBkZWxheSwgdXBkYXRlX2FnYWluLmJpbmQodGhpcykpO1xuICB9LmJpbmQodGhpcyksIDEpO1xufTtcblxuRWQucHJvdG90eXBlLmZvcmNlX3VwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICBpZiAodGhpcy5zbmFwc2hvdHNfdGltZXJfaWQpIHtcbiAgICBjb25zb2xlLmxvZygnZm9yY2UgdXBkYXRlJyk7XG4gICAgd2luZG93LmNsZWFyVGltZW91dCh0aGlzLnNuYXBzaG90c190aW1lcl9pZCk7XG4gICAgdGhpcy5zbmFwc2hvdHNfdGltZXJfaWQgPSBudWxsO1xuICAgIHRoaXMuc3RhcnRfdXBkYXRlX2xvb3AoKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBlbHNlIGFuIHVwZGF0ZSBpcyBhbHJlYWR5IGluIHByb2dyZXNzXG4gICAgY29uc29sZS5sb2coJ3VwZGF0ZSBpcyBhbHJlYWR5IGluIHByb2dyZXNzJyk7XG4gIH1cbn07XG5cbkVkLnByb3RvdHlwZS5tYWtlX3NuYXBzaG90ID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgdGhpcy5tYWtlX3NuYXBzaG90X3NlcnZpY2UuY2FsbFNlcnZpY2UobnVsbCwgY2FsbGJhY2spO1xuICB0aGlzLmZvcmNlX3VwZGF0ZSgpO1xufTtcblxuLyoqXG4gKiBXb3JsZCBtb2RlbCBkYXRhYmFzZVxuICovXG5cbkVkLnByb3RvdHlwZS51cGRhdGVfbW9kZWxzID0gZnVuY3Rpb24gdXBkYXRlX21vZGVscyAoKSB7XG4gIHZhciByZXF1ZXN0ID0ge307XG4gIHRoaXMubW9kZWxzX3NlcnZpY2UuY2FsbFNlcnZpY2UocmVxdWVzdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG5cbiAgICByZXNwb25zZS5tb2RlbF9uYW1lcy5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lLCBpKSB7XG4gICAgICB2YXIgaW1hZ2VfYmluYXJ5ID0gcmVzcG9uc2UubW9kZWxfaW1hZ2VzW2ldO1xuXG4gICAgICB2YXIgZW5jb2RpbmcgPSBpbWFnZV9iaW5hcnkuZW5jb2Rpbmc7XG4gICAgICBpbWFnZV9iaW5hcnkuc3JjID0gJ2RhdGE6aW1hZ2UvJyArIGVuY29kaW5nICsgJztiYXNlNjQsJyArIGltYWdlX2JpbmFyeS5kYXRhO1xuXG4gICAgICB0aGlzLm1vZGVsc1tuYW1lXSA9IGltYWdlX2JpbmFyeTtcbiAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgdGhpcy5lbWl0KCdtb2RlbHMnLCB0aGlzLm1vZGVscyk7XG4gIH0uYmluZCh0aGlzKSwgZnVuY3Rpb24gKG1zZykge1xuICAgIGNvbnNvbGUud2FybigndXBkYXRlX21vZGVscyBmYWlsZWQ6JywgbXNnKTtcbiAgICBfLmRlbGF5KHVwZGF0ZV9tb2RlbHMuYmluZCh0aGlzKSwgNTAwMCk7XG4gIH0uYmluZCh0aGlzKSk7XG59O1xuXG4vKipcbiAqIFdvcmxkIG1vZGVsIGZpdHRpbmdcbiAqL1xuRWQucHJvdG90eXBlLmZpdF9tb2RlbCA9IGZ1bmN0aW9uKG1vZGVsX25hbWUsIGltYWdlX2lkLCBjbGlja194X3JhdGlvLCBjbGlja195X3JhdGlvKSB7XG4gIHZhciByZXF1ZXN0ID0ge1xuICAgIG1vZGVsX25hbWU6IG1vZGVsX25hbWUsXG4gICAgaW1hZ2VfaWQ6IGltYWdlX2lkLFxuICAgIGNsaWNrX3hfcmF0aW86IGNsaWNrX3hfcmF0aW8sXG4gICAgY2xpY2tfeV9yYXRpbzogY2xpY2tfeV9yYXRpbyxcbiAgfTtcblxuICB0aGlzLmZpdF9tb2RlbF9zZXJ2aWNlLmNhbGxTZXJ2aWNlKHJlcXVlc3QsIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgIHRoaXMuZm9yY2VfdXBkYXRlKCk7XG5cbiAgICB2YXIgZXJyb3JfbXNnID0gcmVzcG9uc2UuZXJyb3JfbXNnO1xuICAgIGlmIChlcnJvcl9tc2cpIHtcbiAgICAgIGNvbnNvbGUud2FybignZml0IG1vZGVsIGVycm9yOicsIGVycm9yX21zZyk7XG4gICAgfVxuICB9LmJpbmQodGhpcykpO1xufTtcblxuRWQucHJvdG90eXBlLnVuZG9fZml0X21vZGVsID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgdmFyIHJlcXVlc3QgPSB7XG4gICAgdW5kb19sYXRlc3RfZml0OiB0cnVlLFxuICB9O1xuXG4gIHRoaXMuZml0X21vZGVsX3NlcnZpY2UuY2FsbFNlcnZpY2UocmVxdWVzdCwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgdGhpcy5mb3JjZV91cGRhdGUoKTtcblxuICAgIHZhciBlcnJvcl9tc2cgPSByZXNwb25zZS5lcnJvcl9tc2c7XG4gICAgaWYgKGVycm9yX21zZykge1xuICAgICAgY29uc29sZS53YXJuKCdmaXQgbW9kZWwgZXJyb3I6JywgZXJyb3JfbXNnKTtcbiAgICAgIGNhbGxiYWNrKGVycm9yX21zZyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxiYWNrKG51bGwpO1xuICAgIH1cbiAgfS5iaW5kKHRoaXMpLCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICB0aGlzLmZvcmNlX3VwZGF0ZSgpO1xuXG4gICAgICBjb25zb2xlLndhcm4oJ2ZpdCBtb2RlbCBlcnJvcjonLCBlcnIpO1xuICAgICAgY2FsbGJhY2soZXJyKTtcbiAgfS5iaW5kKHRoaXMpKTtcbn07XG5cbnZhciBuYXZpZ2F0ZV90eXBlcyA9IHtcbiAgTkFWSUdBVEVfVE9fUElYRUw6IDEsXG4gIFRVUk5fTEVGVCAgICAgICAgOiAyLFxuICBUVVJOX1JJR0hUICAgICAgIDogMyxcbn07XG5cbkVkLnByb3RvdHlwZS5uYXZpZ2F0ZV90byA9IGZ1bmN0aW9uKHgsIHksIHNuYXBzaG90X2lkKSB7XG4gIHRoaXMubmF2aWdhdGVfdG9fc2VydmljZS5jYWxsU2VydmljZSh7XG4gICAgc25hcHNob3RfaWQ6IHNuYXBzaG90X2lkLFxuICAgIG5hdmlnYXRpb25fdHlwZTogbmF2aWdhdGVfdHlwZXMuTkFWSUdBVEVfVE9fUElYRUwsXG4gICAgY2xpY2tfeF9yYXRpbzogeCxcbiAgICBjbGlja195X3JhdGlvOiB5LFxuICB9LCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgdmFyIGVycm9yX21zZyA9IHJlc3VsdC5lcnJvcl9tc2c7XG4gICAgaWYgKGVycm9yX21zZykge1xuICAgICAgY29uc29sZS53YXJuKGVycm9yX21zZyk7XG4gICAgfVxuICB9KTtcbn07XG5cbkVkLnByb3RvdHlwZS5jcmVhdGVfd2FsbHMgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IF8ubm9vcDtcbiAgdGhpcy5jcmVhdGVfd2FsbHNfc2VydmljZS5jYWxsU2VydmljZSh7fSwgZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgIGNhbGxiYWNrKCk7XG4gIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFZDtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyogZ2xvYmFsIEV2ZW50RW1pdHRlcjIsIF8gKi9cblxuLy8gSGFyZHdhcmUgY29uc3RhbnRzXG5cbnZhciBsZXZlbHMgPSB7XG4gIFNUQUxFOiAgICAgICAgMCxcbiAgSURMRTogICAgICAgICAxLFxuICBPUEVSQVRJT05BTDogIDIsXG4gIEhPTUlORzogICAgICAgMyxcbiAgRVJST1I6ICAgICAgICA0LFxufTtcblxuLy8gUm9ib3Qgc3BlY2lmaWMgSGFyZHdhcmUgY29uc3RhbnRzIHRoYXQgc2hvdWxkIGNvbWUgZnJvbSB0aGUgcGFyYW1ldGVyIHNlcnZlclxuXG4vKlxufCAgIE5hbWUgIHwgSG9tZWFibGUgfCBIb21lYWJsZU1hbmRhdG9yeSB8IFJlc2V0YWJsZSB8XG58LS0tLS0tLS0tfC0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tLXxcbnwgQmFzZSAgICB8IG5vICAgICAgIHwgbm8gICAgICAgICAgICAgICAgfCB5ZXMgICAgICAgfFxufCBTcGluZGxlIHwgeWVzICAgICAgfCB5ZXMgICAgICAgICAgICAgICB8IHllcyAgICAgICB8XG58IEFybSAgICAgfCB5ZXMgICAgICB8IG5vICAgICAgICAgICAgICAgIHwgeWVzICAgICAgIHxcbnwgSGVhZCAgICB8IG5vICAgICAgIHwgbm8gICAgICAgICAgICAgICAgfCBubyAgICAgICAgfFxuKi9cbnZhciBwcm9wZXJ0aWVzID0ge1xuICAvLyBOYW1lICAgICB8IEhvbWVhYmxlIHwgSG9tZWFibGVNYW5kYXRvcnkgfCBSZXNldGFibGUgfFxuICBhbGw6ICAgICAgICBbIHRydWUgICAgICwgZmFsc2UgICAgICAgICAgICAgLCB0cnVlICAgICAgXSxcbiAgYmFzZTogICAgICAgWyBmYWxzZSAgICAsIGZhbHNlICAgICAgICAgICAgICwgdHJ1ZSAgICAgIF0sXG4gIHNwaW5kbGU6ICAgIFsgdHJ1ZSAgICAgLCB0cnVlICAgICAgICAgICAgICAsIHRydWUgICAgICBdLFxuICBsZWZ0X2FybTogICBbIHRydWUgICAgICwgZmFsc2UgICAgICAgICAgICAgLCB0cnVlICAgICAgXSxcbiAgcmlnaHRfYXJtOiAgWyB0cnVlICAgICAsIGZhbHNlICAgICAgICAgICAgICwgdHJ1ZSAgICAgIF0sXG4gIGhlYWQ6ICAgICAgIFsgZmFsc2UgICAgLCBmYWxzZSAgICAgICAgICAgICAsIGZhbHNlICAgICBdLFxufTtcbi8vIHRyYW5zZm9ybSB0aGUgYXJyYXkgb2YgYm9vbHMgdG8gYW4gb2JqZWN0XG5wcm9wZXJ0aWVzID0gXy5tYXBWYWx1ZXMocHJvcGVydGllcywgZnVuY3Rpb24gKHYpIHtcbiAgcmV0dXJuIHtcbiAgICBob21lYWJsZTogICAgICAgICAgIHZbMF0sXG4gICAgaG9tZWFibGVfbWFuZGF0b3J5OiB2WzFdLFxuICAgIHJlc2V0YWJsZTogICAgICAgICAgdlsyXSxcbiAgfTtcbn0pO1xuXG52YXIgaGFyZHdhcmVfaWRzID0ge1xuICAnYWxsJzogICAgICAgIDAsXG4gICdiYXNlJzogICAgICAgMSxcbiAgJ3NwaW5kbGUnOiAgICAyLFxuICAnbGVmdF9hcm0nOiAgIDMsXG4gICdyaWdodF9hcm0nOiAgNCxcbiAgJ2hlYWQnOiAgICAgICA1LFxufTtcblxudmFyIGRlZmF1bHRfc3RhdHVzID0gXy5tYXBWYWx1ZXMoaGFyZHdhcmVfaWRzLCBmdW5jdGlvbiAodmFsdWUsIG5hbWUpIHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBuYW1lLFxuICAgIGxldmVsOiBsZXZlbHMuU1RBTEUsXG4gICAgaG9tZWQ6IGZhbHNlLFxuICB9O1xufSk7XG5cbi8vIHB1YmxpYyBBUElcblxuZnVuY3Rpb24gSGFyZHdhcmUgKHJvYm90KSB7XG4gIEV2ZW50RW1pdHRlcjIuYXBwbHkodGhpcyk7XG5cbiAgdmFyIHJvcyA9IHJvYm90LnJvcztcblxuICB0aGlzLnN0YXR1cyA9IFtdO1xuICB0aGlzLnN0YXR1c190b3BpYyA9IHJvcy5Ub3BpYyh7XG4gICAgbmFtZTogJ2hhcmR3YXJlX3N0YXR1cycsXG4gICAgbWVzc2FnZVR5cGU6ICdkaWFnbm9zdGljX21zZ3MvRGlhZ25vc3RpY0FycmF5JyxcbiAgICB0aHJvdHRsZV9yYXRlOiA1MDAsXG4gIH0pO1xuICB0aGlzLnN0YXR1c190b3BpYy5zdWJzY3JpYmUodGhpcy5vblN0YXR1cy5iaW5kKHRoaXMpKTtcblxuICB0aGlzLm1vZGVscyA9IFtdO1xufVxuXG5IYXJkd2FyZS5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RW1pdHRlcjIucHJvdG90eXBlKTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KEhhcmR3YXJlLnByb3RvdHlwZSwgJ3N0YXR1cycsIHtcbiAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fc3RhdHVzO1xuICB9LFxuICBzZXQ6IGZ1bmN0aW9uKHN0YXR1cykge1xuICAgIHRoaXMuX3N0YXR1cyA9IHN0YXR1cztcbiAgICB0aGlzLmVtaXQoJ3N0YXR1cycsIHN0YXR1cyk7XG4gIH1cbn0pO1xuXG5IYXJkd2FyZS5wcm90b3R5cGUub25TdGF0dXMgPSBmdW5jdGlvbihtc2cpIHtcbiAgdGhpcy5zdGF0dXMgPSBkaWFnbm9zdGljTXNnVG9TdGF0dXMobXNnKTtcbn07XG5cbi8vIGNvbnZlcnQgYW4gaW5jb21pbmcgc3RhdHVzIG1lc3NhZ2UgdG8gYWN0dWFsIHdvcmthYmxlIHByb3BlcnRpZXNcbmZ1bmN0aW9uIGRpYWdub3N0aWNNc2dUb1N0YXR1cyhtZXNzYWdlKSB7XG4gIHZhciBwYXJ0cyA9IG1lc3NhZ2Uuc3RhdHVzLm1hcChmdW5jdGlvbiAocGFydCkge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBwYXJ0Lm5hbWUsXG4gICAgICBsZXZlbDogcGFydC5sZXZlbCxcbiAgICAgIGhvbWVkOiBwYXJ0Lm1lc3NhZ2UgPT09ICdob21lZCcsXG4gICAgfTtcbiAgfSk7XG4gIHZhciBoYXJkd2FyZV9zdGF0dXMgPSBfLmluZGV4QnkocGFydHMsICduYW1lJyk7XG5cbiAgLy8gZmlsbCBhbGwgbWlzc2luZyBoYXJkd2FyZSBwYXJ0cyB3aXRoICdpZGxlJ1xuICBfLmRlZmF1bHRzKGhhcmR3YXJlX3N0YXR1cywgZGVmYXVsdF9zdGF0dXMpO1xuXG4gIF8ubWFwVmFsdWVzKGhhcmR3YXJlX3N0YXR1cywgZnVuY3Rpb24gKHBhcnQpIHtcbiAgICBwYXJ0LmFjdGlvbnMgPSBnZXRBY3Rpb25zKHBhcnQpO1xuICAgIHJldHVybiBwYXJ0O1xuICB9KTtcblxuICByZXR1cm4gaGFyZHdhcmVfc3RhdHVzO1xufVxuXG4vLyByZXR1cm4gYWxsIHBvc3NpYmxlIGFjdGlvbnMgZm9yIGEgaGFyZHdhcmUgcGFydFxuZnVuY3Rpb24gZ2V0QWN0aW9ucyhwYXJ0KSB7XG4gIHZhciBwcm9wcyA9IHByb3BlcnRpZXNbcGFydC5uYW1lXTtcbiAgaWYgKCFwcm9wcykge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciBsZXZlbCA9IHBhcnQgPyBwYXJ0LmxldmVsIDogLTE7XG4gIHZhciBob21lZCA9IHBhcnQgPyBwYXJ0LmhvbWVkIDogZmFsc2U7XG5cbiAgdmFyIGFjdGlvbnMgPSB7fTtcblxuICAvLyBvbmx5IHNob3cgdGhlIGhvbWUgYWN0aW9uIGlmIGhvbWVhYmxlXG4gIGlmIChwcm9wcy5ob21lYWJsZSkge1xuICAgIGFjdGlvbnMuaG9tZSA9IHtcbiAgICAgIGVuYWJsZWQ6IGxldmVsID09PSBsZXZlbHMuSURMRSxcbiAgICAgIHdhcm5pbmc6IGhvbWVkID9cbiAgICAgICAgJ1RoaXMgcGFydCB3YXMgYWxyZWFkeSBob21lZCwgQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIHJlZG8gaG9taW5nPycgOiBmYWxzZSxcbiAgICB9O1xuICB9XG5cbiAgLy8gYWx3YXlzIHNob3cgc3RhcnQgYWN0aW9uXG4gIGFjdGlvbnMuc3RhcnQgPSB7XG4gICAgZW5hYmxlZDogbGV2ZWwgPT09IGxldmVscy5JRExFICYmIChob21lZCB8fCAhcHJvcHMuaG9tZWFibGVfbWFuZGF0b3J5KSxcbiAgICB3YXJuaW5nOiBwcm9wcy5ob21lYWJsZSAmJiAhaG9tZWQgP1xuICAgICAgJ1RoaXMgcGFydCBpcyBub3QgeWV0IGhvbWVkLCBBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gcHJvY2VlZD8nIDogZmFsc2UsXG4gIH07XG5cbiAgLy8gYWx3YXlzIHNob3cgc3RvcCBhY3Rpb25cbiAgYWN0aW9ucy5zdG9wID0ge1xuICAgIGVuYWJsZWQ6IGxldmVsID09PSBsZXZlbHMuSE9NSU5HIHx8IGxldmVsID09PSBsZXZlbHMuT1BFUkFUSU9OQUwsXG4gIH07XG5cbiAgLy8gb25seSBzaG93IHJlc2V0IGFjdGlvbiBpZiByZXNldGFibGVcbiAgaWYgKHByb3BzLnJlc2V0YWJsZSkge1xuICAgIGFjdGlvbnMucmVzZXQgPSB7XG4gICAgICBlbmFibGVkOiBsZXZlbCA9PT0gbGV2ZWxzLkVSUk9SLFxuICAgIH07XG4gIH1cblxuICByZXR1cm4gYWN0aW9ucztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBIYXJkd2FyZTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyogZ2xvYmFsIFJPU0xJQiwgRXZlbnRFbWl0dGVyMiAqL1xuXG5mdW5jdGlvbiBIZWFkIChyb2JvdCkge1xuICBFdmVudEVtaXR0ZXIyLmFwcGx5KHRoaXMpO1xuXG4gIHZhciByb3MgPSByb2JvdC5yb3M7XG5cbiAgdGhpcy5nb2FsID0gbnVsbDtcbiAgLy8gdGhpcy5oZWFkX2FjID0gcm9zLkFjdGlvbkNsaWVudCh7XG4gIC8vICAgc2VydmVyTmFtZTogJ2hlYWRfcmVmL2FjdGlvbl9zZXJ2ZXInLFxuICAvLyAgIGFjdGlvbk5hbWU6ICdoZWFkX3JlZi9IZWFkUmVmZXJlbmNlQWN0aW9uJyxcbiAgLy8gfSk7XG59XG5cbkhlYWQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShFdmVudEVtaXR0ZXIyLnByb3RvdHlwZSk7XG5cbkhlYWQucHJvdG90eXBlLnNlbmRfZ29hbCA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLmdvYWwgPSBuZXcgUk9TTElCLkdvYWwoe1xuICAgIGFjdGlvbkNsaWVudDogdGhpcy5oZWFkX2FjLFxuICAgIGdvYWxNZXNzYWdlOiB7XG4gICAgICBnb2FsX3R5cGU6IG51bGwsICAgICAgICAgIC8vIGVpdGhlciBMT09LQVQgb3IgUEFOX1RJTFRcblxuICAgICAgcHJpb3JpdHk6IDEsICAgICAgICAgICAvLyBbMS0yNTVdIChhY3Rpb24gY2xpZW50IGNhbGxzIHdpdGggdGhlIHNhbWUgcHJpb3JpdHkgY2FuY2VsIGVhY2ggb3RoZXIpXG5cbiAgICAgIHBhbl92ZWw6IG51bGwsICAgICAgICAgICAgLy8gcGFuX3ZlbFxuICAgICAgdGlsdF92ZWw6IG51bGwsICAgICAgICAgICAvLyB0aWx0X3ZlbFxuXG4gICAgICAvLyBpbiBjYXNlIG9mIExPT0tBVDpcbiAgICAgIHRhcmdldF9wb2ludDogbnVsbCwgICAgICAgLy8gdXNlIGluIGNhc2Ugb2YgTE9PS0FUXG5cbiAgICAgIC8vIGluIGNhc2Ugb2YgUEFOX1RJTFRcbiAgICAgIHBhbjogbnVsbCwgICAgICAgICAgICAgICAgLy8gdXNlIGluIGNhc2Ugb2YgUEFOX1RJTFRcbiAgICAgIHRpbHQ6IG51bGwsICAgICAgICAgICAgICAgLy8gdXNlIGluIGNhc2Ugb2YgUEFOX1RJTFRcblxuICAgICAgZW5kX3RpbWU6IG51bGwgICAgICAgICAgICAvLyBnb2FsIGNhbmNlbHMgYXV0b21hdGljYWxseSBhZnRlciB0aGlzIHRpbWUgKHNlY29uZHMpLCBpZiAwLCBubyBhdXRvIGNhbmNlbFxuICAgIH1cbiAgfSk7XG5cbiAgdGhpcy5nb2FsLm9uKCdmZWVkYmFjaycsIGZ1bmN0aW9uKGZlZWRiYWNrKSB7XG4gICAgY29uc29sZS5sb2coJ0ZlZWRiYWNrOicsIGZlZWRiYWNrKTtcbiAgfSk7XG4gIHRoaXMuZ29hbC5vbigncmVzdWx0JywgZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgY29uc29sZS5sb2coJ1Jlc3VsdDonLCByZXN1bHQpO1xuICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSGVhZDtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEVkICAgICAgID0gcmVxdWlyZSgnLi9lZCcpO1xudmFyIEhhcmR3YXJlID0gcmVxdWlyZSgnLi9oYXJkd2FyZScpO1xudmFyIEhlYWQgICAgID0gcmVxdWlyZSgnLi9oZWFkJyk7XG52YXIgQmFzZSAgICAgPSByZXF1aXJlKCcuL2Jhc2UnKTtcblxuLyogZ2xvYmFsIEV2ZW50RW1pdHRlcjIsIFJPU0xJQiwgSGFyZHdhcmUsIEVkLCBIZWFkLCBCYXNlICovXG5cbi8vIFByaXZhdGUgdmFyaWFibGVzXG52YXIgcm9zYnJpZGdlX3VybCA9ICd3czovLycgKyB3aW5kb3cubG9jYXRpb24uaG9zdG5hbWUgKyAnOjkwOTAnO1xuXG52YXIgUkVDT05ORUNUX1RJTUVPVVQgPSA1MDAwOyAvLyBtc1xuXG4vLyBSb2JvdCBjb25zdHJ1Y3RvclxuZnVuY3Rpb24gUm9ib3QgKCkge1xuICAvLyBwYXJlbnQgY29uc3RydWN0b3JcbiAgRXZlbnRFbWl0dGVyMi5hcHBseSh0aGlzKTtcblxuICB0aGlzLnJvcyA9IG5ldyBST1NMSUIuUm9zKCk7XG5cbiAgdGhpcy5yb3Mub24oJ2Nvbm5lY3Rpb24nLCB0aGlzLm9uQ29ubmVjdGlvbi5iaW5kKHRoaXMpKTtcbiAgdGhpcy5yb3Mub24oJ2Nsb3NlJywgdGhpcy5vbkNsb3NlLmJpbmQodGhpcykpO1xuICB0aGlzLnJvcy5vbignZXJyb3InLCB0aGlzLm9uRXJyb3IuYmluZCh0aGlzKSk7XG5cbiAgLy8gcmVjb25uZWN0IGJlaGF2aW9yXG4gIHRoaXMub24oJ3N0YXR1cycsIGZ1bmN0aW9uIChzdGF0dXMpIHtcbiAgICBzd2l0Y2ggKHN0YXR1cykge1xuICAgICAgY2FzZSAnY2xvc2VkJzpcbiAgICAgICAgc2V0VGltZW91dCh0aGlzLmNvbm5lY3QuYmluZCh0aGlzKSwgUkVDT05ORUNUX1RJTUVPVVQpO1xuICAgIH1cbiAgfSk7XG5cbiAgdGhpcy5jb25uZWN0KCk7XG5cbiAgdGhpcy5lZCAgICAgICA9IG5ldyBFZCh0aGlzKTtcbiAgdGhpcy5oYXJkd2FyZSA9IG5ldyBIYXJkd2FyZSh0aGlzKTtcbiAgdGhpcy5oZWFkICAgICA9IG5ldyBIZWFkKHRoaXMpO1xuICB0aGlzLmJhc2UgICAgID0gbmV3IEJhc2UodGhpcyk7XG59XG5cbi8vIGluaGVyaXQgZnJvbSBFdmVudEVtaXR0ZXIyXG5Sb2JvdC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEV2ZW50RW1pdHRlcjIucHJvdG90eXBlKTtcblxuLy8gc3RhdHVzIGdldHRlciArIHNldHRlclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvYm90LnByb3RvdHlwZSwgJ3N0YXR1cycsIHtcbiAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5fc3RhdHVzO1xuICB9LFxuICBzZXQ6IGZ1bmN0aW9uKHN0YXR1cykge1xuICAgIHRoaXMuX3N0YXR1cyA9IHN0YXR1cztcbiAgICB0aGlzLmVtaXQoJ3N0YXR1cycsIHN0YXR1cyk7XG4gIH1cbn0pO1xuXG4vLyBzdGFydCBjb25uZWN0aW9uXG5Sb2JvdC5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uICgpIHtcbiAgY29uc29sZS5sb2coJ2Nvbm5lY3RpbmcgdG8gJyArIHJvc2JyaWRnZV91cmwpO1xuICB0aGlzLnJvcy5jb25uZWN0KHJvc2JyaWRnZV91cmwpO1xuICB0aGlzLnN0YXR1cyA9ICdjb25uZWN0aW5nJztcbn07XG5cbi8vIHJvcyBzdGF0dXMgZXZlbnQgaGFuZGxpbmdcblJvYm90LnByb3RvdHlwZS5vbkNvbm5lY3Rpb24gPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJ2Nvbm5lY3Rpb24nKTtcbiAgdGhpcy5zdGF0dXMgPSAnY29ubmVjdGVkJztcbn07XG5cblJvYm90LnByb3RvdHlwZS5vbkNsb3NlID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCdjb25uZWN0aW9uIGNsb3NlZCcpO1xuICB0aGlzLnN0YXR1cyA9ICdjbG9zZWQnO1xufTtcblxuUm9ib3QucHJvdG90eXBlLm9uRXJyb3IgPSBmdW5jdGlvbigpIHtcbiAgLy8gY29uc29sZS5sb2coJ2Nvbm5lY3Rpb24gZXJyb3InKTtcbiAgdGhpcy5zdGF0dXMgPSAnZXJyb3InO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBSb2JvdDtcbiJdfQ==
