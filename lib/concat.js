'use strict'

// Modules
// ----------------------------------------------------------------------------
const { Writable } = require('stream')

// Main logic
// ----------------------------------------------------------------------------

/** Provide a writable stream to concat strings into a single string and pass it to a callback
 *
 * @param {Function} A callback function (node style with error as 1st parameter)
 * @return {Writable}
 */
function concat (callback) {
  var body = []

  var ws = new Writable({
    write (chunk, _, next) {
      body.push(chunk)
      next(null, chunk)
    }
  })

  ws.on('error', (err) => callback(err))
  ws.on('finish', () => callback(null, body.join('')))

  return ws
}

// Expose module API
// ----------------------------------------------------------------------------

module.exports = concat
