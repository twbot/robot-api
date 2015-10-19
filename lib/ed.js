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
  query(callback) {
    const request = new ServiceRequest({
      /* eslint camelcase:0 */
      // string[] ids
      // string[] properties
      since_revision: this.revision
    });

    console.time('ed.query');
    this.queryService.callService(request, response => {
      console.timeEnd('ed.query');

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
      this._updateEntities(data.entities);
      console.timeEnd('ed.updateEntities');

      callback && callback();
    }, error => {
      console.log(`ed:query callService ${this.name} failed:`, error);
    });
  }

  watch(callbacks) {
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

  _updateEntities(entities) {
    const add = [];
    const update = [];
    const remove = [];

    for (const entity of entities) {
      const id = entity.id;
      const newObj = {id};

      if (this.entities.has(id)) {
        // update object
        const oldObj = this.entities.get(id);

        if (entity.hasOwnProperty('pose')) {
          const {position, quaternion} = parseEdPosition(entity.pose);
          newObj.position = position;
          newObj.quaternion = quaternion;
        } else {
          // use the old position
          oldObj.position && (newObj.position = oldObj.position);
          oldObj.quaternion && (newObj.quaternion = oldObj.quaternion);
        }

        if (entity.hasOwnProperty('mesh')) {
          const {vertices, faces} = parseEdMesh(entity.mesh);
          newObj.vertices = vertices;
          newObj.faces = faces;
        } else {
          // use the old mesh
          oldObj.vertices && (newObj.vertices = oldObj.vertices);
          oldObj.faces && (newObj.faces = oldObj.faces);
        }

        this.entities.set(id, newObj);

        const props = ['position', 'quaternion', 'vertices', 'faces'];
        if (props.every(key => key in newObj)) {
          update.push([newObj, oldObj]);
        } else {
          console.warn('incomplete object:', newObj);
        }
      } else {
        // add object

        if (entity.hasOwnProperty('pose')) {
          const {position, quaternion} = parseEdPosition(entity.pose);
          newObj.position = position;
          newObj.quaternion = quaternion;
        }

        if (entity.hasOwnProperty('mesh')) {
          const {vertices, faces} = parseEdMesh(entity.mesh);
          newObj.vertices = vertices;
          newObj.faces = faces;
        }

        this.entities.set(id, newObj);

        const props = ['position', 'quaternion', 'vertices', 'faces'];
        if (props.every(key => key in newObj)) {
          add.push(newObj);
        } else {
          console.warn('incomplete object:', newObj);
        }
      }
    }

    // TODO: parse 'remove_entities'

    // invoke callbacks
    for (const data of add) {
      this.emit('entities.add', ...data);
    }
    for (const data of update) {
      this.emit('entities.update', data);
    }
    for (const data of remove) {
      this.emit('entities.remove', data);
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
    vertices.push([
      vertex.x,
      vertex.y,
      vertex.z
    ]);
  }

  const faces = [];
  for (const triangle of mesh.triangles) {
    faces.push([
      triangle.i1,
      triangle.i2,
      triangle.i3
    ]);
  }

  return {vertices, faces};
}

export default Ed;
