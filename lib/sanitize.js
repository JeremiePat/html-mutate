'use strict'

// Data helpers
// ----------------------------------------------------------------------------

function stringify (value) {
  if (typeof value === 'string') {
    return value
  }

  if (value === +value) {
    return String(value)
  }

  return ''
}

function positiveInteger (value) {
  return Math.max(0, Math.round(Number(value)) || 0)
}

const SANITIZER = {
  attr: stringify,
  clone: positiveInteger,
  append: stringify,
  prepend: stringify,
  replace: stringify
}

// Main sanitizer
// ----------------------------------------------------------------------------

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
  if (typeof value === 'string' || value === +value) {
    return { replace: stringify(value) }
  }

  if (!value) {
    return null
  }

  if ('clone' in value) {
    value['attr:id'] = null
  }

  return Object.keys(value).reduce((obj, key) => {
    var [type] = key.split(':')

    if (SANITIZER[type]) {
      obj[key] = SANITIZER[type](value[key])
    }

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

module.exports = getValueAccessor
