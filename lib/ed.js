'use strict';

var EventEmitter2 = require('eventemitter2').EventEmitter2;
var _ = require('lodash');

import EdSnapshots from './ed-snapshots';
import EdEntities from './ed-entities';
import EdMisc from './ed-misc';

function Ed (robot) {
  EventEmitter2.apply(this);

  var ros = robot.ros;
}

Ed.prototype = Object.create(EventEmitter2.prototype);

module.exports = Ed;
