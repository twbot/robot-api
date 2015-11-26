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

  doEntityAction(actionName, entityId) {
    const parameters = {
      entity: {
        id: entityId
      }
    };
    this.doAction(actionName, parameters);
  }

  doAction(actionName, parameters) {
    const request = new ServiceRequest({
      action: actionName,
      parameters: JSON.stringify(parameters)
    });

    this.queryService.callService(request, response => {
      /* eslint camelcase:0 */
      const {action_uuid, error_msg} = response;

      if (error_msg) {
        console.error('ActionServer:doAction', error_msg);
      } else {
        console.log('ActionServer:doAction', action_uuid);
      }
    }, error => {
      console.error(`ActionServer:doAction callService ${this.queryService.name} failed:`, error);
    });
  }
}

export default ActionServer;
