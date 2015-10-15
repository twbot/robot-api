import {EventEmitter2} from 'eventemitter2';
import {ServiceRequest} from 'roslib';

class Ed extends EventEmitter2 {

  constructor(robot) {
    super();
    const ros = robot.ros;

    this.queryService = ros.Service({
      name: 'ed/query',
      serviceType: 'ed/Query'
    });
  }

  entities = new Map()

  revision = 0
  query() {
    const request = new ServiceRequest({
      /* eslint camelcase:0 */
      // string[] ids
      // string[] properties
      since_revision: this.revision
    });

    this.queryService.callService(request, response => {
      const new_revision = response.new_revision;

      if (new_revision <= this.revision) {
        console.error('ed:query incorrect revision');
        return;
      }
      this.revision = new_revision;

      console.time('JSON.parse');
      const data = JSON.parse(response.human_readable);
      console.timeEnd('JSON.parse');

      console.time('ed.updateEntities');
      this.updateEntities(data.entities);
      console.timeEnd('ed.updateEntities');
    }, error => {
      console.log(`ed:query callService ${this.name} failed:`, error);
    });
  }

  updateEntities(entities) {
    for (const entity of entities) {
      const id = entity.id;

      if (this.entities.has(id)) {
        // update object

        console.log('update entity:', entity);
        const object = this.entities.get(id);

        if (entity.hasOwnProperty('pose')) {
          const {position, quaternion} = parseEdPosition(entity.pose);
          object.position = position;
          object.quaternion = quaternion;
        }

        if (entity.hasOwnProperty('mesh')) {
          const {vertices, faces} = parseEdMesh(entity.mesh);
          object.vertices = vertices;
          object.faces = faces;
        }
      } else {
        // add object

        const object = {};

        if (entity.hasOwnProperty('pose')) {
          const {position, quaternion} = parseEdPosition(entity.pose);
          object.position = position;
          object.quaternion = quaternion;
        }

        if (entity.hasOwnProperty('mesh')) {
          const {vertices, faces} = parseEdMesh(entity.mesh);
          object.vertices = vertices;
          object.faces = faces;
        }

        this.entities.set(id, object);
      }
    }
  }
}

function parseEdPosition(pose) {
  return {
    position: [pose.x, pose.y, pose.z],
    quaternion: [pose.qx, pose.qy, pose.qz, pose.qw]
  };
}

function parseEdMesh(mesh) {
  const vertices = [];
  for (const vertex of mesh.vertices) {
    vertices.push(vertex.x);
    vertices.push(vertex.y);
    vertices.push(vertex.z);
  }

  const faces = [];
  for (const triangle of mesh.triangles) {
    faces.push(triangle.i1);
    faces.push(triangle.i2);
    faces.push(triangle.i3);
  }

  return {vertices, faces};
}

export default Ed;
