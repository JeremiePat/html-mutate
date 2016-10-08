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

// Expose module API
// ----------------------------------------------------------------------------

module.exports = {
  replace (value) {
    return new Replace(value)
  },

  append (value) {
    return new Append(value)
  },

  clone (value) {
    return new Clone(value)
  }
}
