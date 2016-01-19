(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.API = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _eventemitter = require('eventemitter2');

var _roslib = (typeof window !== "undefined" ? window['ROSLIB'] : typeof global !== "undefined" ? global['ROSLIB'] : null);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var ActionServer = function (_EventEmitter) {
  (0, _inherits3.default)(ActionServer, _EventEmitter);

  function ActionServer(robot) {
    (0, _classCallCheck3.default)(this, ActionServer);

    var _this = (0, _possibleConstructorReturn3.default)(this, (0, _getPrototypeOf2.default)(ActionServer).call(this));

    var ros = robot.ros;

    _this.queryService = ros.Service({
      name: 'action_server/add_action',
      serviceType: 'action_server/AddAction'
    });
    return _this;
  }

  (0, _createClass3.default)(ActionServer, [{
    key: 'doAction',
    value: function doAction(actionName, entityId) {
      var _this2 = this;

      var parameters = {
        entity: {
          id: entityId
        }
      };

      var request = new _roslib.ServiceRequest({
        action: actionName,
        parameters: (0, _stringify2.default)(parameters)
      });

      this.queryService.callService(request, function (response) {
        /* eslint camelcase:0 */
        var action_uuid = response.action_uuid;
        var error_msg = response.error_msg;

        if (error_msg) {
          console.error('ActionServer:doAction', error_msg);
        } else {
          console.log('ActionServer:doAction', action_uuid);
        }
      }, function (error) {
        console.error('ActionServer:doAction callService ' + _this2.queryService.name + ' failed:', error);
      });
    }
  }]);
  return ActionServer;
}(_eventemitter.EventEmitter2);

exports.default = ActionServer;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"babel-runtime/core-js/json/stringify":12,"babel-runtime/core-js/object/get-prototype-of":17,"babel-runtime/helpers/classCallCheck":21,"babel-runtime/helpers/createClass":22,"babel-runtime/helpers/inherits":23,"babel-runtime/helpers/possibleConstructorReturn":24,"eventemitter2":9}],2:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _eventemitter = require('eventemitter2');

var _roslib = (typeof window !== "undefined" ? window['ROSLIB'] : typeof global !== "undefined" ? global['ROSLIB'] : null);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Base = function (_EventEmitter) {
  (0, _inherits3.default)(Base, _EventEmitter);

  function Base(robot) {
    (0, _classCallCheck3.default)(this, Base);

    var _this = (0, _possibleConstructorReturn3.default)(this, (0, _getPrototypeOf2.default)(Base).call(this));

    var ros = robot.ros;

    _this.cmdVelTopic = ros.Topic({
      name: 'base/references',
      messageType: 'geometry_msgs/Twist'
    });

    _this.localPlannerTopic = ros.Topic({
      name: 'local_planner/action_server/goal',
      messageType: 'cb_planner_msgs_srvs/LocalPlannerActionGoal'
    });
    return _this;
  }

  (0, _createClass3.default)(Base, [{
    key: 'sendTwist',
    value: function sendTwist(vx, vy, vth) {
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
    }
  }, {
    key: 'sendLocalPlannerGoal',
    value: function sendLocalPlannerGoal(plan, look_at_x, look_at_y) {
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
    }
  }]);
  return Base;
}(_eventemitter.EventEmitter2);

exports.default = Base;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"babel-runtime/core-js/object/get-prototype-of":17,"babel-runtime/helpers/classCallCheck":21,"babel-runtime/helpers/createClass":22,"babel-runtime/helpers/inherits":23,"babel-runtime/helpers/possibleConstructorReturn":24,"eventemitter2":9}],3:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _eventemitter = require('eventemitter2');

var _roslib = (typeof window !== "undefined" ? window['ROSLIB'] : typeof global !== "undefined" ? global['ROSLIB'] : null);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Ed = function (_EventEmitter) {
  (0, _inherits3.default)(Ed, _EventEmitter);

  function Ed(robot) {
    (0, _classCallCheck3.default)(this, Ed);

    var _this = (0, _possibleConstructorReturn3.default)(this, (0, _getPrototypeOf2.default)(Ed).call(this));

    _this.entities = new _map2.default();
    _this.revision = 0;

    var ros = robot.ros;

    _this.queryService = ros.Service({
      name: 'ed/query',
      serviceType: 'ed/Query'
    });
    return _this;
  }

  (0, _createClass3.default)(Ed, [{
    key: 'query',
    value: function query(callback) {
      var _this2 = this;

      var request = new _roslib.ServiceRequest({
        /* eslint camelcase:0 */
        // string[] ids
        // string[] properties
        since_revision: this.revision
      });

      this.queryService.callService(request, function (response) {
        var new_revision = response.new_revision;

        if (new_revision <= _this2.revision) {
          console.error('ed:query incorrect revision');
          return;
        }
        _this2.revision = new_revision;

        var data = JSON.parse(response.human_readable);

        _this2._updateEntities(data.entities);

        callback && callback();
      }, function (error) {
        console.error('ed:query callService ' + _this2.queryService.name + ' failed:', error);
      });
    }
  }, {
    key: 'watch',
    value: function watch(callbacks) {
      if (callbacks.add) {
        this.on('entities.add', callbacks.add);
      }
      if (callbacks.update) {
        this.on('entities.update', callbacks.update);
      }
      if (callbacks.remove) {
        this.on('entities.remove', callbacks.remove);
      }
    }
  }, {
    key: '_updateEntities',
    value: function _updateEntities(entities) {
      var _this3 = this;

      var add = [];
      var update = [];
      var remove = [];

      var _loop = function _loop() {
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

        if (_this3.entities.has(id)) {
          // update object
          var oldObj = _this3.entities.get(id);

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
          } else if (entity.hasOwnProperty('convex_hull')) {
            var _parseEdConvexHull = parseEdConvexHull(entity.convex_hull);

            var vertices = _parseEdConvexHull.vertices;
            var faces = _parseEdConvexHull.faces;

            newObj.vertices = vertices;
            newObj.faces = faces;
          } else {
            // use the old mesh
            oldObj.vertices && (newObj.vertices = oldObj.vertices);
            oldObj.faces && (newObj.faces = oldObj.faces);
          }

          _this3.entities.set(id, newObj);

          // only queue full objects for update
          var props = ['position', 'quaternion', 'vertices', 'faces'];
          if (props.every(function (key) {
            return key in newObj;
          })) {
            update.push([newObj, oldObj]);
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
          } else if (entity.hasOwnProperty('convex_hull')) {
            var _parseEdConvexHull2 = parseEdConvexHull(entity.convex_hull);

            var vertices = _parseEdConvexHull2.vertices;
            var faces = _parseEdConvexHull2.faces;

            newObj.vertices = vertices;
            newObj.faces = faces;
          }

          _this3.entities.set(id, newObj);

          // only queue full objects for update
          var props = ['position', 'quaternion', 'vertices', 'faces'];
          if (props.every(function (key) {
            return key in newObj;
          })) {
            add.push(newObj);
          }
        }
      };

      for (var _iterator = entities, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : (0, _getIterator3.default)(_iterator);;) {
        var _ref;

        var _ret = _loop();

        if (_ret === 'break') break;
      }

      // TODO: parse 'remove_entities'

      // invoke callbacks
      for (var _iterator2 = add, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : (0, _getIterator3.default)(_iterator2);;) {
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

        this.emit('entities.add', data);
      }
      for (var _iterator3 = update, _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : (0, _getIterator3.default)(_iterator3);;) {
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

        this.emit.apply(this, ['entities.update'].concat((0, _toConsumableArray3.default)(data)));
      }
      for (var _iterator4 = remove, _isArray4 = Array.isArray(_iterator4), _i4 = 0, _iterator4 = _isArray4 ? _iterator4 : (0, _getIterator3.default)(_iterator4);;) {
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
    }
  }]);
  return Ed;
}(_eventemitter.EventEmitter2);

function parseEdPosition(pose) {
  return {
    position: [pose.x, pose.y, pose.z],
    quaternion: [pose.qx, pose.qy, pose.qz, pose.qw]
  };
}

function parseEdConvexHull(chull) {
  // Add vertices
  var vertices = [];
  for (var _iterator5 = chull.points, _isArray5 = Array.isArray(_iterator5), _i5 = 0, _iterator5 = _isArray5 ? _iterator5 : (0, _getIterator3.default)(_iterator5);;) {
    var _ref5;

    if (_isArray5) {
      if (_i5 >= _iterator5.length) break;
      _ref5 = _iterator5[_i5++];
    } else {
      _i5 = _iterator5.next();
      if (_i5.done) break;
      _ref5 = _i5.value;
    }

    var point = _ref5;

    vertices.push([point.x, point.y, chull.z_min]);
    vertices.push([point.x, point.y, chull.z_max]);
  }

  var faces = [];

  // Calculate top and bottom triangles
  for (var i = 1; i < chull.points.length - 1; i++) {
    var i2 = 2 * i;

    // bottom
    faces.push([i2 + 2, i2, 0]);

    // top
    faces.push([i2 + 1, i2 + 3, 1]);
  }

  // Calculate side triangles
  for (var i = 0; i < chull.points.length; i++) {
    var j = (i + 1) % chull.points.length;
    faces.push([j * 2, i * 2 + 1, i * 2]);
    faces.push([j * 2, j * 2 + 1, i * 2 + 1]);
  }

  return { vertices: vertices, faces: faces };
}

