'use strict'

// Modules
// ----------------------------------------------------------------------------
const { Transform } = require('stream')

// Custom Transform for HTML elements
// ----------------------------------------------------------------------------

// Append a value at the end of the stream
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

// Append a value at the end of the stream
class Prepend extends Transform {
  constructor (value) {
    super()
    this.done = false
    this.value = String(value)
  }

  _transform (buf, _, cb) {
    if (!this.done) {
      this.push(this.value)
      this.done = true
    }

    cb(null, buf)
  }

  _flush (cb) {
    if (!this.done) {
      this.push(this.value)
    } else {
      this.done = true
    }

    cb()
  }
}

// Replace the whole content of a stream be a given value
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

// Clone the content of a stream and push it at the end of the stream
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

class PassThrough extends Transform {
  _transform (buf, _, cb) { cb(null, buf) }
}

// Helpers
// ----------------------------------------------------------------------------

function factory (type, value) {
  if (type === 'clone') { return new Clone(value) }
  if (type === 'append') { return new Append(value) }
  if (type === 'prepend') { return new Prepend(value) }
  if (type === 'replace') { return new Replace(value) }
}

function makeTransformStream (type, value) {
  if (type in value) {
    return factory(type, value[type])
  } else {
    return new PassThrough()
  }
}

// Expose module API
// ----------------------------------------------------------------------------

module.exports = {
  clone: makeTransformStream.bind(null, 'clone'),
  append: makeTransformStream.bind(null, 'append'),
  prepend: makeTransformStream.bind(null, 'prepend'),
  replace: makeTransformStream.bind(null, 'replace')
}
