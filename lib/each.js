'use strict'

// Make Object/Array iteration "simpler"

module.exports = function each (obj, cb) {
  if (typeof obj !== 'object' || obj === null) { return }

  if (Array.isArray(obj)) {
    obj.forEach(cb())
    return
  }

  Object.keys(obj).forEach(key => cb(key, obj[key], obj))
}
