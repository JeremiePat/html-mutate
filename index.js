'use strict'

// Modules
// ----------------------------------------------------------------------------
const fs = require('fs')
const trumpet = require('trumpet')
const { Readable } = require('stream')

const each = require('./lib/each')
const strm = require('./lib/transform')
const concat = require('./lib/concat')
const { getValueAccessor } = require('./lib/sanitize')

// Helpers
// ----------------------------------------------------------------------------

function inject (data) {
  const transform = trumpet()

  each(data, (selector, value) => {
    var nextValue = getValueAccessor(value)

    transform.selectAll(selector, (elem) => {
      const val = nextValue()

      if (!val) {
        elem.createWriteStream({outer: true}).end('')
        return
      }

      var stream = elem.createStream({outer: ('clone' in val)})

      stream
        .pipe(strm.replace(val))
        .pipe(strm.prepend(val))
        .pipe(strm.clone(val))
        .pipe(strm.append(val))
        .pipe(stream)

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

// API Wrapper
// ----------------------------------------------------------------------------

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
