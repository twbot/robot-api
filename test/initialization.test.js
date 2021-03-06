/* eslint no-unused-expressions: 0 */
import chai from 'chai';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);
chai.should();

import {stub} from 'sinon';

import {Base} from '../lib';
import {Ed} from '../lib';
import {Hardware} from '../lib';
import {Head} from '../lib';
import {Robot} from '../lib';

import {Ros} from 'roslib';

const setup = () => {
  const ros = new Ros({
    encoding: 'ascii'
  });

  const robot = {
    ros
  };

  const fixtures = {
    ros,
    robot
  };

  return fixtures;
};

describe('Module initialization', () => {
  let fixtures;

  beforeEach('stub callOnConnection', () => {
    fixtures = setup();
    const callOnConnection = stub(fixtures.ros, 'callOnConnection');
    callOnConnection.throws();
  });

  afterEach('restore callOnConnection', () => {
    fixtures.ros.callOnConnection.restore();
  });

  // TODO: remove skipped modules
  const skipModules = [Hardware, Head];

  [Base, Ed, Hardware, Head].forEach(Module => {
    describe(`${Module.name} initialization`, () => {
      const it2 = skipModules.some(key => key === Module) ? it.skip : it;

      it2('should do nothing on creation', () => {
        const m = new Module(fixtures.robot);

        m.should.be.ok;
        fixtures.ros.callOnConnection.should.not.have.been.called;
      });
    });
  });
});

describe('Robot initialization', () => {
  it('should not crash', () => {
    const robot = new Robot();
    robot.should.be.ok;
  });
});
