import {EventEmitter2} from 'eventemitter2';
import {Goal, ServiceRequest} from 'roslib';

class Head extends EventEmitter2 {
  constructor(robot) {
    super();

    const ros = robot.ros;

    this.getImageService = ros.Service({
      name: 'ed/get_image',
      serviceType: 'rgbd/GetRGBD'
    });

    this.goal = null;
    // this.head_ac = ros.ActionClient({
    //   serverName: 'head_ref/action_server',
    //   actionName: 'head_ref/HeadReferenceAction'
    // });
  }

  /**
   * Get a rgbd image from the kinect
   * @param  {Number}         width     Width of the requested image
   * @param  {Function(img)}  callback  Callback with the Image
   */
  getImage(width = 128, callback) {
    // uint8 JPEG=0
    // uint8 PNG=1
    const request = new ServiceRequest({
      width,
      compression: 0
    });
    this.getImageService.callService(request, response => {
      /* eslint camelcase:0 */
      const {rgb_data, depth_data} = response;

      const rgb_image_url = `data:image/jpeg;base64,${rgb_data}`;
      const depth_image_url = `data:image/jpeg;base64,${depth_data}`;

      callback(rgb_image_url, depth_image_url);
    }, error => {
      console.error(`Head:getImage callService ${this.getImageService.name} failed:`, error);
    });
  }

  sendPanTiltGoal(pan, tilt) {
    this.goal = new Goal({
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
        pan,
        tilt,

        // goal cancels automatically after this time (seconds), if 0, no auto cancel
        end_time: 0
      }
    });

    this.goal.send();
  }

  cancelGoal() {
    if (this.goal) {
      this.goal.cancel();
    }
  }

  cancelAllGoals() {
    this.head_ac.cancel();
  }
}

export default Head;
