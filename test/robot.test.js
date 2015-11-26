/* eslint no-unused-expressions: 0 */
import chai from 'chai';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);
chai.should();

import {stub} from 'sinon';

import {Robot} from '../lib';

describe('Robot', () => {
  let connect;
  let robot;

  const exampleUrl = 'ws://example.com:9090';

  beforeEach('stub connect', () => {
    robot = new Robot();
    connect = stub(robot.ros, 'connect');
    connect.returns();
  });

  afterEach('restore connect', () => {
    connect.restore();
  });

  describe('Robot.connect', () => {
    it('should connect to a custom url', () => {
      connect.should.have.not.been.called;
      robot.connect(exampleUrl);
      connect.should.have.been.calledOnce;
      connect.should.have.been.calledWithExactly(exampleUrl);
    });

    it('should connect to a default url', () => {
      connect.should.have.not.been.called;
      robot.connect();
      connect.should.have.been.calledOnce;
      connect.should.have.been.calledWithMatch(/ws:\/\/[a-zA-Z0-9\-]+:9090/);
    });

    it('should remember the previous url', () => {
      connect.should.have.not.been.called;

      robot.connect(exampleUrl);
      connect.should.have.been.calledOnce;

      robot.connect();
      connect.should.have.been.calledTwice;

      connect.should.always.have.been.calledWith(exampleUrl);
    });
  });
});
