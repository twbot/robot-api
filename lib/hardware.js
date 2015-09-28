'use strict';

var EventEmitter2 = require('eventemitter2').EventEmitter2;
var _ = require('lodash');
var ROSLIB = require('roslib');

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
