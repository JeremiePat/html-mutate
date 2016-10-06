'use strict'

// Modules
// ----------------------------------------------------------------------------
const fs = require('fs')
const trumpet = require('trumpet')
const { Readable, Transform } = require('stream')
const concat = require('./lib/concat')

// Helpers
// ----------------------------------------------------------------------------

const ATTR_RGX = /^attr:[a-z-]+$/

function sanytizeValue (value) {
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
    if (key === 'replace' ||
        key === 'append' ||
        key === 'prepend' ||
        ATTR_RGX.test(key)) {
      obj[key] = value[key]
    }

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
      yield sanytizeValue(value[pos])
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

      const replace = new Transform({
        transform (chunk, _, cb) { cb() },
        flush (cb) { this.push(val.replace); cb() }
      })

      const append = new Transform({
        transform (chunk, _, cb) { cb(null, chunk) },
        flush (cb) { this.push(val.append); cb() }
      })

      var stream = elem.createStream()
      var queue = stream

      if ('prepend' in val) { queue.write(val.prepend) }
      if ('replace' in val) { queue = queue.pipe(replace) }
      if ('append' in val) { queue = queue.pipe(append) }

      queue.pipe(stream)

      Object.keys(val).forEach(function (key) {
        if (!ATTR_RGX.test(key)) { return }

        var attr = key.slice(5)
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
