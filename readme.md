HTML Mutate
===============================================================================

Manipulate HTML on the fly and inject data using simple CSS selectors


Install
-------------------------------------------------------------------------------

```bash
$ npm i html-mutate
```

Module API
-------------------------------------------------------------------------------

### `module(path)`

Return a `template` function.

`path` is the path to the HTML file that will be used as a template.

```javascript
var mutate = require('html-mutate')

var template = mutate('myFile.html')
```

If `path` isn't a valid path to a file, it will be considered being an HTML
string and will be used as such. This let you choose if you prefer to load some
HTML from a file or to craft your own.

```javascript
var mutate = require('html-mutate')

var template = mutate('<!DOCTYPE html><title></title><main></main>')
```

### template(data)

Return a readable stream of the resulting HTML file

`data` are the data that will be injected into the HTML, see below to learn
more about the expected data format

```javascript
const fs     = require('fs')
const mutate = require('html-mutate')
const data   = require('./data.json')

const template = mutate('./base.html')

template(data).pipe(fs.createWriteStream('./index.html'))
```

### template.callback(data, fn)

`fn` is a callback function that will be called once the `data` would have been
injected into the HTML flow. It follows node conventions for callback with the
following signature: `fn(err, html)` where `err` is a possible [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)
object and `html` the successful transformed HTML

```javascript
const fs     = require('fs')
const mutate = require('html-mutate')
const data   = require('./data.json')

const template = mutate('./base.html')

template.callback(data, (err, html) => {
  if (err) { throw err }

  fs.writeFile('./index.html', html)
})
```

### template.promise(data)

Return a Promise where the success callback will get the transformed HTML

```javascript
const fs     = require('fs')
const mutate = require('html-mutate')
const data   = require('./data.json')

const template = mutate('./base.html')

template.promise(data).then((html) => {
  fs.writeFile('./index.html', html)
}, (err) => {
  throw err
})
```

### template.inject(data)

Return a transform stream that will inject data into any HTML read stream. This
is especially handy to chain data injection or to output several file out of
one template.

```javascript
const fs     = require('fs')
const mutate = require('html-mutate')
const data1  = require('./data1.json')
const data2  = require('./data2.json')

const template = mutate('./base.html')
const stream   = template({})

stream
  .pipe(template.inject(data1))
  .pipe(fs.createWriteStream('./index.html'))

stream
  .pipe(template.inject(data2))
  .pipe(fs.createWriteStream('./page.html'))
```

Data magic
-------------------------------------------------------------------------------

The template magic is based on the data format used. Data are a collection of
key/value pair where the key is a valid CSS selector and the value is an object
(or array of object) defining the data to be injected and how to inject them.

### Replacing element content

```json
{
  "main": {
    "replace": "<p>Hello world!</p>"
  }
}
```

For a straight replacement, you can use a compact syntax:
```json
{
  "main": "<p>Hello world!</p>"
}
```

> **NOTE:** _Using the value `null` will remove the element if it exists_

### Append or prepend content to element

```json
{
  "main": {
    "prepend": "<p>Hi!</p>",
    "append" : "<p>Bye!</p>"
  }
}
```

### Selector matching more than one element

If a selector match more than one element, the object value will be used for
all of them. However, if the value is an Array, each value of the Array will be
successively used to alter the elements.

If there are more elements than values then the extra elements will be altered
using the last available value.

```json
{
  ".page": [
    {"replace": 1},
    {"replace": 2},
    {"replace": 3},
    {"replace": 4},
    {"replace": 5},
  ]
}
```

Again, for a straight replacement, you can use a more compact syntax:

```json
{
  ".page": [1, 2, 3, 4, 5]
}
```

### Replacing attributes content

It is possible to replace attribute content rather than element content.
To do this, use the key `attr:*` in the value object where `*` is the name of
the attribute to change.

```json
{
  "meta[name=description]": {
    "attr:content": "Hello World"
  }
}
```

> **NOTE:** _Using the value `null` will remove the attribute if it exists_

### Duplicating and replacing elements

Elements can be duplicate using the key `clone`. Its value is a number
indicating the number of clones to produce

```javascript
const mutate = require('html-mutate')

var html = mutate('<span id="wtf">Hi!</span>\n')

html({node
  "span": { clone: 2 }
}).pipe(process.stdout)

// Output: <span>Hi!</span><span>Hi!</span><span>Hi!</span>\n
```

> **NOTE:** _When using clone, if the target element has an `id` attribute,
            this attribute is removed. Duplicate ids can lead to some tricky
            issues with CSS or JS. If you are duplicating an element with an id
            there is a high chance you are doing something very nasty, and you
            shouldn't._

Rather than duplicating an element, it is possible to replace it using
`clone:0` with `replace` to define the new element (or to remove it if you use
`replace:null`):

```javascript
const mutate = require('html-mutate')

var html = mutate('<span>Hi!</span>\n')

html({node
  "span": {
    clone: 0
    replace: "<strong>Hello</strong>"
  }
}).pipe(process.stdout)

// Output: <strong>Hello</strong>\n
```

More examples?
-------------------------------------------------------------------------------

Just look at the [tests](./test) ;)
