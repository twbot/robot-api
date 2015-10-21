/* eslint key-spacing: 0 */
/* eslint no-multi-spaces: 0 */

import mapValues from 'lodash/object/mapValues';

/*
|   Name  | Homeable | HomeableMandatory | Resetable |
|---------|----------|-------------------|-----------|
| Base    | no       | no                | yes       |
| Spindle | yes      | yes               | yes       |
| Arm     | yes      | no                | yes       |
| Head    | no       | no                | no        |
*/

// transform the array of bools to an object
const properties = mapValues({
  /* eslint camelcase:0 */
  // Name     | Homeable |  HomeableMandatory | Resetable
  all:        [true,        false,              true],
  base:       [false,       false,              true],
  spindle:    [true,        true,               true],
  left_arm:   [true,        false,              true],
  right_arm:  [true,        false,              true],
  head:       [false,       false,              false]
}, v => {
  return {
    homeable: v[0],
    homeable_mandatory: v[1],
    resetable: v[2]
  };
});

export default properties;
