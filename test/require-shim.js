/* eslint no-var: 0 */

window.require = function require(path) {
  var load;
  switch (path) {
    case 'roslib':
      load = window.ROSLIB;
      break;
    case '..':
      load = window.API;
      break;
    case 'sinon-chai':
      load = function sinonChaiMock() {
        // noop because sinon-chai loads itself
      };
      break;
    default:
      load = window[path];
  }

  if (typeof load === 'undefined') {
    console.warn('module not found:', path);
  }
  return load;
};
