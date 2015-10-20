'use strict';

import {EventEmitter2} from 'eventemitter2';
import {ServiceRequest} from 'roslib';

class ActionServer extends EventEmitter2 {
  constructor(robot) {
    super();
    const ros = robot.ros;

    this.queryService = ros.Service({
      name: 'action_server/add_action',
      serviceType: 'action_server/AddAction'
    });
  }

  doAction(actionName, entityId) {
    // Why do I have to do the concatination this way, stupid lint, Ramon?
    const request = new ServiceRequest({
      action: actionName,
      parameters: '{"entity": {"id":"'.concat(entityId).concat('"}}')
    });

    console.log('ActionServer.doAction');
    console.log(request);
    this.queryService.callService(request, response => {
      console.log(response);
    }, error => {
      console.log(`ActionServer:doAction callService ${this.name} failed:`, error);
    });
  }
}

export default ActionServer;
