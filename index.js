'use strict'

// Modules
// ----------------------------------------------------------------------------
const fs = require('fs')
const trumpet = require('trumpet')
const { Readable } = require('stream')

const each = require('./lib/each')
const strm = require('./lib/transform')
const concat = require('./lib/concat')

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

    obj[key] = val

    return obj
  }, {})
}

function valueAccessor (value) {
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

function inject (data) {
  const transform = trumpet()

  each(data, (selector, value) => {
    value = valueAccessor(value)

    transform.selectAll(selector, function (elem) {
      const val = value()

      if (!val) {
        elem.createWriteStream({outer: true}).end('')
        return
      }

      var stream = elem.createStream({outer: ('clone' in val)})
      var queue = stream

      if ('prepend' in val) { queue.write(val.prepend) }

      if ('replace' in val) {
        queue = queue.pipe(strm.replace(val.replace))
      }

      if ('clone' in val) {
        queue = queue.pipe(strm.clone(val.clone))

        val['attr:id'] = null
      }

      if ('append' in val) {
        queue = queue.pipe(strm.append(val.append))
      }

      queue.pipe(stream)

      each(val, (key, aVal) => {
        var [, attr] = key.split(':')
        if (!attr) { return }

        if (!aVal || typeof aVal === 'object') {
          elem.removeAttribute(attr)
        } else {
          elem.setAttribute(attr, aVal)
        }
      })
    })
  })

  return transform
}

function callback (stream, data, cb) {
  stream(data).pipe(concat(cb))
}

function promise (stream, data) {
  return new Promise(function (resolve, reject) {
    stream(data).pipe(concat((err, html) => {
      if (err) { return reject(err) }

      resolve(html)
    }))
  })
}

// Expose module API
// ----------------------------------------------------------------------------

module.exports = function (html) {
  var isFile = false

  try {
    fs.accessSync(html)
    isFile = true
  } catch (e) { }

  function stream (data) {
    var flow

    if (isFile) {
      flow = fs.createReadStream(html).on('error', (err) => { throw err })
    } else {
      flow = new Readable()
      flow.push(html)
      flow.push(null)
    }

    return flow.pipe(inject(data))
  }

  stream.inject = inject
  stream.promise = promise.bind(null, stream)
  stream.callback = callback.bind(null, stream)

  return stream
}