function parseEdMesh(mesh) {
  var vertices = [];
  for (var _iterator6 = mesh.vertices, _isArray6 = Array.isArray(_iterator6), _i6 = 0, _iterator6 = _isArray6 ? _iterator6 : (0, _getIterator3.default)(_iterator6);;) {
    var _ref6;

    if (_isArray6) {
      if (_i6 >= _iterator6.length) break;
      _ref6 = _iterator6[_i6++];
    } else {
      _i6 = _iterator6.next();
      if (_i6.done) break;
      _ref6 = _i6.value;
    }

    var vertex = _ref6;

    vertices.push([vertex.x, vertex.y, vertex.z]);
  }

  var faces = [];
  for (var _iterator7 = mesh.triangles, _isArray7 = Array.isArray(_iterator7), _i7 = 0, _iterator7 = _isArray7 ? _iterator7 : (0, _getIterator3.default)(_iterator7);;) {
    var _ref7;

    if (_isArray7) {
      if (_i7 >= _iterator7.length) break;
      _ref7 = _iterator7[_i7++];
    } else {
      _i7 = _iterator7.next();
      if (_i7.done) break;
      _ref7 = _i7.value;
    }

    var triangle = _ref7;

    faces.push([triangle.i1, triangle.i2, triangle.i3]);
  }

  return { vertices: vertices, faces: faces };
}

exports.default = Ed;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"babel-runtime/core-js/get-iterator":11,"babel-runtime/core-js/map":13,"babel-runtime/core-js/object/get-prototype-of":17,"babel-runtime/helpers/classCallCheck":21,"babel-runtime/helpers/createClass":22,"babel-runtime/helpers/inherits":23,"babel-runtime/helpers/possibleConstructorReturn":24,"babel-runtime/helpers/toConsumableArray":25,"eventemitter2":9}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _getIterator2 = require("babel-runtime/core-js/get-iterator");

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _keys = require("babel-runtime/core-js/object/keys");

var _keys2 = _interopRequireDefault(_keys);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint key-spacing: 0 */
/* eslint no-multi-spaces: 0 */

/*
|   Name  | Homeable | HomeableMandatory | Resetable |
|---------|----------|-------------------|-----------|
| Base    | no       | no                | yes       |
| Spindle | yes      | yes               | yes       |
| Arm     | yes      | no                | yes       |
| Head    | no       | no                | no        |
*/

// transform the array of bools to an object
var propertiesTable = {
  /* eslint camelcase:0 */
  // Name     | Homeable |  HomeableMandatory | Resetable
  all: [true, false, true],
  base: [false, false, true],
  spindle: [true, true, true],
  left_arm: [true, false, true],
  right_arm: [true, false, true],
  head: [false, false, false]
};

var properties = {};
for (var _iterator = (0, _keys2.default)(propertiesTable), _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : (0, _getIterator3.default)(_iterator);;) {
  var _ref;

  if (_isArray) {
    if (_i >= _iterator.length) break;
    _ref = _iterator[_i++];
  } else {
    _i = _iterator.next();
    if (_i.done) break;
    _ref = _i.value;
  }

  var name = _ref;

  var v = propertiesTable[name];
  properties[name] = {
    homeable: v[0],
    homeable_mandatory: v[1],
    resetable: v[2]
  };
}

exports.default = properties;

},{"babel-runtime/core-js/get-iterator":11,"babel-runtime/core-js/object/keys":18}],5:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _eventemitter = require('eventemitter2');

var _roslib = (typeof window !== "undefined" ? window['ROSLIB'] : typeof global !== "undefined" ? global['ROSLIB'] : null);

var _debounce = require('lodash/debounce');

var _debounce2 = _interopRequireDefault(_debounce);

var _hardwareProperties = require('./hardware-properties');

var _hardwareProperties2 = _interopRequireDefault(_hardwareProperties);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Hardware constants

var levels = {
  STALE: 0,
  IDLE: 1,
  OPERATIONAL: 2,
  HOMING: 3,
  ERROR: 4
};

// define how the actions map to hardware commands

// Robot specific Hardware constants that should come from the parameter server
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

var defaultStatus = {};
for (var _iterator = (0, _keys2.default)(hardwareIds), _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : (0, _getIterator3.default)(_iterator);;) {
  var _ref;

  if (_isArray) {
    if (_i >= _iterator.length) break;
    _ref = _iterator[_i++];
  } else {
    _i = _iterator.next();
    if (_i.done) break;
    _ref = _i.value;
  }

  var name = _ref;

  defaultStatus[name] = {
    level: levels.STALE,
    homed: false
  };
}

// hardware timeouts in ms
var HARDWARE_TIMEOUT = 2000;
var BATTERY_TIMEOUT = 2000;
var EBUTTONS_TIMEOUT = 2000;

/**
 * Hardware module
 * @param {Robot} robot A valid robot object
 */

