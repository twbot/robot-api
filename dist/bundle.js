(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.API = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
'use strict';

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

exports.__esModule = true;

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

},{"babel-runtime/helpers/class-call-check":14,"babel-runtime/helpers/inherits":16,"eventemitter2":8}],2:[function(require,module,exports){
(function (global){
'use strict';

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Map = require('babel-runtime/core-js/map')['default'];

var _getIterator = require('babel-runtime/core-js/get-iterator')['default'];

exports.__esModule = true;

var _eventemitter2 = require('eventemitter2');

var _roslib = (typeof window !== "undefined" ? window['ROSLIB'] : typeof global !== "undefined" ? global['ROSLIB'] : null);

var Ed = (function (_EventEmitter2) {
  _inherits(Ed, _EventEmitter2);

  function Ed(robot) {
    _classCallCheck(this, Ed);

    _EventEmitter2.call(this);
    this.entities = new _Map();
    this.revision = 0;
    var ros = robot.ros;

    this.queryService = ros.Service({
      name: 'ed/query',
      serviceType: 'ed/Query'
    });
  }

  Ed.prototype.query = function query(callback) {
    var _this = this;

    var request = new _roslib.ServiceRequest({
      /* eslint camelcase:0 */
      // string[] ids
      // string[] properties
      since_revision: this.revision
    });

    console.time('ed.query');
    this.queryService.callService(request, function (response) {
      console.timeEnd('ed.query');

      var new_revision = response.new_revision;

      if (new_revision <= _this.revision) {
        console.error('ed:query incorrect revision');
        return;
      }
      _this.revision = new_revision;

      console.time('JSON.parse');
      var data = JSON.parse(response.human_readable);
      console.timeEnd('JSON.parse');

      console.time('ed.updateEntities');
      _this._updateEntities(data.entities);
      console.timeEnd('ed.updateEntities');

      callback && callback();
    }, function (error) {
      console.log('ed:query callService ' + _this.name + ' failed:', error);
    });
  };

  Ed.prototype.watch = function watch(callbacks) {
    if (callbacks.add) {
      this.on('entities.add', callbacks.add);
    }
    if (callbacks.update) {
      this.on('entities.update', callbacks.update);
    }
    if (callbacks.remove) {
      this.on('entities.remove', callbacks.remove);
    }
  };

  Ed.prototype._updateEntities = function _updateEntities(entities) {
    var _this2 = this;

    var add = [];
    var update = [];
    var remove = [];

    var _loop = function () {
      if (_isArray) {
        if (_i >= _iterator.length) return 'break';
        _ref = _iterator[_i++];
      } else {
        _i = _iterator.next();
        if (_i.done) return 'break';
        _ref = _i.value;
      }

      var entity = _ref;

      var id = entity.id;
      var newObj = { id: id };

      if (_this2.entities.has(id)) {
        // update object
        var oldObj = _this2.entities.get(id);

        if (entity.hasOwnProperty('pose')) {
          var _parseEdPosition = parseEdPosition(entity.pose);

          var position = _parseEdPosition.position;
          var quaternion = _parseEdPosition.quaternion;

          newObj.position = position;
          newObj.quaternion = quaternion;
        } else {
          // use the old position
          oldObj.position && (newObj.position = oldObj.position);
          oldObj.quaternion && (newObj.quaternion = oldObj.quaternion);
        }

        if (entity.hasOwnProperty('mesh')) {
          var _parseEdMesh = parseEdMesh(entity.mesh);

          var vertices = _parseEdMesh.vertices;
          var faces = _parseEdMesh.faces;

          newObj.vertices = vertices;
          newObj.faces = faces;
        } else {
          // use the old mesh
          oldObj.vertices && (newObj.vertices = oldObj.vertices);
          oldObj.faces && (newObj.faces = oldObj.faces);
        }

        _this2.entities.set(id, newObj);

        var props = ['position', 'quaternion', 'vertices', 'faces'];
        if (props.every(function (key) {
          return key in newObj;
        })) {
          update.push([newObj, oldObj]);
        } else {
          console.warn('incomplete object:', newObj);
        }
      } else {
        // add object

        if (entity.hasOwnProperty('pose')) {
          var _parseEdPosition2 = parseEdPosition(entity.pose);

          var position = _parseEdPosition2.position;
          var quaternion = _parseEdPosition2.quaternion;

          newObj.position = position;
          newObj.quaternion = quaternion;
        }

        if (entity.hasOwnProperty('mesh')) {
          var _parseEdMesh2 = parseEdMesh(entity.mesh);

          var vertices = _parseEdMesh2.vertices;
          var faces = _parseEdMesh2.faces;

          newObj.vertices = vertices;
          newObj.faces = faces;
        }

        _this2.entities.set(id, newObj);

        var props = ['position', 'quaternion', 'vertices', 'faces'];
        if (props.every(function (key) {
          return key in newObj;
        })) {
          add.push(newObj);
        } else {
          console.warn('incomplete object:', newObj);
        }
      }
    };

    for (var _iterator = entities, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _getIterator(_iterator);;) {
      var _ref;

      var _ret = _loop();

      if (_ret === 'break') break;
    }

    // TODO: parse 'remove_entities'

    // invoke callbacks
    for (var _iterator2 = add, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _getIterator(_iterator2);;) {
      var _ref2;

      if (_isArray2) {
        if (_i2 >= _iterator2.length) break;
        _ref2 = _iterator2[_i2++];
      } else {
        _i2 = _iterator2.next();
        if (_i2.done) break;
        _ref2 = _i2.value;
      }

      var data = _ref2;

      this.emit.apply(this, ['entities.add'].concat(data));
    }
    for (var _iterator3 = update, _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _getIterator(_iterator3);;) {
      var _ref3;

      if (_isArray3) {
        if (_i3 >= _iterator3.length) break;
        _ref3 = _iterator3[_i3++];
      } else {
        _i3 = _iterator3.next();
        if (_i3.done) break;
        _ref3 = _i3.value;
      }

      var data = _ref3;

      this.emit('entities.update', data);
    }
    for (var _iterator4 = remove, _isArray4 = Array.isArray(_iterator4), _i4 = 0, _iterator4 = _isArray4 ? _iterator4 : _getIterator(_iterator4);;) {
      var _ref4;

      if (_isArray4) {
        if (_i4 >= _iterator4.length) break;
        _ref4 = _iterator4[_i4++];
      } else {
        _i4 = _iterator4.next();
        if (_i4.done) break;
        _ref4 = _i4.value;
      }

      var data = _ref4;

      this.emit('entities.remove', data);
    }
  };

  return Ed;
})(_eventemitter2.EventEmitter2);

function parseEdPosition(pose) {
  return {
    position: [pose.x, pose.y, pose.z],
    quaternion: [pose.qx, pose.qy, pose.qz, pose.qw]
  };
}

function parseEdMesh(mesh) {
  var vertices = [];
  for (var _iterator5 = mesh.vertices, _isArray5 = Array.isArray(_iterator5), _i5 = 0, _iterator5 = _isArray5 ? _iterator5 : _getIterator(_iterator5);;) {
    var _ref5;

    if (_isArray5) {
      if (_i5 >= _iterator5.length) break;
      _ref5 = _iterator5[_i5++];
    } else {
      _i5 = _iterator5.next();
      if (_i5.done) break;
      _ref5 = _i5.value;
    }

    var vertex = _ref5;

    vertices.push([vertex.x, vertex.y, vertex.z]);
  }

  var faces = [];
  for (var _iterator6 = mesh.triangles, _isArray6 = Array.isArray(_iterator6), _i6 = 0, _iterator6 = _isArray6 ? _iterator6 : _getIterator(_iterator6);;) {
    var _ref6;

    if (_isArray6) {
      if (_i6 >= _iterator6.length) break;
      _ref6 = _iterator6[_i6++];
    } else {
      _i6 = _iterator6.next();
      if (_i6.done) break;
      _ref6 = _i6.value;
    }

    var triangle = _ref6;

    faces.push([triangle.i1, triangle.i2, triangle.i3]);
  }

  return { vertices: vertices, faces: faces };
}

exports['default'] = Ed;
module.exports = exports['default'];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"babel-runtime/core-js/get-iterator":9,"babel-runtime/core-js/map":10,"babel-runtime/helpers/class-call-check":14,"babel-runtime/helpers/inherits":16,"eventemitter2":8}],3:[function(require,module,exports){
(function (global){
/* eslint key-spacing: 0 */
/* eslint no-multi-spaces: 0 */

'use strict';

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

exports.__esModule = true;

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

},{"babel-runtime/helpers/interop-require-default":17}],4:[function(require,module,exports){
(function (global){
'use strict';

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

exports.__esModule = true;

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

exports['default'] = Hardware;
module.exports = exports['default'];

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./hardware-properties":3,"babel-runtime/helpers/class-call-check":14,"babel-runtime/helpers/create-class":15,"babel-runtime/helpers/inherits":16,"babel-runtime/helpers/interop-require-default":17,"eventemitter2":8}],5:[function(require,module,exports){
(function (global){
'use strict';

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

exports.__esModule = true;

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

},{"babel-runtime/helpers/class-call-check":14,"babel-runtime/helpers/inherits":16,"eventemitter2":8}],6:[function(require,module,exports){
'use strict';

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

exports.__esModule = true;

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

},{"./base":1,"./ed":2,"./hardware":4,"./head":5,"./robot":7,"babel-runtime/helpers/interop-require-default":17}],7:[function(require,module,exports){
(function (global){
'use strict';

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')['default'];

exports.__esModule = true;

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

},{"./base":1,"./ed":2,"./hardware":4,"./head":5,"babel-runtime/helpers/class-call-check":14,"babel-runtime/helpers/create-class":15,"babel-runtime/helpers/inherits":16,"babel-runtime/helpers/interop-require-default":17,"eventemitter2":8,"os":74}],8:[function(require,module,exports){
(function (global){
'use strict';

module.exports = {
  EventEmitter2: global.EventEmitter2
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],9:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/get-iterator"), __esModule: true };
},{"core-js/library/fn/get-iterator":18}],10:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/map"), __esModule: true };
},{"core-js/library/fn/map":19}],11:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/create"), __esModule: true };
},{"core-js/library/fn/object/create":20}],12:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/define-property"), __esModule: true };
},{"core-js/library/fn/object/define-property":21}],13:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/set-prototype-of"), __esModule: true };
},{"core-js/library/fn/object/set-prototype-of":22}],14:[function(require,module,exports){
"use strict";

exports["default"] = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

exports.__esModule = true;
},{}],15:[function(require,module,exports){
"use strict";

var _Object$defineProperty = require("babel-runtime/core-js/object/define-property")["default"];

exports["default"] = (function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;

      _Object$defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
})();

exports.__esModule = true;
},{"babel-runtime/core-js/object/define-property":12}],16:[function(require,module,exports){
"use strict";

var _Object$create = require("babel-runtime/core-js/object/create")["default"];

var _Object$setPrototypeOf = require("babel-runtime/core-js/object/set-prototype-of")["default"];

exports["default"] = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = _Object$create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) _Object$setPrototypeOf ? _Object$setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};

exports.__esModule = true;
},{"babel-runtime/core-js/object/create":11,"babel-runtime/core-js/object/set-prototype-of":13}],17:[function(require,module,exports){
"use strict";

exports["default"] = function (obj) {
  return obj && obj.__esModule ? obj : {
    "default": obj
  };
};

exports.__esModule = true;
},{}],18:[function(require,module,exports){
require('../modules/web.dom.iterable');
require('../modules/es6.string.iterator');
module.exports = require('../modules/core.get-iterator');
},{"../modules/core.get-iterator":66,"../modules/es6.string.iterator":71,"../modules/web.dom.iterable":73}],19:[function(require,module,exports){
require('../modules/es6.object.to-string');
require('../modules/es6.string.iterator');
require('../modules/web.dom.iterable');
require('../modules/es6.map');
require('../modules/es7.map.to-json');
module.exports = require('../modules/$.core').Map;
},{"../modules/$.core":30,"../modules/es6.map":68,"../modules/es6.object.to-string":70,"../modules/es6.string.iterator":71,"../modules/es7.map.to-json":72,"../modules/web.dom.iterable":73}],20:[function(require,module,exports){
var $ = require('../../modules/$');
module.exports = function create(P, D){
  return $.create(P, D);
};
},{"../../modules/$":47}],21:[function(require,module,exports){
var $ = require('../../modules/$');
module.exports = function defineProperty(it, key, desc){
  return $.setDesc(it, key, desc);
};
},{"../../modules/$":47}],22:[function(require,module,exports){
require('../../modules/es6.object.set-prototype-of');
module.exports = require('../../modules/$.core').Object.setPrototypeOf;
},{"../../modules/$.core":30,"../../modules/es6.object.set-prototype-of":69}],23:[function(require,module,exports){
module.exports = function(it){
  if(typeof it != 'function')throw TypeError(it + ' is not a function!');
  return it;
};
},{}],24:[function(require,module,exports){
var isObject = require('./$.is-object');
module.exports = function(it){
  if(!isObject(it))throw TypeError(it + ' is not an object!');
  return it;
};
},{"./$.is-object":41}],25:[function(require,module,exports){
// getting tag from 19.1.3.6 Object.prototype.toString()
var cof = require('./$.cof')
  , TAG = require('./$.wks')('toStringTag')
  // ES3 wrong here
  , ARG = cof(function(){ return arguments; }()) == 'Arguments';

module.exports = function(it){
  var O, T, B;
  return it === undefined ? 'Undefined' : it === null ? 'Null'
    // @@toStringTag case
    : typeof (T = (O = Object(it))[TAG]) == 'string' ? T
    // builtinTag case
    : ARG ? cof(O)
    // ES3 arguments fallback
    : (B = cof(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : B;
};
},{"./$.cof":26,"./$.wks":64}],26:[function(require,module,exports){
var toString = {}.toString;

module.exports = function(it){
  return toString.call(it).slice(8, -1);
};
},{}],27:[function(require,module,exports){
'use strict';
var $            = require('./$')
  , hide         = require('./$.hide')
  , ctx          = require('./$.ctx')
  , species      = require('./$.species')
  , strictNew    = require('./$.strict-new')
  , defined      = require('./$.defined')
  , forOf        = require('./$.for-of')
  , step         = require('./$.iter-step')
  , ID           = require('./$.uid')('id')
  , $has         = require('./$.has')
  , isObject     = require('./$.is-object')
  , isExtensible = Object.isExtensible || isObject
  , SUPPORT_DESC = require('./$.support-desc')
  , SIZE         = SUPPORT_DESC ? '_s' : 'size'
  , id           = 0;

var fastKey = function(it, create){
  // return primitive with prefix
  if(!isObject(it))return typeof it == 'symbol' ? it : (typeof it == 'string' ? 'S' : 'P') + it;
  if(!$has(it, ID)){
    // can't set id to frozen object
    if(!isExtensible(it))return 'F';
    // not necessary to add id
    if(!create)return 'E';
    // add missing object id
    hide(it, ID, ++id);
  // return object id with prefix
  } return 'O' + it[ID];
};

var getEntry = function(that, key){
  // fast case
  var index = fastKey(key), entry;
  if(index !== 'F')return that._i[index];
  // frozen object case
  for(entry = that._f; entry; entry = entry.n){
    if(entry.k == key)return entry;
  }
};

module.exports = {
  getConstructor: function(wrapper, NAME, IS_MAP, ADDER){
    var C = wrapper(function(that, iterable){
      strictNew(that, C, NAME);
      that._i = $.create(null); // index
      that._f = undefined;      // first entry
      that._l = undefined;      // last entry
      that[SIZE] = 0;           // size
      if(iterable != undefined)forOf(iterable, IS_MAP, that[ADDER], that);
    });
    require('./$.mix')(C.prototype, {
      // 23.1.3.1 Map.prototype.clear()
      // 23.2.3.2 Set.prototype.clear()
      clear: function clear(){
        for(var that = this, data = that._i, entry = that._f; entry; entry = entry.n){
          entry.r = true;
          if(entry.p)entry.p = entry.p.n = undefined;
          delete data[entry.i];
        }
        that._f = that._l = undefined;
        that[SIZE] = 0;
      },
      // 23.1.3.3 Map.prototype.delete(key)
      // 23.2.3.4 Set.prototype.delete(value)
      'delete': function(key){
        var that  = this
          , entry = getEntry(that, key);
        if(entry){
          var next = entry.n
            , prev = entry.p;
          delete that._i[entry.i];
          entry.r = true;
          if(prev)prev.n = next;
          if(next)next.p = prev;
          if(that._f == entry)that._f = next;
          if(that._l == entry)that._l = prev;
          that[SIZE]--;
        } return !!entry;
      },
      // 23.2.3.6 Set.prototype.forEach(callbackfn, thisArg = undefined)
      // 23.1.3.5 Map.prototype.forEach(callbackfn, thisArg = undefined)
      forEach: function forEach(callbackfn /*, that = undefined */){
        var f = ctx(callbackfn, arguments[1], 3)
          , entry;
        while(entry = entry ? entry.n : this._f){
          f(entry.v, entry.k, this);
          // revert to the last existing entry
          while(entry && entry.r)entry = entry.p;
        }
      },
      // 23.1.3.7 Map.prototype.has(key)
      // 23.2.3.7 Set.prototype.has(value)
      has: function has(key){
        return !!getEntry(this, key);
      }
    });
    if(SUPPORT_DESC)$.setDesc(C.prototype, 'size', {
      get: function(){
        return defined(this[SIZE]);
      }
    });
    return C;
  },
  def: function(that, key, value){
    var entry = getEntry(that, key)
      , prev, index;
    // change existing entry
    if(entry){
      entry.v = value;
    // create new entry
    } else {
      that._l = entry = {
        i: index = fastKey(key, true), // <- index
        k: key,                        // <- key
        v: value,                      // <- value
        p: prev = that._l,             // <- previous entry
        n: undefined,                  // <- next entry
        r: false                       // <- removed
      };
      if(!that._f)that._f = entry;
      if(prev)prev.n = entry;
      that[SIZE]++;
      // add to index
      if(index !== 'F')that._i[index] = entry;
    } return that;
  },
  getEntry: getEntry,
  setStrong: function(C, NAME, IS_MAP){
    // add .keys, .values, .entries, [@@iterator]
    // 23.1.3.4, 23.1.3.8, 23.1.3.11, 23.1.3.12, 23.2.3.5, 23.2.3.8, 23.2.3.10, 23.2.3.11
    require('./$.iter-define')(C, NAME, function(iterated, kind){
      this._t = iterated;  // target
      this._k = kind;      // kind
      this._l = undefined; // previous
    }, function(){
      var that  = this
        , kind  = that._k
        , entry = that._l;
      // revert to the last existing entry
      while(entry && entry.r)entry = entry.p;
      // get next entry
      if(!that._t || !(that._l = entry = entry ? entry.n : that._t._f)){
        // or finish the iteration
        that._t = undefined;
        return step(1);
      }
      // return step by kind
      if(kind == 'keys'  )return step(0, entry.k);
      if(kind == 'values')return step(0, entry.v);
      return step(0, [entry.k, entry.v]);
    }, IS_MAP ? 'entries' : 'values' , !IS_MAP, true);

    // add [@@species], 23.1.2.2, 23.2.2.2
    species(C);
    species(require('./$.core')[NAME]); // for wrapper
  }
};
},{"./$":47,"./$.core":30,"./$.ctx":31,"./$.defined":33,"./$.for-of":35,"./$.has":37,"./$.hide":38,"./$.is-object":41,"./$.iter-define":44,"./$.iter-step":45,"./$.mix":49,"./$.species":54,"./$.strict-new":55,"./$.support-desc":57,"./$.uid":62}],28:[function(require,module,exports){
// https://github.com/DavidBruant/Map-Set.prototype.toJSON
var forOf   = require('./$.for-of')
  , classof = require('./$.classof');
module.exports = function(NAME){
  return function toJSON(){
    if(classof(this) != NAME)throw TypeError(NAME + "#toJSON isn't generic");
    var arr = [];
    forOf(this, false, arr.push, arr);
    return arr;
  };
};
},{"./$.classof":25,"./$.for-of":35}],29:[function(require,module,exports){
'use strict';
var $          = require('./$')
  , $def       = require('./$.def')
  , hide       = require('./$.hide')
  , forOf      = require('./$.for-of')
  , strictNew  = require('./$.strict-new');

module.exports = function(NAME, wrapper, methods, common, IS_MAP, IS_WEAK){
  var Base  = require('./$.global')[NAME]
    , C     = Base
    , ADDER = IS_MAP ? 'set' : 'add'
    , proto = C && C.prototype
    , O     = {};
  if(!require('./$.support-desc') || typeof C != 'function'
    || !(IS_WEAK || proto.forEach && !require('./$.fails')(function(){ new C().entries().next(); }))
  ){
    // create collection constructor
    C = common.getConstructor(wrapper, NAME, IS_MAP, ADDER);
    require('./$.mix')(C.prototype, methods);
  } else {
    C = wrapper(function(target, iterable){
      strictNew(target, C, NAME);
      target._c = new Base;
      if(iterable != undefined)forOf(iterable, IS_MAP, target[ADDER], target);
    });
    $.each.call('add,clear,delete,forEach,get,has,set,keys,values,entries'.split(','),function(KEY){
      var chain = KEY == 'add' || KEY == 'set';
      if(KEY in proto && !(IS_WEAK && KEY == 'clear'))hide(C.prototype, KEY, function(a, b){
        var result = this._c[KEY](a === 0 ? 0 : a, b);
        return chain ? this : result;
      });
    });
    if('size' in proto)$.setDesc(C.prototype, 'size', {
      get: function(){
        return this._c.size;
      }
    });
  }

  require('./$.tag')(C, NAME);

  O[NAME] = C;
  $def($def.G + $def.W + $def.F, O);

  if(!IS_WEAK)common.setStrong(C, NAME, IS_MAP);

  return C;
};
},{"./$":47,"./$.def":32,"./$.fails":34,"./$.for-of":35,"./$.global":36,"./$.hide":38,"./$.mix":49,"./$.strict-new":55,"./$.support-desc":57,"./$.tag":58}],30:[function(require,module,exports){
var core = module.exports = {version: '1.2.1'};
if(typeof __e == 'number')__e = core; // eslint-disable-line no-undef
},{}],31:[function(require,module,exports){
// optional / simple context binding
var aFunction = require('./$.a-function');
module.exports = function(fn, that, length){
  aFunction(fn);
  if(that === undefined)return fn;
  switch(length){
    case 1: return function(a){
      return fn.call(that, a);
    };
    case 2: return function(a, b){
      return fn.call(that, a, b);
    };
    case 3: return function(a, b, c){
      return fn.call(that, a, b, c);
    };
  }
  return function(/* ...args */){
    return fn.apply(that, arguments);
  };
};
},{"./$.a-function":23}],32:[function(require,module,exports){
var global    = require('./$.global')
  , core      = require('./$.core')
  , PROTOTYPE = 'prototype';
var ctx = function(fn, that){
  return function(){
    return fn.apply(that, arguments);
  };
};
var $def = function(type, name, source){
  var key, own, out, exp
    , isGlobal = type & $def.G
    , isProto  = type & $def.P
    , target   = isGlobal ? global : type & $def.S
        ? global[name] : (global[name] || {})[PROTOTYPE]
    , exports  = isGlobal ? core : core[name] || (core[name] = {});
  if(isGlobal)source = name;
  for(key in source){
    // contains in native
    own = !(type & $def.F) && target && key in target;
    if(own && key in exports)continue;
    // export native or passed
    out = own ? target[key] : source[key];
    // prevent global pollution for namespaces
    if(isGlobal && typeof target[key] != 'function')exp = source[key];
    // bind timers to global for call from export context
    else if(type & $def.B && own)exp = ctx(out, global);
    // wrap global constructors for prevent change them in library
    else if(type & $def.W && target[key] == out)!function(C){
      exp = function(param){
        return this instanceof C ? new C(param) : C(param);
      };
      exp[PROTOTYPE] = C[PROTOTYPE];
    }(out);
    else exp = isProto && typeof out == 'function' ? ctx(Function.call, out) : out;
    // export
    exports[key] = exp;
    if(isProto)(exports[PROTOTYPE] || (exports[PROTOTYPE] = {}))[key] = out;
  }
};
// type bitmap
$def.F = 1;  // forced
$def.G = 2;  // global
$def.S = 4;  // static
$def.P = 8;  // proto
$def.B = 16; // bind
$def.W = 32; // wrap
module.exports = $def;
},{"./$.core":30,"./$.global":36}],33:[function(require,module,exports){
// 7.2.1 RequireObjectCoercible(argument)
module.exports = function(it){
  if(it == undefined)throw TypeError("Can't call method on  " + it);
  return it;
};
},{}],34:[function(require,module,exports){
module.exports = function(exec){
  try {
    return !!exec();
  } catch(e){
    return true;
  }
};
},{}],35:[function(require,module,exports){
var ctx         = require('./$.ctx')
  , call        = require('./$.iter-call')
  , isArrayIter = require('./$.is-array-iter')
  , anObject    = require('./$.an-object')
  , toLength    = require('./$.to-length')
  , getIterFn   = require('./core.get-iterator-method');
module.exports = function(iterable, entries, fn, that){
  var iterFn = getIterFn(iterable)
    , f      = ctx(fn, that, entries ? 2 : 1)
    , index  = 0
    , length, step, iterator;
  if(typeof iterFn != 'function')throw TypeError(iterable + ' is not iterable!');
  // fast case for arrays with default iterator
  if(isArrayIter(iterFn))for(length = toLength(iterable.length); length > index; index++){
    entries ? f(anObject(step = iterable[index])[0], step[1]) : f(iterable[index]);
  } else for(iterator = iterFn.call(iterable); !(step = iterator.next()).done; ){
    call(iterator, f, step.value, entries);
  }
};
},{"./$.an-object":24,"./$.ctx":31,"./$.is-array-iter":40,"./$.iter-call":42,"./$.to-length":61,"./core.get-iterator-method":65}],36:[function(require,module,exports){
// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var UNDEFINED = 'undefined';
var global = module.exports = typeof window != UNDEFINED && window.Math == Math
  ? window : typeof self != UNDEFINED && self.Math == Math ? self : Function('return this')();
if(typeof __g == 'number')__g = global; // eslint-disable-line no-undef
},{}],37:[function(require,module,exports){
var hasOwnProperty = {}.hasOwnProperty;
module.exports = function(it, key){
  return hasOwnProperty.call(it, key);
};
},{}],38:[function(require,module,exports){
var $          = require('./$')
  , createDesc = require('./$.property-desc');
module.exports = require('./$.support-desc') ? function(object, key, value){
  return $.setDesc(object, key, createDesc(1, value));
} : function(object, key, value){
  object[key] = value;
  return object;
};
},{"./$":47,"./$.property-desc":50,"./$.support-desc":57}],39:[function(require,module,exports){
// indexed object, fallback for non-array-like ES3 strings
var cof = require('./$.cof');
module.exports = 0 in Object('z') ? Object : function(it){
  return cof(it) == 'String' ? it.split('') : Object(it);
};
},{"./$.cof":26}],40:[function(require,module,exports){
// check on default Array iterator
var Iterators = require('./$.iterators')
  , ITERATOR  = require('./$.wks')('iterator');
module.exports = function(it){
  return (Iterators.Array || Array.prototype[ITERATOR]) === it;
};
},{"./$.iterators":46,"./$.wks":64}],41:[function(require,module,exports){
module.exports = function(it){
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};
},{}],42:[function(require,module,exports){
// call something on iterator step with safe closing on error
var anObject = require('./$.an-object');
module.exports = function(iterator, fn, value, entries){
  try {
    return entries ? fn(anObject(value)[0], value[1]) : fn(value);
  // 7.4.6 IteratorClose(iterator, completion)
  } catch(e){
    var ret = iterator['return'];
    if(ret !== undefined)anObject(ret.call(iterator));
    throw e;
  }
};
},{"./$.an-object":24}],43:[function(require,module,exports){
'use strict';
var $ = require('./$')
  , IteratorPrototype = {};

// 25.1.2.1.1 %IteratorPrototype%[@@iterator]()
require('./$.hide')(IteratorPrototype, require('./$.wks')('iterator'), function(){ return this; });

module.exports = function(Constructor, NAME, next){
  Constructor.prototype = $.create(IteratorPrototype, {next: require('./$.property-desc')(1,next)});
  require('./$.tag')(Constructor, NAME + ' Iterator');
};
},{"./$":47,"./$.hide":38,"./$.property-desc":50,"./$.tag":58,"./$.wks":64}],44:[function(require,module,exports){
'use strict';
var LIBRARY         = require('./$.library')
  , $def            = require('./$.def')
  , $redef          = require('./$.redef')
  , hide            = require('./$.hide')
  , has             = require('./$.has')
  , SYMBOL_ITERATOR = require('./$.wks')('iterator')
  , Iterators       = require('./$.iterators')
  , BUGGY           = !([].keys && 'next' in [].keys()) // Safari has buggy iterators w/o `next`
  , FF_ITERATOR     = '@@iterator'
  , KEYS            = 'keys'
  , VALUES          = 'values';
var returnThis = function(){ return this; };
module.exports = function(Base, NAME, Constructor, next, DEFAULT, IS_SET, FORCE){
  require('./$.iter-create')(Constructor, NAME, next);
  var createMethod = function(kind){
    switch(kind){
      case KEYS: return function keys(){ return new Constructor(this, kind); };
      case VALUES: return function values(){ return new Constructor(this, kind); };
    } return function entries(){ return new Constructor(this, kind); };
  };
  var TAG      = NAME + ' Iterator'
    , proto    = Base.prototype
    , _native  = proto[SYMBOL_ITERATOR] || proto[FF_ITERATOR] || DEFAULT && proto[DEFAULT]
    , _default = _native || createMethod(DEFAULT)
    , methods, key;
  // Fix native
  if(_native){
    var IteratorPrototype = require('./$').getProto(_default.call(new Base));
    // Set @@toStringTag to native iterators
    require('./$.tag')(IteratorPrototype, TAG, true);
    // FF fix
    if(!LIBRARY && has(proto, FF_ITERATOR))hide(IteratorPrototype, SYMBOL_ITERATOR, returnThis);
  }
  // Define iterator
  if(!LIBRARY || FORCE)hide(proto, SYMBOL_ITERATOR, _default);
  // Plug for library
  Iterators[NAME] = _default;
  Iterators[TAG]  = returnThis;
  if(DEFAULT){
    methods = {
      keys:    IS_SET            ? _default : createMethod(KEYS),
      values:  DEFAULT == VALUES ? _default : createMethod(VALUES),
      entries: DEFAULT != VALUES ? _default : createMethod('entries')
    };
    if(FORCE)for(key in methods){
      if(!(key in proto))$redef(proto, key, methods[key]);
    } else $def($def.P + $def.F * BUGGY, NAME, methods);
  }
};
},{"./$":47,"./$.def":32,"./$.has":37,"./$.hide":38,"./$.iter-create":43,"./$.iterators":46,"./$.library":48,"./$.redef":51,"./$.tag":58,"./$.wks":64}],45:[function(require,module,exports){
module.exports = function(done, value){
  return {value: value, done: !!done};
};
},{}],46:[function(require,module,exports){
module.exports = {};
},{}],47:[function(require,module,exports){
var $Object = Object;
module.exports = {
  create:     $Object.create,
  getProto:   $Object.getPrototypeOf,
  isEnum:     {}.propertyIsEnumerable,
  getDesc:    $Object.getOwnPropertyDescriptor,
  setDesc:    $Object.defineProperty,
  setDescs:   $Object.defineProperties,
  getKeys:    $Object.keys,
  getNames:   $Object.getOwnPropertyNames,
  getSymbols: $Object.getOwnPropertySymbols,
  each:       [].forEach
};
},{}],48:[function(require,module,exports){
module.exports = true;
},{}],49:[function(require,module,exports){
var $redef = require('./$.redef');
module.exports = function(target, src){
  for(var key in src)$redef(target, key, src[key]);
  return target;
};
},{"./$.redef":51}],50:[function(require,module,exports){
module.exports = function(bitmap, value){
  return {
    enumerable  : !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable    : !(bitmap & 4),
    value       : value
  };
};
},{}],51:[function(require,module,exports){
module.exports = require('./$.hide');
},{"./$.hide":38}],52:[function(require,module,exports){
// Works with __proto__ only. Old v8 can't work with null proto objects.
/* eslint-disable no-proto */
var getDesc  = require('./$').getDesc
  , isObject = require('./$.is-object')
  , anObject = require('./$.an-object');
var check = function(O, proto){
  anObject(O);
  if(!isObject(proto) && proto !== null)throw TypeError(proto + ": can't set as prototype!");
};
module.exports = {
  set: Object.setPrototypeOf || ('__proto__' in {} ? // eslint-disable-line no-proto
    function(test, buggy, set){
      try {
        set = require('./$.ctx')(Function.call, getDesc(Object.prototype, '__proto__').set, 2);
        set(test, []);
        buggy = !(test instanceof Array);
      } catch(e){ buggy = true; }
      return function setPrototypeOf(O, proto){
        check(O, proto);
        if(buggy)O.__proto__ = proto;
        else set(O, proto);
        return O;
      };
    }({}, false) : undefined),
  check: check
};
},{"./$":47,"./$.an-object":24,"./$.ctx":31,"./$.is-object":41}],53:[function(require,module,exports){
var global = require('./$.global')
  , SHARED = '__core-js_shared__'
  , store  = global[SHARED] || (global[SHARED] = {});
module.exports = function(key){
  return store[key] || (store[key] = {});
};
},{"./$.global":36}],54:[function(require,module,exports){
'use strict';
var $       = require('./$')
  , SPECIES = require('./$.wks')('species');
module.exports = function(C){
  if(require('./$.support-desc') && !(SPECIES in C))$.setDesc(C, SPECIES, {
    configurable: true,
    get: function(){ return this; }
  });
};
},{"./$":47,"./$.support-desc":57,"./$.wks":64}],55:[function(require,module,exports){
module.exports = function(it, Constructor, name){
  if(!(it instanceof Constructor))throw TypeError(name + ": use the 'new' operator!");
  return it;
};
},{}],56:[function(require,module,exports){
// true  -> String#at
// false -> String#codePointAt
var toInteger = require('./$.to-integer')
  , defined   = require('./$.defined');
module.exports = function(TO_STRING){
  return function(that, pos){
    var s = String(defined(that))
      , i = toInteger(pos)
      , l = s.length
      , a, b;
    if(i < 0 || i >= l)return TO_STRING ? '' : undefined;
    a = s.charCodeAt(i);
    return a < 0xd800 || a > 0xdbff || i + 1 === l
      || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff
        ? TO_STRING ? s.charAt(i) : a
        : TO_STRING ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
  };
};
},{"./$.defined":33,"./$.to-integer":59}],57:[function(require,module,exports){
// Thank's IE8 for his funny defineProperty
module.exports = !require('./$.fails')(function(){
  return Object.defineProperty({}, 'a', {get: function(){ return 7; }}).a != 7;
});
},{"./$.fails":34}],58:[function(require,module,exports){
var has  = require('./$.has')
  , hide = require('./$.hide')
  , TAG  = require('./$.wks')('toStringTag');

module.exports = function(it, tag, stat){
  if(it && !has(it = stat ? it : it.prototype, TAG))hide(it, TAG, tag);
};
},{"./$.has":37,"./$.hide":38,"./$.wks":64}],59:[function(require,module,exports){
// 7.1.4 ToInteger
var ceil  = Math.ceil
  , floor = Math.floor;
module.exports = function(it){
  return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
};
},{}],60:[function(require,module,exports){
// to indexed object, toObject with fallback for non-array-like ES3 strings
var IObject = require('./$.iobject')
  , defined = require('./$.defined');
module.exports = function(it){
  return IObject(defined(it));
};
},{"./$.defined":33,"./$.iobject":39}],61:[function(require,module,exports){
// 7.1.15 ToLength
var toInteger = require('./$.to-integer')
  , min       = Math.min;
module.exports = function(it){
  return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0; // pow(2, 53) - 1 == 9007199254740991
};
},{"./$.to-integer":59}],62:[function(require,module,exports){
var id = 0
  , px = Math.random();
module.exports = function(key){
  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
};
},{}],63:[function(require,module,exports){
module.exports = function(){ /* empty */ };
},{}],64:[function(require,module,exports){
var store  = require('./$.shared')('wks')
  , Symbol = require('./$.global').Symbol;
module.exports = function(name){
  return store[name] || (store[name] =
    Symbol && Symbol[name] || (Symbol || require('./$.uid'))('Symbol.' + name));
};
},{"./$.global":36,"./$.shared":53,"./$.uid":62}],65:[function(require,module,exports){
var classof   = require('./$.classof')
  , ITERATOR  = require('./$.wks')('iterator')
  , Iterators = require('./$.iterators');
module.exports = require('./$.core').getIteratorMethod = function(it){
  if(it != undefined)return it[ITERATOR] || it['@@iterator'] || Iterators[classof(it)];
};
},{"./$.classof":25,"./$.core":30,"./$.iterators":46,"./$.wks":64}],66:[function(require,module,exports){
var anObject = require('./$.an-object')
  , get      = require('./core.get-iterator-method');
module.exports = require('./$.core').getIterator = function(it){
  var iterFn = get(it);
  if(typeof iterFn != 'function')throw TypeError(it + ' is not iterable!');
  return anObject(iterFn.call(it));
};
},{"./$.an-object":24,"./$.core":30,"./core.get-iterator-method":65}],67:[function(require,module,exports){
'use strict';
var setUnscope = require('./$.unscope')
  , step       = require('./$.iter-step')
  , Iterators  = require('./$.iterators')
  , toIObject  = require('./$.to-iobject');

// 22.1.3.4 Array.prototype.entries()
// 22.1.3.13 Array.prototype.keys()
// 22.1.3.29 Array.prototype.values()
// 22.1.3.30 Array.prototype[@@iterator]()
require('./$.iter-define')(Array, 'Array', function(iterated, kind){
  this._t = toIObject(iterated); // target
  this._i = 0;                   // next index
  this._k = kind;                // kind
// 22.1.5.2.1 %ArrayIteratorPrototype%.next()
}, function(){
  var O     = this._t
    , kind  = this._k
    , index = this._i++;
  if(!O || index >= O.length){
    this._t = undefined;
    return step(1);
  }
  if(kind == 'keys'  )return step(0, index);
  if(kind == 'values')return step(0, O[index]);
  return step(0, [index, O[index]]);
}, 'values');

// argumentsList[@@iterator] is %ArrayProto_values% (9.4.4.6, 9.4.4.7)
Iterators.Arguments = Iterators.Array;

setUnscope('keys');
setUnscope('values');
setUnscope('entries');
},{"./$.iter-define":44,"./$.iter-step":45,"./$.iterators":46,"./$.to-iobject":60,"./$.unscope":63}],68:[function(require,module,exports){
'use strict';
var strong = require('./$.collection-strong');

// 23.1 Map Objects
require('./$.collection')('Map', function(get){
  return function Map(){ return get(this, arguments[0]); };
}, {
  // 23.1.3.6 Map.prototype.get(key)
  get: function get(key){
    var entry = strong.getEntry(this, key);
    return entry && entry.v;
  },
  // 23.1.3.9 Map.prototype.set(key, value)
  set: function set(key, value){
    return strong.def(this, key === 0 ? 0 : key, value);
  }
}, strong, true);
},{"./$.collection":29,"./$.collection-strong":27}],69:[function(require,module,exports){
// 19.1.3.19 Object.setPrototypeOf(O, proto)
var $def = require('./$.def');
$def($def.S, 'Object', {setPrototypeOf: require('./$.set-proto').set});
},{"./$.def":32,"./$.set-proto":52}],70:[function(require,module,exports){

},{}],71:[function(require,module,exports){
'use strict';
var $at  = require('./$.string-at')(true);

// 21.1.3.27 String.prototype[@@iterator]()
require('./$.iter-define')(String, 'String', function(iterated){
  this._t = String(iterated); // target
  this._i = 0;                // next index
// 21.1.5.2.1 %StringIteratorPrototype%.next()
}, function(){
  var O     = this._t
    , index = this._i
    , point;
  if(index >= O.length)return {value: undefined, done: true};
  point = $at(O, index);
  this._i += point.length;
  return {value: point, done: false};
});
},{"./$.iter-define":44,"./$.string-at":56}],72:[function(require,module,exports){
// https://github.com/DavidBruant/Map-Set.prototype.toJSON
var $def  = require('./$.def');

$def($def.P, 'Map', {toJSON: require('./$.collection-to-json')('Map')});
},{"./$.collection-to-json":28,"./$.def":32}],73:[function(require,module,exports){
require('./es6.array.iterator');
var Iterators = require('./$.iterators');
Iterators.NodeList = Iterators.HTMLCollection = Iterators.Array;
},{"./$.iterators":46,"./es6.array.iterator":67}],74:[function(require,module,exports){
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
//# sourceMappingURL=bundle.js.map
