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
    this.store = ['\n']
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

    if (key === 'clone') {
      obj[key] = Math.max(0, Number(value[key]) || 0)
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

      var stream = elem.createStream({outer: ('clone' in val)})
      var queue = stream

      if ('clone' in val) {
        let clone = new Clone(val.clone)
        queue = queue.pipe(clone)
      }

      if ('prepend' in val) { queue.write(val.prepend) }

      if ('replace' in val) {
        let replace = new Replace(val.replace)
        queue = queue.pipe(replace)
      }

      if ('append' in val) {
        let append = new Append(val.append)
        queue = queue.pipe(append)
      }

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
