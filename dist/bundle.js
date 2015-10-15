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

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _eventemitter2 = require('eventemitter2');

var _roslib = (typeof window !== "undefined" ? window['ROSLIB'] : typeof global !== "undefined" ? global['ROSLIB'] : null);

var Ed = (function (_EventEmitter2) {
  _inherits(Ed, _EventEmitter2);

  function Ed(robot) {
    _classCallCheck(this, Ed);

    _EventEmitter2.call(this);
    this.entities = new Map();
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

    this.queryService.callService(request, function (response) {
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
      _this.updateEntities(data.entities);
      console.timeEnd('ed.updateEntities');

      callback(_this.entities);
    }, function (error) {
      console.log('ed:query callService ' + _this.name + ' failed:', error);
    });
  };

  Ed.prototype.updateEntities = function updateEntities(entities) {
    for (var _iterator = entities, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
      var _ref;

      if (_isArray) {
        if (_i >= _iterator.length) break;
        _ref = _iterator[_i++];
      } else {
        _i = _iterator.next();
        if (_i.done) break;
        _ref = _i.value;
      }

      var entity = _ref;

      var id = entity.id;

      if (this.entities.has(id)) {
        // update object

        console.log('update entity:', entity);
        var object = this.entities.get(id);

        if (entity.hasOwnProperty('pose')) {
          var _parseEdPosition = parseEdPosition(entity.pose);

          var position = _parseEdPosition.position;
          var quaternion = _parseEdPosition.quaternion;

          object.position = position;
          object.quaternion = quaternion;
        }

        if (entity.hasOwnProperty('mesh')) {
          var _parseEdMesh = parseEdMesh(entity.mesh);

          var vertices = _parseEdMesh.vertices;
          var faces = _parseEdMesh.faces;

          object.vertices = vertices;
          object.faces = faces;
        }
      } else {
        // add object

        var object = {};

        if (entity.hasOwnProperty('pose')) {
          var _parseEdPosition2 = parseEdPosition(entity.pose);

          var position = _parseEdPosition2.position;
          var quaternion = _parseEdPosition2.quaternion;

          object.position = position;
          object.quaternion = quaternion;
        }

        if (entity.hasOwnProperty('mesh')) {
          var _parseEdMesh2 = parseEdMesh(entity.mesh);

          var vertices = _parseEdMesh2.vertices;
          var faces = _parseEdMesh2.faces;

          object.vertices = vertices;
          object.faces = faces;
        }

        this.entities.set(id, object);
      }
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
  for (var _iterator2 = mesh.vertices, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
    var _ref2;

    if (_isArray2) {
      if (_i2 >= _iterator2.length) break;
      _ref2 = _iterator2[_i2++];
    } else {
      _i2 = _iterator2.next();
      if (_i2.done) break;
      _ref2 = _i2.value;
    }

    var vertex = _ref2;

    vertices.push(vertex.x);
    vertices.push(vertex.y);
    vertices.push(vertex.z);
  }

  var faces = [];
  for (var _iterator3 = mesh.triangles, _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
    var _ref3;

    if (_isArray3) {
      if (_i3 >= _iterator3.length) break;
      _ref3 = _iterator3[_i3++];
    } else {
      _i3 = _iterator3.next();
      if (_i3.done) break;
      _ref3 = _i3.value;
    }

    var triangle = _ref3;

    faces.push(triangle.i1);
    faces.push(triangle.i2);
    faces.push(triangle.i3);
  }

  return { vertices: vertices, faces: faces };
}

exports['default'] = Ed;
module.exports = exports['default'];

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

exports.__esModule = true;

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

exports['default'] = Hardware;
module.exports = exports['default'];

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
//# sourceMappingURL=bundle.js.map
