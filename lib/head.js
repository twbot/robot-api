import {EventEmitter2} from 'eventemitter2';
import {Goal, ServiceRequest} from 'roslib';

class Head extends EventEmitter2 {
  constructor(robot) {
    super();

    const ros = robot.ros;

    this.getImageService = ros.Service({
      name: 'top_kinect/rgbd',
      serviceType: 'rgbd/GetRGBD'
    });

    this.goal = null;
    // this.head_ac = ros.ActionClient({
    //   serverName: 'head_ref/action_server',
    //   actionName: 'head_ref/HeadReferenceAction',
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

      const blob = new Blob([rgb_data], {type: 'image/jpeg'});
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.src = url;

      console.log('Head:getImage', rgb_data, depth_data);
      callback(img);
    }, error => {
      console.error(`Head:getImage callService ${this.getImageService.name} failed:`, error);
    });
  }

  sendGoal() {
    this.goal = new Goal({
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

    this.goal.on('feedback', feedback => {
      console.log('Feedback:', feedback);
    });
    this.goal.on('result', result => {
      console.log('Result:', result);
    });
  }
}

export default Head;