var Hardware = function (_EventEmitter) {
  (0, _inherits3.default)(Hardware, _EventEmitter);

  function Hardware(robot) {
    (0, _classCallCheck3.default)(this, Hardware);

    var _this = (0, _possibleConstructorReturn3.default)(this, (0, _getPrototypeOf2.default)(Hardware).call(this));

    _this._status = defaultStatus;
    _this._resetHardwareLater = (0, _debounce2.default)(_this._resetHardware, HARDWARE_TIMEOUT);
    _this._battery = null;
    _this._resetBatteryLater = (0, _debounce2.default)(_this._resetBattery, BATTERY_TIMEOUT);
    _this._ebuttons = null;
    _this._resetEbuttonsLater = (0, _debounce2.default)(_this._resetEbuttons, EBUTTONS_TIMEOUT);

    var ros = robot.ros;

    // hardware status init
    var statusTopic = ros.Topic({
      name: 'hardware_status',
      messageType: 'diagnostic_msgs/DiagnosticArray',
      throttle_rate: 500
    });
    statusTopic.subscribe(_this._onStatus.bind(_this));

    _this._commandTopic = ros.Topic({
      name: 'dashboard_ctrlcmds',
      messageType: 'std_msgs/UInt8MultiArray'
    });

    // battery status init
    var batteryTopic = ros.Topic({
      name: 'battery_percentage',
      messageType: 'std_msgs/Float32',
      throttle_rate: 200
    });
    batteryTopic.subscribe(_this._onBattery.bind(_this));

    // ebutton status init
    var ebuttonTopic = ros.Topic({
      name: 'ebutton_status',
      messageType: 'diagnostic_msgs/DiagnosticArray',
      throttle_rate: 200
    });
    ebuttonTopic.subscribe(_this._onEbuttons.bind(_this));
    return _this;
  }

  /**
   * Public status API
   */

  (0, _createClass3.default)(Hardware, [{
    key: '_onStatus',
    value: function _onStatus(msg) {
      this.status = diagnosticMsgToStatus(msg);
      this._resetHardwareLater();
    }
  }, {
    key: '_resetHardware',
    value: function _resetHardware() {
      console.log('hardware message timeout');
      this.status = defaultStatus;
    }

    /**
     * Send a command to the partware
     *
     * example:
     * > hardware.send_command('head', 'start')
     */

  }, {
    key: 'send_command',
    value: function send_command(part, command) {
      if (!hardwareIds.hasOwnProperty(part)) {
        throw new RangeError('Invalid part');
      }
      if (!commands.hasOwnProperty(command)) {
        throw new RangeError('Invalid command');
      }

      var i1 = hardwareIds[part];
      var i2 = commands[command];
      console.log('hardware command: %s %s (%i, %i)', command, part, i1, i2);

      var cmd = new _roslib.Message({
        data: [i1, i2]
      });

      this._commandTopic.publish(cmd);
    }

    /**
     * Public battery API
     */

  }, {
    key: '_onBattery',

    /**
     * @param {Object} msg - ROS std_msgs/Float32 message
     */
    value: function _onBattery(msg) {
      var percent = msg.data;
      this.battery = percent;
      this._resetBatteryLater();
    }
  }, {
    key: '_resetBattery',
    value: function _resetBattery() {
      console.log('battery message timeout');
      this.battery = null;
    }

    /**
     * Public ebutton status API
     */

  }, {
    key: '_onEbuttons',
    value: function _onEbuttons(msg) {
      // const status = msg.status.map(status => {
      //   return _.pick(status, ['name', 'level']);
      // });
      var status = msg.status.map(function (_ref2) {
        var name = _ref2.name;
        var level = _ref2.level;
        return { name: name, level: level };
      });

      this.ebuttons = status;
      this._resetEbuttonsLater();
    }
  }, {
    key: '_resetEbuttons',
    value: function _resetEbuttons() {
      console.log('ebuttons message timeout');
      this.ebuttons = null;
    }
  }, {
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
}(_eventemitter.EventEmitter2);

/**
 * Private functions
 */

// convert an incoming status message to actual workable properties

Hardware.levels = levels;
function diagnosticMsgToStatus(msg) {
  // convert array to object
  var hardware_status = {};
  for (var _iterator2 = msg.status, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : (0, _getIterator3.default)(_iterator2);;) {
    var _ref3;

    if (_isArray2) {
      if (_i2 >= _iterator2.length) break;
      _ref3 = _iterator2[_i2++];
    } else {
      _i2 = _iterator2.next();
      if (_i2.done) break;
      _ref3 = _i2.value;
    }

    var _ref5 = _ref3;
    var name = _ref5.name;
    var level = _ref5.level;
    var message = _ref5.message;

    var homed = message === 'homed';
    hardware_status[name] = { level: level, homed: homed };
  }

  // fill all missing hardware parts with 'idle'
  hardware_status = (0, _assign2.default)({}, defaultStatus, hardware_status);

  // add actions
  for (var _iterator3 = (0, _keys2.default)(hardware_status), _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : (0, _getIterator3.default)(_iterator3);;) {
    var _ref4;

    if (_isArray3) {
      if (_i3 >= _iterator3.length) break;
      _ref4 = _iterator3[_i3++];
    } else {
      _i3 = _iterator3.next();
      if (_i3.done) break;
      _ref4 = _i3.value;
    }

    var name = _ref4;

    var part = hardware_status[name];
    part.actions = getActions(name, part);
  }

  return hardware_status;
}

// return all possible actions for a hardware part
function getActions(name, part) {
  var props = _hardwareProperties2.default[name];
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

exports.default = Hardware;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./hardware-properties":4,"babel-runtime/core-js/get-iterator":11,"babel-runtime/core-js/object/assign":14,"babel-runtime/core-js/object/get-prototype-of":17,"babel-runtime/core-js/object/keys":18,"babel-runtime/helpers/classCallCheck":21,"babel-runtime/helpers/createClass":22,"babel-runtime/helpers/inherits":23,"babel-runtime/helpers/possibleConstructorReturn":24,"eventemitter2":9,"lodash/debounce":102}],6:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _eventemitter = require('eventemitter2');

var _roslib = (typeof window !== "undefined" ? window['ROSLIB'] : typeof global !== "undefined" ? global['ROSLIB'] : null);

var _base64Js = (typeof window !== "undefined" ? window['base64js'] : typeof global !== "undefined" ? global['base64js'] : null);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Head = function (_EventEmitter) {
  (0, _inherits3.default)(Head, _EventEmitter);

  function Head(robot) {
    (0, _classCallCheck3.default)(this, Head);

    var _this = (0, _possibleConstructorReturn3.default)(this, (0, _getPrototypeOf2.default)(Head).call(this));

    var ros = robot.ros;

    _this.getImageService = ros.Service({
      name: 'top_kinect/rgbd',
      serviceType: 'rgbd/GetRGBD'
    });

    _this.goal = null;
    _this.head_ac = ros.ActionClient({
      serverName: 'head_ref/action_server',
      actionName: 'head_ref/HeadReferenceAction'
    });
    return _this;
  }

  /**
   * Get a rgbd image from the kinect
   * @param  {Number}         width     Width of the requested image
   * @param  {Function(img)}  callback  Callback with the Image
   */

  (0, _createClass3.default)(Head, [{
    key: 'getImage',
    value: function getImage() {
      var _this2 = this;

      var width = arguments.length <= 0 || arguments[0] === undefined ? 128 : arguments[0];
      var callback = arguments[1];

      // uint8 JPEG=0
      // uint8 PNG=1
      var request = new _roslib.ServiceRequest({
        width: width,
        compression: 0
      });
      this.getImageService.callService(request, function (response) {
        /* eslint camelcase:0 */
        var rgb_data = response.rgb_data;
        var depth_data = response.depth_data;

        var rgb_base_64 = (0, _base64Js.fromByteArray)(rgb_data.buffer);
        var depth_base_64 = (0, _base64Js.fromByteArray)(depth_data.buffer);

        var rgb_image_url = 'data:image/jpeg;base64,' + rgb_base_64;
        var depth_image_url = 'data:image/jpeg;base64,' + depth_base_64;

        callback(rgb_image_url, depth_image_url);
      }, function (error) {
        console.error('Head:getImage callService ' + _this2.getImageService.name + ' failed:', error);
      });
    }
  }, {
    key: 'sendPanTiltGoal',
    value: function sendPanTiltGoal(pan, tilt) {
      this.goal = new _roslib.Goal({
        /* eslint camelcase:0 */
        actionClient: this.head_ac,
        goalMessage: {
          // either LOOKAT or PAN_TILT
          goal_type: 1,

          // [1-255] (action client calls with the same priority cancel each other)
          priority: 1,

          pan_vel: 0.3,
          tilt_vel: 0.3,

          // in case of LOOKAT:
          target_point: {},

          // in case of PAN_TILT
          pan: pan,
          tilt: tilt,

          // goal cancels automatically after this time (seconds), if 0, no auto cancel
          end_time: 0
        }
      });

      this.goal.send();
    }
  }, {
    key: 'cancelGoal',
    value: function cancelGoal() {
      if (this.goal) {
        this.goal.cancel();
      }
    }
  }, {
    key: 'cancelAllGoals',
    value: function cancelAllGoals() {
      this.head_ac.cancel();
    }
  }]);
  return Head;
}(_eventemitter.EventEmitter2);

exports.default = Head;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"babel-runtime/core-js/object/get-prototype-of":17,"babel-runtime/helpers/classCallCheck":21,"babel-runtime/helpers/createClass":22,"babel-runtime/helpers/inherits":23,"babel-runtime/helpers/possibleConstructorReturn":24,"eventemitter2":9}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Robot = exports.Head = exports.Hardware = exports.Ed = exports.Base = exports.ActionServer = undefined;

var _actionServer = require('./action-server');

var _actionServer2 = _interopRequireDefault(_actionServer);

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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.ActionServer = _actionServer2.default;
exports.Base = _base2.default;
exports.Ed = _ed2.default;
exports.Hardware = _hardware2.default;
exports.Head = _head2.default;
exports.Robot = _robot2.default;

},{"./action-server":1,"./base":2,"./ed":3,"./hardware":5,"./head":6,"./robot":8}],8:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _eventemitter = require('eventemitter2');

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

var _actionServer = require('./action-server');

var _actionServer2 = _interopRequireDefault(_actionServer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Private variables
var host = (0, _os.hostname)() || 'localhost';
var defaultUrl = 'ws://' + host + ':9090';

// reconnect timeout in ms
var RECONNECT_TIMEOUT = 5000;

// Robot constructor

var Robot = function (_EventEmitter) {
  (0, _inherits3.default)(Robot, _EventEmitter);

  function Robot() {
    (0, _classCallCheck3.default)(this, Robot);

    var _this = (0, _possibleConstructorReturn3.default)(this, (0, _getPrototypeOf2.default)(Robot).call(this));
    // parent constructor
    // EventEmitter2.apply(this);

    _this.ros = new _roslib.Ros({
      encoding: 'ascii'
    });

    _this.ros.on('connection', _this.onConnection.bind(_this));
    _this.ros.on('close', _this.onClose.bind(_this));
    _this.ros.on('error', _this.onError.bind(_this));

    // reconnect behavior
    _this.on('status', function (status) {
      switch (status) {
        case 'closed':
          setTimeout(this.connect.bind(this), RECONNECT_TIMEOUT);
          break;
        default:
          break;
      }
    });

    _this.ed = new _ed2.default(_this);
    _this.hardware = new _hardware2.default(_this);
    _this.head = new _head2.default(_this);
    _this.base = new _base2.default(_this);
    _this.actionServer = new _actionServer2.default(_this);
    return _this;
  }

  (0, _createClass3.default)(Robot, [{
    key: 'connect',

    /**
     * Connect to rosbridge
     *
     * If an url is provided, it will connect to that one. Else it will
     * use the previous url. Uses a url based on the hostname if no urls
     * are provided.
     */
    value: function connect(url) {
      this.url = url || this.url || defaultUrl;

      console.log('connecting to ' + this.url);
      this.ros.connect(this.url);
      this.status = 'connecting';
    }

    // ros status event handling

  }, {
    key: 'onConnection',
    value: function onConnection() {
      console.log('connection');
      this.status = 'connected';
    }
  }, {
    key: 'onClose',
    value: function onClose() {
      console.log('connection closed');
      this.status = 'closed';
    }
  }, {
    key: 'onError',
    value: function onError() {
      // console.log('connection error');
      this.status = 'error';
    }
  }, {
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
}(_eventemitter.EventEmitter2);

// module.exports = Robot;

exports.default = Robot;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./action-server":1,"./base":2,"./ed":3,"./hardware":5,"./head":6,"babel-runtime/core-js/object/get-prototype-of":17,"babel-runtime/helpers/classCallCheck":21,"babel-runtime/helpers/createClass":22,"babel-runtime/helpers/inherits":23,"babel-runtime/helpers/possibleConstructorReturn":24,"eventemitter2":9,"os":107}],9:[function(require,module,exports){
(function (global){
"use strict";

module.exports = {
  EventEmitter2: global.EventEmitter2
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],10:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/array/from"), __esModule: true };
},{"core-js/library/fn/array/from":27}],11:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/get-iterator"), __esModule: true };
},{"core-js/library/fn/get-iterator":28}],12:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/json/stringify"), __esModule: true };
},{"core-js/library/fn/json/stringify":29}],13:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/map"), __esModule: true };
},{"core-js/library/fn/map":30}],14:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/assign"), __esModule: true };
},{"core-js/library/fn/object/assign":31}],15:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/create"), __esModule: true };
},{"core-js/library/fn/object/create":32}],16:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/define-property"), __esModule: true };
},{"core-js/library/fn/object/define-property":33}],17:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/get-prototype-of"), __esModule: true };
},{"core-js/library/fn/object/get-prototype-of":34}],18:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/keys"), __esModule: true };
},{"core-js/library/fn/object/keys":35}],19:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/object/set-prototype-of"), __esModule: true };
},{"core-js/library/fn/object/set-prototype-of":36}],20:[function(require,module,exports){
module.exports = { "default": require("core-js/library/fn/symbol"), __esModule: true };
},{"core-js/library/fn/symbol":37}],21:[function(require,module,exports){
"use strict";

exports.__esModule = true;

exports.default = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};
},{}],22:[function(require,module,exports){
"use strict";

exports.__esModule = true;

var _defineProperty = require("../core-js/object/define-property");

var _defineProperty2 = _interopRequireDefault(_defineProperty);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = (function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      (0, _defineProperty2.default)(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
})();
},{"../core-js/object/define-property":16}],23:[function(require,module,exports){
"use strict";

exports.__esModule = true;

var _setPrototypeOf = require("../core-js/object/set-prototype-of");

var _setPrototypeOf2 = _interopRequireDefault(_setPrototypeOf);

var _create = require("../core-js/object/create");

var _create2 = _interopRequireDefault(_create);

var _typeof2 = require("../helpers/typeof");

var _typeof3 = _interopRequireDefault(_typeof2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : (0, _typeof3.default)(superClass)));
  }

  subClass.prototype = (0, _create2.default)(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) _setPrototypeOf2.default ? (0, _setPrototypeOf2.default)(subClass, superClass) : subClass.__proto__ = superClass;
};
},{"../core-js/object/create":15,"../core-js/object/set-prototype-of":19,"../helpers/typeof":26}],24:[function(require,module,exports){
"use strict";

exports.__esModule = true;

var _typeof2 = require("../helpers/typeof");

var _typeof3 = _interopRequireDefault(_typeof2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && ((typeof call === "undefined" ? "undefined" : (0, _typeof3.default)(call)) === "object" || typeof call === "function") ? call : self;
};
},{"../helpers/typeof":26}],25:[function(require,module,exports){
"use strict";

exports.__esModule = true;

var _from = require("../core-js/array/from");

var _from2 = _interopRequireDefault(_from);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
      arr2[i] = arr[i];
    }

    return arr2;
  } else {
    return (0, _from2.default)(arr);
  }
};
},{"../core-js/array/from":10}],26:[function(require,module,exports){
"use strict";

exports.__esModule = true;

var _symbol = require("../core-js/symbol");

var _symbol2 = _interopRequireDefault(_symbol);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _typeof(obj) { return obj && typeof _Symbol !== "undefined" && obj.constructor === _Symbol ? "symbol" : typeof obj; }

exports.default = function (obj) {
  return obj && typeof _symbol2.default !== "undefined" && obj.constructor === _symbol2.default ? "symbol" : typeof obj === "undefined" ? "undefined" : _typeof(obj);
};
},{"../core-js/symbol":20}],27:[function(require,module,exports){
require('../../modules/es6.string.iterator');
require('../../modules/es6.array.from');
module.exports = require('../../modules/$.core').Array.from;
},{"../../modules/$.core":46,"../../modules/es6.array.from":90,"../../modules/es6.string.iterator":98}],28:[function(require,module,exports){
require('../modules/web.dom.iterable');
require('../modules/es6.string.iterator');
module.exports = require('../modules/core.get-iterator');
},{"../modules/core.get-iterator":89,"../modules/es6.string.iterator":98,"../modules/web.dom.iterable":101}],29:[function(require,module,exports){
var core = require('../../modules/$.core');
module.exports = function stringify(it){ // eslint-disable-line no-unused-vars
  return (core.JSON && core.JSON.stringify || JSON.stringify).apply(JSON, arguments);
};
},{"../../modules/$.core":46}],30:[function(require,module,exports){
require('../modules/es6.object.to-string');
require('../modules/es6.string.iterator');
require('../modules/web.dom.iterable');
require('../modules/es6.map');
require('../modules/es7.map.to-json');
module.exports = require('../modules/$.core').Map;
},{"../modules/$.core":46,"../modules/es6.map":92,"../modules/es6.object.to-string":97,"../modules/es6.string.iterator":98,"../modules/es7.map.to-json":100,"../modules/web.dom.iterable":101}],31:[function(require,module,exports){
require('../../modules/es6.object.assign');
module.exports = require('../../modules/$.core').Object.assign;
},{"../../modules/$.core":46,"../../modules/es6.object.assign":93}],32:[function(require,module,exports){
var $ = require('../../modules/$');
module.exports = function create(P, D){
  return $.create(P, D);
};
},{"../../modules/$":68}],33:[function(require,module,exports){
var $ = require('../../modules/$');
module.exports = function defineProperty(it, key, desc){
  return $.setDesc(it, key, desc);
};
},{"../../modules/$":68}],34:[function(require,module,exports){
require('../../modules/es6.object.get-prototype-of');
module.exports = require('../../modules/$.core').Object.getPrototypeOf;
},{"../../modules/$.core":46,"../../modules/es6.object.get-prototype-of":94}],35:[function(require,module,exports){
require('../../modules/es6.object.keys');
module.exports = require('../../modules/$.core').Object.keys;
},{"../../modules/$.core":46,"../../modules/es6.object.keys":95}],36:[function(require,module,exports){
require('../../modules/es6.object.set-prototype-of');
module.exports = require('../../modules/$.core').Object.setPrototypeOf;
},{"../../modules/$.core":46,"../../modules/es6.object.set-prototype-of":96}],37:[function(require,module,exports){
require('../../modules/es6.symbol');
require('../../modules/es6.object.to-string');
module.exports = require('../../modules/$.core').Symbol;
},{"../../modules/$.core":46,"../../modules/es6.object.to-string":97,"../../modules/es6.symbol":99}],38:[function(require,module,exports){
module.exports = function(it){
  if(typeof it != 'function')throw TypeError(it + ' is not a function!');
  return it;
};
},{}],39:[function(require,module,exports){
module.exports = function(){ /* empty */ };
},{}],40:[function(require,module,exports){
var isObject = require('./$.is-object');
module.exports = function(it){
  if(!isObject(it))throw TypeError(it + ' is not an object!');
  return it;
};
},{"./$.is-object":61}],41:[function(require,module,exports){
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
},{"./$.cof":42,"./$.wks":87}],42:[function(require,module,exports){
var toString = {}.toString;

module.exports = function(it){
  return toString.call(it).slice(8, -1);
};
},{}],43:[function(require,module,exports){
'use strict';
var $            = require('./$')
  , hide         = require('./$.hide')
  , redefineAll  = require('./$.redefine-all')
  , ctx          = require('./$.ctx')
  , strictNew    = require('./$.strict-new')
  , defined      = require('./$.defined')
  , forOf        = require('./$.for-of')
  , $iterDefine  = require('./$.iter-define')
  , step         = require('./$.iter-step')
  , ID           = require('./$.uid')('id')
  , $has         = require('./$.has')
  , isObject     = require('./$.is-object')
  , setSpecies   = require('./$.set-species')
  , DESCRIPTORS  = require('./$.descriptors')
  , isExtensible = Object.isExtensible || isObject
  , SIZE         = DESCRIPTORS ? '_s' : 'size'
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
    redefineAll(C.prototype, {
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
        var f = ctx(callbackfn, arguments.length > 1 ? arguments[1] : undefined, 3)
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
    if(DESCRIPTORS)$.setDesc(C.prototype, 'size', {
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
    $iterDefine(C, NAME, function(iterated, kind){
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
    setSpecies(NAME);
  }
};
},{"./$":68,"./$.ctx":47,"./$.defined":48,"./$.descriptors":49,"./$.for-of":53,"./$.has":56,"./$.hide":57,"./$.is-object":61,"./$.iter-define":64,"./$.iter-step":66,"./$.redefine-all":74,"./$.set-species":77,"./$.strict-new":80,"./$.uid":86}],44:[function(require,module,exports){
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
},{"./$.classof":41,"./$.for-of":53}],45:[function(require,module,exports){
'use strict';
var $              = require('./$')
  , global         = require('./$.global')
  , $export        = require('./$.export')
  , fails          = require('./$.fails')
  , hide           = require('./$.hide')
  , redefineAll    = require('./$.redefine-all')
  , forOf          = require('./$.for-of')
  , strictNew      = require('./$.strict-new')
  , isObject       = require('./$.is-object')
  , setToStringTag = require('./$.set-to-string-tag')
  , DESCRIPTORS    = require('./$.descriptors');

module.exports = function(NAME, wrapper, methods, common, IS_MAP, IS_WEAK){
  var Base  = global[NAME]
    , C     = Base
    , ADDER = IS_MAP ? 'set' : 'add'
    , proto = C && C.prototype
    , O     = {};
  if(!DESCRIPTORS || typeof C != 'function' || !(IS_WEAK || proto.forEach && !fails(function(){
    new C().entries().next();
  }))){
    // create collection constructor
    C = common.getConstructor(wrapper, NAME, IS_MAP, ADDER);
    redefineAll(C.prototype, methods);
  } else {
    C = wrapper(function(target, iterable){
      strictNew(target, C, NAME);
      target._c = new Base;
      if(iterable != undefined)forOf(iterable, IS_MAP, target[ADDER], target);
    });
    $.each.call('add,clear,delete,forEach,get,has,set,keys,values,entries'.split(','),function(KEY){
      var IS_ADDER = KEY == 'add' || KEY == 'set';
      if(KEY in proto && !(IS_WEAK && KEY == 'clear'))hide(C.prototype, KEY, function(a, b){
        if(!IS_ADDER && IS_WEAK && !isObject(a))return KEY == 'get' ? undefined : false;
        var result = this._c[KEY](a === 0 ? 0 : a, b);
        return IS_ADDER ? this : result;
      });
    });
    if('size' in proto)$.setDesc(C.prototype, 'size', {
      get: function(){
        return this._c.size;
      }
    });
  }

  setToStringTag(C, NAME);

  O[NAME] = C;
  $export($export.G + $export.W + $export.F, O);

  if(!IS_WEAK)common.setStrong(C, NAME, IS_MAP);

  return C;
};
},{"./$":68,"./$.descriptors":49,"./$.export":51,"./$.fails":52,"./$.for-of":53,"./$.global":55,"./$.hide":57,"./$.is-object":61,"./$.redefine-all":74,"./$.set-to-string-tag":78,"./$.strict-new":80}],46:[function(require,module,exports){
var core = module.exports = {version: '1.2.6'};
if(typeof __e == 'number')__e = core; // eslint-disable-line no-undef
},{}],47:[function(require,module,exports){
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
},{"./$.a-function":38}],48:[function(require,module,exports){
// 7.2.1 RequireObjectCoercible(argument)
module.exports = function(it){
  if(it == undefined)throw TypeError("Can't call method on  " + it);
  return it;
};
},{}],49:[function(require,module,exports){
// Thank's IE8 for his funny defineProperty
module.exports = !require('./$.fails')(function(){
  return Object.defineProperty({}, 'a', {get: function(){ return 7; }}).a != 7;
});
},{"./$.fails":52}],50:[function(require,module,exports){
// all enumerable object keys, includes symbols
var $ = require('./$');
module.exports = function(it){
  var keys       = $.getKeys(it)
    , getSymbols = $.getSymbols;
  if(getSymbols){
    var symbols = getSymbols(it)
      , isEnum  = $.isEnum
      , i       = 0
      , key;
    while(symbols.length > i)if(isEnum.call(it, key = symbols[i++]))keys.push(key);
  }
  return keys;
};
},{"./$":68}],51:[function(require,module,exports){
var global    = require('./$.global')
  , core      = require('./$.core')
  , ctx       = require('./$.ctx')
  , PROTOTYPE = 'prototype';

var $export = function(type, name, source){
  var IS_FORCED = type & $export.F
    , IS_GLOBAL = type & $export.G
    , IS_STATIC = type & $export.S
    , IS_PROTO  = type & $export.P
    , IS_BIND   = type & $export.B
    , IS_WRAP   = type & $export.W
    , exports   = IS_GLOBAL ? core : core[name] || (core[name] = {})
    , target    = IS_GLOBAL ? global : IS_STATIC ? global[name] : (global[name] || {})[PROTOTYPE]
    , key, own, out;
  if(IS_GLOBAL)source = name;
  for(key in source){
    // contains in native
    own = !IS_FORCED && target && key in target;
    if(own && key in exports)continue;
    // export native or passed
    out = own ? target[key] : source[key];
    // prevent global pollution for namespaces
    exports[key] = IS_GLOBAL && typeof target[key] != 'function' ? source[key]
    // bind timers to global for call from export context
    : IS_BIND && own ? ctx(out, global)
    // wrap global constructors for prevent change them in library
    : IS_WRAP && target[key] == out ? (function(C){
      var F = function(param){
        return this instanceof C ? new C(param) : C(param);
      };
      F[PROTOTYPE] = C[PROTOTYPE];
      return F;
    // make static versions for prototype methods
    })(out) : IS_PROTO && typeof out == 'function' ? ctx(Function.call, out) : out;
    if(IS_PROTO)(exports[PROTOTYPE] || (exports[PROTOTYPE] = {}))[key] = out;
  }
};
// type bitmap
$export.F = 1;  // forced
$export.G = 2;  // global
$export.S = 4;  // static
$export.P = 8;  // proto
$export.B = 16; // bind
$export.W = 32; // wrap
module.exports = $export;
},{"./$.core":46,"./$.ctx":47,"./$.global":55}],52:[function(require,module,exports){
module.exports = function(exec){
  try {
    return !!exec();
  } catch(e){
    return true;
  }
};
},{}],53:[function(require,module,exports){
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
},{"./$.an-object":40,"./$.ctx":47,"./$.is-array-iter":59,"./$.iter-call":62,"./$.to-length":84,"./core.get-iterator-method":88}],54:[function(require,module,exports){
// fallback for IE11 buggy Object.getOwnPropertyNames with iframe and window
var toIObject = require('./$.to-iobject')
  , getNames  = require('./$').getNames
  , toString  = {}.toString;

var windowNames = typeof window == 'object' && Object.getOwnPropertyNames
  ? Object.getOwnPropertyNames(window) : [];

var getWindowNames = function(it){
  try {
    return getNames(it);
  } catch(e){
    return windowNames.slice();
  }
};

module.exports.get = function getOwnPropertyNames(it){
  if(windowNames && toString.call(it) == '[object Window]')return getWindowNames(it);
  return getNames(toIObject(it));
};
},{"./$":68,"./$.to-iobject":83}],55:[function(require,module,exports){
// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var global = module.exports = typeof window != 'undefined' && window.Math == Math
  ? window : typeof self != 'undefined' && self.Math == Math ? self : Function('return this')();
if(typeof __g == 'number')__g = global; // eslint-disable-line no-undef
},{}],56:[function(require,module,exports){
var hasOwnProperty = {}.hasOwnProperty;
module.exports = function(it, key){
  return hasOwnProperty.call(it, key);
};
},{}],57:[function(require,module,exports){
var $          = require('./$')
  , createDesc = require('./$.property-desc');
module.exports = require('./$.descriptors') ? function(object, key, value){
  return $.setDesc(object, key, createDesc(1, value));
} : function(object, key, value){
  object[key] = value;
  return object;
};
},{"./$":68,"./$.descriptors":49,"./$.property-desc":73}],58:[function(require,module,exports){
// fallback for non-array-like ES3 and non-enumerable old V8 strings
var cof = require('./$.cof');
module.exports = Object('z').propertyIsEnumerable(0) ? Object : function(it){
  return cof(it) == 'String' ? it.split('') : Object(it);
};
},{"./$.cof":42}],59:[function(require,module,exports){
// check on default Array iterator
var Iterators  = require('./$.iterators')
  , ITERATOR   = require('./$.wks')('iterator')
  , ArrayProto = Array.prototype;

module.exports = function(it){
  return it !== undefined && (Iterators.Array === it || ArrayProto[ITERATOR] === it);
};
},{"./$.iterators":67,"./$.wks":87}],60:[function(require,module,exports){
// 7.2.2 IsArray(argument)
var cof = require('./$.cof');
module.exports = Array.isArray || function(arg){
  return cof(arg) == 'Array';
};
},{"./$.cof":42}],61:[function(require,module,exports){
module.exports = function(it){
  return typeof it === 'object' ? it !== null : typeof it === 'function';
};
},{}],62:[function(require,module,exports){
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
},{"./$.an-object":40}],63:[function(require,module,exports){
'use strict';
var $              = require('./$')
  , descriptor     = require('./$.property-desc')
  , setToStringTag = require('./$.set-to-string-tag')
  , IteratorPrototype = {};

// 25.1.2.1.1 %IteratorPrototype%[@@iterator]()
require('./$.hide')(IteratorPrototype, require('./$.wks')('iterator'), function(){ return this; });

module.exports = function(Constructor, NAME, next){
  Constructor.prototype = $.create(IteratorPrototype, {next: descriptor(1, next)});
  setToStringTag(Constructor, NAME + ' Iterator');
};
},{"./$":68,"./$.hide":57,"./$.property-desc":73,"./$.set-to-string-tag":78,"./$.wks":87}],64:[function(require,module,exports){
'use strict';
var LIBRARY        = require('./$.library')
  , $export        = require('./$.export')
  , redefine       = require('./$.redefine')
  , hide           = require('./$.hide')
  , has            = require('./$.has')
  , Iterators      = require('./$.iterators')
  , $iterCreate    = require('./$.iter-create')
  , setToStringTag = require('./$.set-to-string-tag')
  , getProto       = require('./$').getProto
  , ITERATOR       = require('./$.wks')('iterator')
  , BUGGY          = !([].keys && 'next' in [].keys()) // Safari has buggy iterators w/o `next`
  , FF_ITERATOR    = '@@iterator'
  , KEYS           = 'keys'
  , VALUES         = 'values';

var returnThis = function(){ return this; };

module.exports = function(Base, NAME, Constructor, next, DEFAULT, IS_SET, FORCED){
  $iterCreate(Constructor, NAME, next);
  var getMethod = function(kind){
    if(!BUGGY && kind in proto)return proto[kind];
    switch(kind){
      case KEYS: return function keys(){ return new Constructor(this, kind); };
      case VALUES: return function values(){ return new Constructor(this, kind); };
    } return function entries(){ return new Constructor(this, kind); };
  };
  var TAG        = NAME + ' Iterator'
    , DEF_VALUES = DEFAULT == VALUES
    , VALUES_BUG = false
    , proto      = Base.prototype
    , $native    = proto[ITERATOR] || proto[FF_ITERATOR] || DEFAULT && proto[DEFAULT]
    , $default   = $native || getMethod(DEFAULT)
    , methods, key;
  // Fix native
  if($native){
    var IteratorPrototype = getProto($default.call(new Base));
    // Set @@toStringTag to native iterators
    setToStringTag(IteratorPrototype, TAG, true);
    // FF fix
    if(!LIBRARY && has(proto, FF_ITERATOR))hide(IteratorPrototype, ITERATOR, returnThis);
    // fix Array#{values, @@iterator}.name in V8 / FF
    if(DEF_VALUES && $native.name !== VALUES){
      VALUES_BUG = true;
      $default = function values(){ return $native.call(this); };
    }
  }
  // Define iterator
  if((!LIBRARY || FORCED) && (BUGGY || VALUES_BUG || !proto[ITERATOR])){
    hide(proto, ITERATOR, $default);
  }
  // Plug for library
  Iterators[NAME] = $default;
  Iterators[TAG]  = returnThis;
  if(DEFAULT){
    methods = {
      values:  DEF_VALUES  ? $default : getMethod(VALUES),
      keys:    IS_SET      ? $default : getMethod(KEYS),
      entries: !DEF_VALUES ? $default : getMethod('entries')
    };
    if(FORCED)for(key in methods){
      if(!(key in proto))redefine(proto, key, methods[key]);
    } else $export($export.P + $export.F * (BUGGY || VALUES_BUG), NAME, methods);
  }
  return methods;
};
},{"./$":68,"./$.export":51,"./$.has":56,"./$.hide":57,"./$.iter-create":63,"./$.iterators":67,"./$.library":70,"./$.redefine":75,"./$.set-to-string-tag":78,"./$.wks":87}],65:[function(require,module,exports){
var ITERATOR     = require('./$.wks')('iterator')
  , SAFE_CLOSING = false;

try {
  var riter = [7][ITERATOR]();
  riter['return'] = function(){ SAFE_CLOSING = true; };
  Array.from(riter, function(){ throw 2; });
} catch(e){ /* empty */ }

module.exports = function(exec, skipClosing){
  if(!skipClosing && !SAFE_CLOSING)return false;
  var safe = false;
  try {
    var arr  = [7]
      , iter = arr[ITERATOR]();
    iter.next = function(){ safe = true; };
    arr[ITERATOR] = function(){ return iter; };
    exec(arr);
  } catch(e){ /* empty */ }
  return safe;
};
},{"./$.wks":87}],66:[function(require,module,exports){
module.exports = function(done, value){
  return {value: value, done: !!done};
};
},{}],67:[function(require,module,exports){
module.exports = {};
},{}],68:[function(require,module,exports){
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
},{}],69:[function(require,module,exports){
var $         = require('./$')
  , toIObject = require('./$.to-iobject');
module.exports = function(object, el){
  var O      = toIObject(object)
    , keys   = $.getKeys(O)
    , length = keys.length
    , index  = 0
    , key;
  while(length > index)if(O[key = keys[index++]] === el)return key;
};
},{"./$":68,"./$.to-iobject":83}],70:[function(require,module,exports){
module.exports = true;
},{}],71:[function(require,module,exports){
// 19.1.2.1 Object.assign(target, source, ...)
var $        = require('./$')
  , toObject = require('./$.to-object')
  , IObject  = require('./$.iobject');

// should work with symbols and should have deterministic property order (V8 bug)
module.exports = require('./$.fails')(function(){
  var a = Object.assign
    , A = {}
    , B = {}
    , S = Symbol()
    , K = 'abcdefghijklmnopqrst';
  A[S] = 7;
  K.split('').forEach(function(k){ B[k] = k; });
  return a({}, A)[S] != 7 || Object.keys(a({}, B)).join('') != K;
}) ? function assign(target, source){ // eslint-disable-line no-unused-vars
  var T     = toObject(target)
    , $$    = arguments
    , $$len = $$.length
    , index = 1
    , getKeys    = $.getKeys
    , getSymbols = $.getSymbols
    , isEnum     = $.isEnum;
  while($$len > index){
    var S      = IObject($$[index++])
      , keys   = getSymbols ? getKeys(S).concat(getSymbols(S)) : getKeys(S)
      , length = keys.length
      , j      = 0
      , key;
    while(length > j)if(isEnum.call(S, key = keys[j++]))T[key] = S[key];
  }
  return T;
} : Object.assign;
},{"./$":68,"./$.fails":52,"./$.iobject":58,"./$.to-object":85}],72:[function(require,module,exports){
// most Object methods by ES6 should accept primitives
var $export = require('./$.export')
  , core    = require('./$.core')
  , fails   = require('./$.fails');
module.exports = function(KEY, exec){
  var fn  = (core.Object || {})[KEY] || Object[KEY]
    , exp = {};
  exp[KEY] = exec(fn);
  $export($export.S + $export.F * fails(function(){ fn(1); }), 'Object', exp);
};
},{"./$.core":46,"./$.export":51,"./$.fails":52}],73:[function(require,module,exports){
module.exports = function(bitmap, value){
  return {
    enumerable  : !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable    : !(bitmap & 4),
    value       : value
  };
};
},{}],74:[function(require,module,exports){
var redefine = require('./$.redefine');
module.exports = function(target, src){
  for(var key in src)redefine(target, key, src[key]);
  return target;
};
},{"./$.redefine":75}],75:[function(require,module,exports){
module.exports = require('./$.hide');
},{"./$.hide":57}],76:[function(require,module,exports){
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
  set: Object.setPrototypeOf || ('__proto__' in {} ? // eslint-disable-line
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
},{"./$":68,"./$.an-object":40,"./$.ctx":47,"./$.is-object":61}],77:[function(require,module,exports){
'use strict';
var core        = require('./$.core')
  , $           = require('./$')
  , DESCRIPTORS = require('./$.descriptors')
  , SPECIES     = require('./$.wks')('species');

module.exports = function(KEY){
  var C = core[KEY];
  if(DESCRIPTORS && C && !C[SPECIES])$.setDesc(C, SPECIES, {
    configurable: true,
    get: function(){ return this; }
  });
};
},{"./$":68,"./$.core":46,"./$.descriptors":49,"./$.wks":87}],78:[function(require,module,exports){
var def = require('./$').setDesc
  , has = require('./$.has')
  , TAG = require('./$.wks')('toStringTag');

module.exports = function(it, tag, stat){
  if(it && !has(it = stat ? it : it.prototype, TAG))def(it, TAG, {configurable: true, value: tag});
};
},{"./$":68,"./$.has":56,"./$.wks":87}],79:[function(require,module,exports){
var global = require('./$.global')
  , SHARED = '__core-js_shared__'
  , store  = global[SHARED] || (global[SHARED] = {});
module.exports = function(key){
  return store[key] || (store[key] = {});
};
},{"./$.global":55}],80:[function(require,module,exports){
module.exports = function(it, Constructor, name){
  if(!(it instanceof Constructor))throw TypeError(name + ": use the 'new' operator!");
  return it;
};
},{}],81:[function(require,module,exports){
var toInteger = require('./$.to-integer')
  , defined   = require('./$.defined');
// true  -> String#at
// false -> String#codePointAt
module.exports = function(TO_STRING){
  return function(that, pos){
    var s = String(defined(that))
      , i = toInteger(pos)
      , l = s.length
      , a, b;
    if(i < 0 || i >= l)return TO_STRING ? '' : undefined;
    a = s.charCodeAt(i);
    return a < 0xd800 || a > 0xdbff || i + 1 === l || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff
      ? TO_STRING ? s.charAt(i) : a
      : TO_STRING ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
  };
};
},{"./$.defined":48,"./$.to-integer":82}],82:[function(require,module,exports){
// 7.1.4 ToInteger
var ceil  = Math.ceil
  , floor = Math.floor;
module.exports = function(it){
  return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
};
},{}],83:[function(require,module,exports){
// to indexed object, toObject with fallback for non-array-like ES3 strings
var IObject = require('./$.iobject')
  , defined = require('./$.defined');
module.exports = function(it){
  return IObject(defined(it));
};
},{"./$.defined":48,"./$.iobject":58}],84:[function(require,module,exports){
// 7.1.15 ToLength
var toInteger = require('./$.to-integer')
  , min       = Math.min;
module.exports = function(it){
  return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0; // pow(2, 53) - 1 == 9007199254740991
};
},{"./$.to-integer":82}],85:[function(require,module,exports){
// 7.1.13 ToObject(argument)
var defined = require('./$.defined');
module.exports = function(it){
  return Object(defined(it));
};
},{"./$.defined":48}],86:[function(require,module,exports){
var id = 0
  , px = Math.random();
module.exports = function(key){
  return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
};
},{}],87:[function(require,module,exports){
var store  = require('./$.shared')('wks')
  , uid    = require('./$.uid')
  , Symbol = require('./$.global').Symbol;
module.exports = function(name){
  return store[name] || (store[name] =
    Symbol && Symbol[name] || (Symbol || uid)('Symbol.' + name));
};
},{"./$.global":55,"./$.shared":79,"./$.uid":86}],88:[function(require,module,exports){
var classof   = require('./$.classof')
  , ITERATOR  = require('./$.wks')('iterator')
  , Iterators = require('./$.iterators');
module.exports = require('./$.core').getIteratorMethod = function(it){
  if(it != undefined)return it[ITERATOR]
    || it['@@iterator']
    || Iterators[classof(it)];
};
},{"./$.classof":41,"./$.core":46,"./$.iterators":67,"./$.wks":87}],89:[function(require,module,exports){
var anObject = require('./$.an-object')
  , get      = require('./core.get-iterator-method');
module.exports = require('./$.core').getIterator = function(it){
  var iterFn = get(it);
  if(typeof iterFn != 'function')throw TypeError(it + ' is not iterable!');
  return anObject(iterFn.call(it));
};
},{"./$.an-object":40,"./$.core":46,"./core.get-iterator-method":88}],90:[function(require,module,exports){
'use strict';
var ctx         = require('./$.ctx')
  , $export     = require('./$.export')
  , toObject    = require('./$.to-object')
  , call        = require('./$.iter-call')
  , isArrayIter = require('./$.is-array-iter')
  , toLength    = require('./$.to-length')
  , getIterFn   = require('./core.get-iterator-method');
$export($export.S + $export.F * !require('./$.iter-detect')(function(iter){ Array.from(iter); }), 'Array', {
  // 22.1.2.1 Array.from(arrayLike, mapfn = undefined, thisArg = undefined)
  from: function from(arrayLike/*, mapfn = undefined, thisArg = undefined*/){
    var O       = toObject(arrayLike)
      , C       = typeof this == 'function' ? this : Array
      , $$      = arguments
      , $$len   = $$.length
      , mapfn   = $$len > 1 ? $$[1] : undefined
      , mapping = mapfn !== undefined
      , index   = 0
      , iterFn  = getIterFn(O)
      , length, result, step, iterator;
    if(mapping)mapfn = ctx(mapfn, $$len > 2 ? $$[2] : undefined, 2);
    // if object isn't iterable or it's array with default iterator - use simple case
    if(iterFn != undefined && !(C == Array && isArrayIter(iterFn))){
      for(iterator = iterFn.call(O), result = new C; !(step = iterator.next()).done; index++){
        result[index] = mapping ? call(iterator, mapfn, [step.value, index], true) : step.value;
      }
    } else {
      length = toLength(O.length);
      for(result = new C(length); length > index; index++){
        result[index] = mapping ? mapfn(O[index], index) : O[index];
      }
    }
    result.length = index;
    return result;
  }
});

},{"./$.ctx":47,"./$.export":51,"./$.is-array-iter":59,"./$.iter-call":62,"./$.iter-detect":65,"./$.to-length":84,"./$.to-object":85,"./core.get-iterator-method":88}],91:[function(require,module,exports){
'use strict';
var addToUnscopables = require('./$.add-to-unscopables')
  , step             = require('./$.iter-step')
  , Iterators        = require('./$.iterators')
  , toIObject        = require('./$.to-iobject');

// 22.1.3.4 Array.prototype.entries()
// 22.1.3.13 Array.prototype.keys()
// 22.1.3.29 Array.prototype.values()
// 22.1.3.30 Array.prototype[@@iterator]()
module.exports = require('./$.iter-define')(Array, 'Array', function(iterated, kind){
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

addToUnscopables('keys');
addToUnscopables('values');
addToUnscopables('entries');
},{"./$.add-to-unscopables":39,"./$.iter-define":64,"./$.iter-step":66,"./$.iterators":67,"./$.to-iobject":83}],92:[function(require,module,exports){
'use strict';
var strong = require('./$.collection-strong');

// 23.1 Map Objects
require('./$.collection')('Map', function(get){
  return function Map(){ return get(this, arguments.length > 0 ? arguments[0] : undefined); };
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
},{"./$.collection":45,"./$.collection-strong":43}],93:[function(require,module,exports){
// 19.1.3.1 Object.assign(target, source)
var $export = require('./$.export');

$export($export.S + $export.F, 'Object', {assign: require('./$.object-assign')});
},{"./$.export":51,"./$.object-assign":71}],94:[function(require,module,exports){
// 19.1.2.9 Object.getPrototypeOf(O)
var toObject = require('./$.to-object');

require('./$.object-sap')('getPrototypeOf', function($getPrototypeOf){
  return function getPrototypeOf(it){
    return $getPrototypeOf(toObject(it));
  };
});
},{"./$.object-sap":72,"./$.to-object":85}],95:[function(require,module,exports){
// 19.1.2.14 Object.keys(O)
var toObject = require('./$.to-object');

require('./$.object-sap')('keys', function($keys){
  return function keys(it){
    return $keys(toObject(it));
  };
});
},{"./$.object-sap":72,"./$.to-object":85}],96:[function(require,module,exports){
// 19.1.3.19 Object.setPrototypeOf(O, proto)
var $export = require('./$.export');
$export($export.S, 'Object', {setPrototypeOf: require('./$.set-proto').set});
},{"./$.export":51,"./$.set-proto":76}],97:[function(require,module,exports){

},{}],98:[function(require,module,exports){
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
},{"./$.iter-define":64,"./$.string-at":81}],99:[function(require,module,exports){
'use strict';
// ECMAScript 6 symbols shim
var $              = require('./$')
  , global         = require('./$.global')
  , has            = require('./$.has')
  , DESCRIPTORS    = require('./$.descriptors')
  , $export        = require('./$.export')
  , redefine       = require('./$.redefine')
  , $fails         = require('./$.fails')
  , shared         = require('./$.shared')
  , setToStringTag = require('./$.set-to-string-tag')
  , uid            = require('./$.uid')
  , wks            = require('./$.wks')
  , keyOf          = require('./$.keyof')
  , $names         = require('./$.get-names')
  , enumKeys       = require('./$.enum-keys')
  , isArray        = require('./$.is-array')
  , anObject       = require('./$.an-object')
  , toIObject      = require('./$.to-iobject')
  , createDesc     = require('./$.property-desc')
  , getDesc        = $.getDesc
  , setDesc        = $.setDesc
  , _create        = $.create
  , getNames       = $names.get
  , $Symbol        = global.Symbol
  , $JSON          = global.JSON
  , _stringify     = $JSON && $JSON.stringify
  , setter         = false
  , HIDDEN         = wks('_hidden')
  , isEnum         = $.isEnum
  , SymbolRegistry = shared('symbol-registry')
  , AllSymbols     = shared('symbols')
  , useNative      = typeof $Symbol == 'function'
  , ObjectProto    = Object.prototype;

// fallback for old Android, https://code.google.com/p/v8/issues/detail?id=687
var setSymbolDesc = DESCRIPTORS && $fails(function(){
  return _create(setDesc({}, 'a', {
    get: function(){ return setDesc(this, 'a', {value: 7}).a; }
  })).a != 7;
}) ? function(it, key, D){
  var protoDesc = getDesc(ObjectProto, key);
  if(protoDesc)delete ObjectProto[key];
  setDesc(it, key, D);
  if(protoDesc && it !== ObjectProto)setDesc(ObjectProto, key, protoDesc);
} : setDesc;

var wrap = function(tag){
  var sym = AllSymbols[tag] = _create($Symbol.prototype);
  sym._k = tag;
  DESCRIPTORS && setter && setSymbolDesc(ObjectProto, tag, {
    configurable: true,
    set: function(value){
      if(has(this, HIDDEN) && has(this[HIDDEN], tag))this[HIDDEN][tag] = false;
      setSymbolDesc(this, tag, createDesc(1, value));
    }
  });
  return sym;
};

var isSymbol = function(it){
  return typeof it == 'symbol';
};

var $defineProperty = function defineProperty(it, key, D){
  if(D && has(AllSymbols, key)){
    if(!D.enumerable){
      if(!has(it, HIDDEN))setDesc(it, HIDDEN, createDesc(1, {}));
      it[HIDDEN][key] = true;
    } else {
      if(has(it, HIDDEN) && it[HIDDEN][key])it[HIDDEN][key] = false;
      D = _create(D, {enumerable: createDesc(0, false)});
    } return setSymbolDesc(it, key, D);
  } return setDesc(it, key, D);
};
var $defineProperties = function defineProperties(it, P){
  anObject(it);
  var keys = enumKeys(P = toIObject(P))
    , i    = 0
    , l = keys.length
    , key;
  while(l > i)$defineProperty(it, key = keys[i++], P[key]);
  return it;
};
var $create = function create(it, P){
  return P === undefined ? _create(it) : $defineProperties(_create(it), P);
};
var $propertyIsEnumerable = function propertyIsEnumerable(key){
  var E = isEnum.call(this, key);
  return E || !has(this, key) || !has(AllSymbols, key) || has(this, HIDDEN) && this[HIDDEN][key]
    ? E : true;
};
var $getOwnPropertyDescriptor = function getOwnPropertyDescriptor(it, key){
  var D = getDesc(it = toIObject(it), key);
  if(D && has(AllSymbols, key) && !(has(it, HIDDEN) && it[HIDDEN][key]))D.enumerable = true;
  return D;
};
var $getOwnPropertyNames = function getOwnPropertyNames(it){
  var names  = getNames(toIObject(it))
    , result = []
    , i      = 0
    , key;
  while(names.length > i)if(!has(AllSymbols, key = names[i++]) && key != HIDDEN)result.push(key);
  return result;
};
var $getOwnPropertySymbols = function getOwnPropertySymbols(it){
  var names  = getNames(toIObject(it))
    , result = []
    , i      = 0
    , key;
  while(names.length > i)if(has(AllSymbols, key = names[i++]))result.push(AllSymbols[key]);
  return result;
};
var $stringify = function stringify(it){
  if(it === undefined || isSymbol(it))return; // IE8 returns string on undefined
  var args = [it]
    , i    = 1
    , $$   = arguments
    , replacer, $replacer;
  while($$.length > i)args.push($$[i++]);
  replacer = args[1];
  if(typeof replacer == 'function')$replacer = replacer;
  if($replacer || !isArray(replacer))replacer = function(key, value){
    if($replacer)value = $replacer.call(this, key, value);
    if(!isSymbol(value))return value;
  };
  args[1] = replacer;
  return _stringify.apply($JSON, args);
};
var buggyJSON = $fails(function(){
  var S = $Symbol();
  // MS Edge converts symbol values to JSON as {}
  // WebKit converts symbol values to JSON as null
  // V8 throws on boxed symbols
  return _stringify([S]) != '[null]' || _stringify({a: S}) != '{}' || _stringify(Object(S)) != '{}';
});

// 19.4.1.1 Symbol([description])
if(!useNative){
  $Symbol = function Symbol(){
    if(isSymbol(this))throw TypeError('Symbol is not a constructor');
    return wrap(uid(arguments.length > 0 ? arguments[0] : undefined));
  };
  redefine($Symbol.prototype, 'toString', function toString(){
    return this._k;
  });

  isSymbol = function(it){
    return it instanceof $Symbol;
  };

  $.create     = $create;
  $.isEnum     = $propertyIsEnumerable;
  $.getDesc    = $getOwnPropertyDescriptor;
  $.setDesc    = $defineProperty;
  $.setDescs   = $defineProperties;
  $.getNames   = $names.get = $getOwnPropertyNames;
  $.getSymbols = $getOwnPropertySymbols;

  if(DESCRIPTORS && !require('./$.library')){
    redefine(ObjectProto, 'propertyIsEnumerable', $propertyIsEnumerable, true);
  }
}

var symbolStatics = {
  // 19.4.2.1 Symbol.for(key)
  'for': function(key){
    return has(SymbolRegistry, key += '')
      ? SymbolRegistry[key]
      : SymbolRegistry[key] = $Symbol(key);
  },
  // 19.4.2.5 Symbol.keyFor(sym)
  keyFor: function keyFor(key){
    return keyOf(SymbolRegistry, key);
  },
  useSetter: function(){ setter = true; },
  useSimple: function(){ setter = false; }
};
// 19.4.2.2 Symbol.hasInstance
// 19.4.2.3 Symbol.isConcatSpreadable
// 19.4.2.4 Symbol.iterator
// 19.4.2.6 Symbol.match
// 19.4.2.8 Symbol.replace
// 19.4.2.9 Symbol.search
// 19.4.2.10 Symbol.species
// 19.4.2.11 Symbol.split
// 19.4.2.12 Symbol.toPrimitive
// 19.4.2.13 Symbol.toStringTag
// 19.4.2.14 Symbol.unscopables
$.each.call((
  'hasInstance,isConcatSpreadable,iterator,match,replace,search,' +
  'species,split,toPrimitive,toStringTag,unscopables'
).split(','), function(it){
  var sym = wks(it);
  symbolStatics[it] = useNative ? sym : wrap(sym);
});

setter = true;

$export($export.G + $export.W, {Symbol: $Symbol});

$export($export.S, 'Symbol', symbolStatics);

$export($export.S + $export.F * !useNative, 'Object', {
  // 19.1.2.2 Object.create(O [, Properties])
  create: $create,
  // 19.1.2.4 Object.defineProperty(O, P, Attributes)
  defineProperty: $defineProperty,
  // 19.1.2.3 Object.defineProperties(O, Properties)
  defineProperties: $defineProperties,
  // 19.1.2.6 Object.getOwnPropertyDescriptor(O, P)
  getOwnPropertyDescriptor: $getOwnPropertyDescriptor,
  // 19.1.2.7 Object.getOwnPropertyNames(O)
  getOwnPropertyNames: $getOwnPropertyNames,
  // 19.1.2.8 Object.getOwnPropertySymbols(O)
  getOwnPropertySymbols: $getOwnPropertySymbols
});

// 24.3.2 JSON.stringify(value [, replacer [, space]])
$JSON && $export($export.S + $export.F * (!useNative || buggyJSON), 'JSON', {stringify: $stringify});

// 19.4.3.5 Symbol.prototype[@@toStringTag]
setToStringTag($Symbol, 'Symbol');
// 20.2.1.9 Math[@@toStringTag]
setToStringTag(Math, 'Math', true);
// 24.3.3 JSON[@@toStringTag]
setToStringTag(global.JSON, 'JSON', true);
},{"./$":68,"./$.an-object":40,"./$.descriptors":49,"./$.enum-keys":50,"./$.export":51,"./$.fails":52,"./$.get-names":54,"./$.global":55,"./$.has":56,"./$.is-array":60,"./$.keyof":69,"./$.library":70,"./$.property-desc":73,"./$.redefine":75,"./$.set-to-string-tag":78,"./$.shared":79,"./$.to-iobject":83,"./$.uid":86,"./$.wks":87}],100:[function(require,module,exports){
// https://github.com/DavidBruant/Map-Set.prototype.toJSON
var $export  = require('./$.export');

$export($export.P, 'Map', {toJSON: require('./$.collection-to-json')('Map')});
},{"./$.collection-to-json":44,"./$.export":51}],101:[function(require,module,exports){
require('./es6.array.iterator');
var Iterators = require('./$.iterators');
Iterators.NodeList = Iterators.HTMLCollection = Iterators.Array;
},{"./$.iterators":67,"./es6.array.iterator":91}],102:[function(require,module,exports){
var isObject = require('./isObject'),
    now = require('./now'),
    toNumber = require('./toNumber');

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max;

/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was
 * invoked. The debounced function comes with a `cancel` method to cancel
 * delayed `func` invocations and a `flush` method to immediately invoke them.
 * Provide an options object to indicate whether `func` should be invoked on
 * the leading and/or trailing edge of the `wait` timeout. The `func` is invoked
 * with the last arguments provided to the debounced function. Subsequent calls
 * to the debounced function return the result of the last `func` invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is invoked
 * on the trailing edge of the timeout only if the the debounced function is
 * invoked more than once during the `wait` timeout.
 *
 * See [David Corbacho's article](http://drupalmotion.com/article/debounce-and-throttle-visual-explanation)
 * for details over the differences between `_.debounce` and `_.throttle`.
 *
 * @static
 * @memberOf _
 * @category Function
 * @param {Function} func The function to debounce.
 * @param {number} [wait=0] The number of milliseconds to delay.
 * @param {Object} [options] The options object.
 * @param {boolean} [options.leading=false] Specify invoking on the leading
 *  edge of the timeout.
 * @param {number} [options.maxWait] The maximum time `func` is allowed to be
 *  delayed before it's invoked.
 * @param {boolean} [options.trailing=true] Specify invoking on the trailing
 *  edge of the timeout.
 * @returns {Function} Returns the new debounced function.
 * @example
 *
 * // avoid costly calculations while the window size is in flux
 * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
 *
 * // invoke `sendMail` when clicked, debouncing subsequent calls
 * jQuery(element).on('click', _.debounce(sendMail, 300, {
 *   'leading': true,
 *   'trailing': false
 * }));
 *
 * // ensure `batchLog` is invoked once after 1 second of debounced calls
 * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
 * var source = new EventSource('/stream');
 * jQuery(source).on('message', debounced);
 *
 * // cancel a trailing debounced invocation
 * jQuery(window).on('popstate', debounced.cancel);
 */
function debounce(func, wait, options) {
  var args,
      maxTimeoutId,
      result,
      stamp,
      thisArg,
      timeoutId,
      trailingCall,
      lastCalled = 0,
      leading = false,
      maxWait = false,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  wait = toNumber(wait) || 0;
  if (isObject(options)) {
    leading = !!options.leading;
    maxWait = 'maxWait' in options && nativeMax(toNumber(options.maxWait) || 0, wait);
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }

  function cancel() {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (maxTimeoutId) {
      clearTimeout(maxTimeoutId);
    }
    lastCalled = 0;
    args = maxTimeoutId = thisArg = timeoutId = trailingCall = undefined;
  }

  function complete(isCalled, id) {
    if (id) {
      clearTimeout(id);
    }
    maxTimeoutId = timeoutId = trailingCall = undefined;
    if (isCalled) {
      lastCalled = now();
      result = func.apply(thisArg, args);
      if (!timeoutId && !maxTimeoutId) {
        args = thisArg = undefined;
      }
    }
  }

  function delayed() {
    var remaining = wait - (now() - stamp);
    if (remaining <= 0 || remaining > wait) {
      complete(trailingCall, maxTimeoutId);
    } else {
      timeoutId = setTimeout(delayed, remaining);
    }
  }

  function flush() {
    if ((timeoutId && trailingCall) || (maxTimeoutId && trailing)) {
      result = func.apply(thisArg, args);
    }
    cancel();
    return result;
  }

  function maxDelayed() {
    complete(trailing, timeoutId);
  }

  function debounced() {
    args = arguments;
    stamp = now();
    thisArg = this;
    trailingCall = trailing && (timeoutId || !leading);

    if (maxWait === false) {
      var leadingCall = leading && !timeoutId;
    } else {
      if (!maxTimeoutId && !leading) {
        lastCalled = stamp;
      }
      var remaining = maxWait - (stamp - lastCalled),
          isCalled = remaining <= 0 || remaining > maxWait;

      if (isCalled) {
        if (maxTimeoutId) {
          maxTimeoutId = clearTimeout(maxTimeoutId);
        }
        lastCalled = stamp;
        result = func.apply(thisArg, args);
      }
      else if (!maxTimeoutId) {
        maxTimeoutId = setTimeout(maxDelayed, remaining);
      }
    }
    if (isCalled && timeoutId) {
      timeoutId = clearTimeout(timeoutId);
    }
    else if (!timeoutId && wait !== maxWait) {
      timeoutId = setTimeout(delayed, wait);
    }
    if (leadingCall) {
      isCalled = true;
      result = func.apply(thisArg, args);
    }
    if (isCalled && !timeoutId && !maxTimeoutId) {
      args = thisArg = undefined;
    }
    return result;
  }
  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced;
}

module.exports = debounce;

},{"./isObject":104,"./now":105,"./toNumber":106}],103:[function(require,module,exports){
(function (global){
var isObject = require('./isObject');

/** `Object#toString` result references. */
var funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]';

/** Used for built-in method references. */
var objectProto = global.Object.prototype;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 8 which returns 'object' for typed array constructors, and
  // PhantomJS 1.9 which returns 'function' for `NodeList` instances.
  var tag = isObject(value) ? objectToString.call(value) : '';
  return tag == funcTag || tag == genTag;
}

module.exports = isFunction;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./isObject":104}],104:[function(require,module,exports){
/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = isObject;

},{}],105:[function(require,module,exports){
/**
 * Gets the timestamp of the number of milliseconds that have elapsed since
 * the Unix epoch (1 January 1970 00:00:00 UTC).
 *
 * @static
 * @memberOf _
 * @type Function
 * @category Date
 * @returns {number} Returns the timestamp.
 * @example
 *
 * _.defer(function(stamp) {
 *   console.log(_.now() - stamp);
 * }, _.now());
 * // => logs the number of milliseconds it took for the deferred function to be invoked
 */
var now = Date.now;

module.exports = now;

},{}],106:[function(require,module,exports){
var isFunction = require('./isFunction'),
    isObject = require('./isObject');

/** Used as references for various `Number` constants. */
var NAN = 0 / 0;

/** Used to match leading and trailing whitespace. */
var reTrim = /^\s+|\s+$/g;

/** Used to detect bad signed hexadecimal string values. */
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

/** Used to detect binary string values. */
var reIsBinary = /^0b[01]+$/i;

/** Used to detect octal string values. */
var reIsOctal = /^0o[0-7]+$/i;

/** Built-in method references without a dependency on `global`. */
var freeParseInt = parseInt;

/**
 * Converts `value` to a number.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to process.
 * @returns {number} Returns the number.
 * @example
 *
 * _.toNumber(3);
 * // => 3
 *
 * _.toNumber(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toNumber(Infinity);
 * // => Infinity
 *
 * _.toNumber('3');
 * // => 3
 */
function toNumber(value) {
  if (isObject(value)) {
    var other = isFunction(value.valueOf) ? value.valueOf() : value;
    value = isObject(other) ? (other + '') : other;
  }
  if (typeof value != 'string') {
    return value === 0 ? value : +value;
  }
  value = value.replace(reTrim, '');
  var isBinary = reIsBinary.test(value);
  return (isBinary || reIsOctal.test(value))
    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
    : (reIsBadHex.test(value) ? NAN : +value);
}

module.exports = toNumber;

},{"./isFunction":103,"./isObject":104}],107:[function(require,module,exports){
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

},{}]},{},[7])(7)
});
//# sourceMappingURL=bundle.js.map
