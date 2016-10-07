'use strict'

// Modules
// ----------------------------------------------------------------------------
const fs = require('fs')
const trumpet = require('trumpet')
const { Readable, Transform } = require('stream')
const concat = require('./lib/concat')

// Custom Transform for HTML elements
// ----------------------------------------------------------------------------

class Append extends Transform {
  constructor (value) {
    super()
    this.value = String(value)
  }

  _transform (buf, _, cb) {
    cb(null, buf)
  }

  _flush (cb) {
    this.push(this.value)
    cb()
  }
}

class Replace extends Transform {
  constructor (value) {
    super()
    this.value = String(value)
  }

  _transform (buf, _, cb) {
    cb()
  }

  _flush (cb) {
    this.push(this.value)
    cb()
  }
}

class Clone extends Transform {
  constructor (nbr) {
    super()
    this.nbr = Math.max(0, Number(nbr) || 0)
    this.store = []
  }

  _transform (buf, _, cb) {
    this.store.push(buf.toString())
    cb(null, buf)
  }

  _flush (cb) {
    while (this.nbr > 0) {
      this.store.forEach((str) => {
        this.push(str)
      })
      this.nbr -= 1
    }

    cb()
  }
}

// Helpers
// ----------------------------------------------------------------------------

function keyType (key) {
  if (key === 'replace') { return 'string' }
  if (key === 'prepend') { return 'string' }
  if (key === 'append') { return 'string' }
  if (key === 'clone') { return 'number' }

  if (key.slice(0, 5) === 'attr:') { return 'string' }
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
      obj[key] = Math.max(0, Math.round(Number(val)) || 0)
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

  Object.keys(data).forEach(function (selector) {
    var value = valueAccessor(data[selector])

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
        let replace = new Replace(val.replace)
        queue = queue.pipe(replace)
      }

      if ('clone' in val) {
        let clone = new Clone(val.clone)
        queue = queue.pipe(clone)

        val['attr:id'] = null
      }

      if ('append' in val) {
        let append = new Append(val.append)
        queue = queue.pipe(append)
      }

      queue.pipe(stream)

      Object.keys(val).forEach(function (key) {
        var [, attr] = key.split(':')
        if (!attr) { return }

        var aVal = val[key]

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
