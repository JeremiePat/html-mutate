'use strict'

// Helpers
// ----------------------------------------------------------------------------

function keyType (key) {
  if (key === 'replace') { return 'string' }
  if (key === 'prepend') { return 'string' }
  if (key === 'append') { return 'string' }
  if (key === 'clone') { return 'number' }

  if (key.slice(0, 5) === 'attr:') { return 'string' }

  return false
}

/** Make sure a value is a Value Object with the appropriate key
 *
 * a Value Object is an object with at least one of the following key:
 *
 * - `replace`: {String}
 * - `prepend`: {String}
 * - `append` : {String}
 * - `clone`  : {Integer}
 * - `attr:*` : {String}
 *
 * @param value {Any} The value to sanytize
 * @return {Object||null}
 */
function sanytizeObjectValue (value) {
  if (typeof value === 'string') {
    return {replace: value}
  }

  if (value === +value) {
    return {replace: String(value)}
  }

  if (!value) {
    return null
  }

  return Object.keys(value).reduce((obj, key) => {
    var type = keyType(key)
    var val = value[key]

    if (!type) { return obj }

    if (type === 'string') {
      if (
        // Objects and null are converted to an empty string
        typeof val === 'object' ||

        // Arrays are also converted to an empty string
        Array.isArray(val) ||

        // finaly, Falsy value (except 0) are also converted to an empty string
        (!val && val !== 0)
      ) {
        val = ''
      } else {
        val = String(val)
      }
    } else if (type === 'number') {
      // Number values are Positive Integer
      val = Math.max(0, Math.round(Number(val)) || 0)
    }

    if (key === 'clone') {
      obj['attr:id'] = value['attr:id'] = ''
    }

    obj[key] = val

    return obj
  }, {})
}

function getValueAccessor (value) {
  if (!Array.isArray(value)) {
    value = [value]
  }

  var iter = (function* () {
    var max = value.length - 1
    var pos = 0

    while (true) {
      yield sanytizeObjectValue(value[pos])
      pos = Math.min(pos + 1, max)
    }
  })()

  return function () {
    return iter.next().value
  }
}

// Expose module API
// ----------------------------------------------------------------------------

module.exports = { getValueAccessor }
