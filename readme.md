HTML Mutate
===============================================================================

Manipulate HTML on the fly and inject data using [simple CSS selectors](https://github.com/chrisdickinson/cssauron)


Install
-------------------------------------------------------------------------------

```bash
$ npm i html-mutate
```

Module API
-------------------------------------------------------------------------------

### `module(path)`

Return a `html` function.

`path` is the path to the HTML file that will be used as a template.

```javascript
const mutate = require('html-mutate')

const html = mutate('myFile.html')
```

If `path` isn't a valid path to a file, it will be considered being an HTML
string and will be used as such. This let you choose if you prefer to load some
HTML from a file or to craft your own.

```javascript
const mutate = require('html-mutate')

const html = mutate('<!DOCTYPE html><title></title><main></main>')
```

### `html(data)`

Return a readable stream of the resulting HTML file

`data` are the data that will be injected into the HTML, see below to learn
more about the expected data format

```javascript
const fs     = require('fs')
const mutate = require('html-mutate')
const data   = require('./data.json')

const html = mutate('./base.html')

html(data).pipe(fs.createWriteStream('./index.html'))
```

### `html.callback(data, fn)`

`fn` is a callback function that will be called once the `data` would have been
injected into the HTML flow. It follows node conventions for callback with the
following signature: `fn(err, html)` where `err` is a possible [Error](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)
object and `html` the successful transformed HTML content.

```javascript
const fs     = require('fs')
const mutate = require('html-mutate')
const data   = require('./data.json')

const html = mutate('./base.html')

html.callback(data, (err, newHTML) => {
  if (err) { throw err }

  fs.writeFile('./index.html', newHTML)
})
```

### `html.promise(data)`

Return a Promise where the success callback will get the transformed HTML

```javascript
const fs     = require('fs')
const mutate = require('html-mutate')
const data   = require('./data.json')

const html = mutate('./base.html')

html.promise(data).then(newHTML => {
  fs.writeFile('./index.html', newHTML)
}, (err) => {
  throw err
})
```

### `html.inject(data)`

Return a ([Trumpet](https://github.com/substack/node-trumpet)) transform stream
that will inject data into any HTML read stream. This is especially handy to
chain data injection or to output several file out of one template.

```javascript
const fs     = require('fs')
const mutate = require('html-mutate')
const data1  = require('./data1.json')
const data2  = require('./data2.json')

const html   = mutate('./base.html')
const stream = html({})

stream
  .pipe(html.inject(data1))
  .pipe(fs.createWriteStream('./index.html'))

stream
  .pipe(html.inject(data2))
  .pipe(fs.createWriteStream('./page.html'))
```

As the stream produced is a [Trumpet](https://github.com/substack/node-trumpet)
stream it allows to add custom transform behaviors:

```javascript
const fs     = require('fs')
const mutate = require('html-mutate')
const data1  = require('./data1.json')

const ROOT = 'http://localhost/'

const template = mutate('./base.html')
const stream   = template({})

// Replace any $ symbol at the begining
// of a URL by a given value
const updateURL = template.inject({})

updateURL.selectAll('[href]', (elem) => {
  elem.getAttribute('href', (val) => {
    elem.setAttribute('href', val.replace(/^\$\//, ROOT))
  })
})

stream
  .pipe(template.inject(data1))
  .pipe(updateURL)
  .pipe(fs.createWriteStream('./index.html'))
```

As another example, it can be use to create a simple partial inclusion
mechanism:

```javascript
const fs     = require('fs')
const path   = require('path')
const mutate = require('html-mutate')
const data1  = require('./data1.json')

const template = mutate('./base.html')
const stream   = template({})

const inclusion = template.inject({})

// Use a custom <inc src="path/to/partial" />
// tag to deal with inclusion
inclusion.selectAll('inc[src]', (elem) => {
  elem.getAttribute('src', (src) => {
    var DEST = elem.createWriteStream({outer: true})
    var SRC = fs.createReadStream(src)

    SRC.pipe(DEST)
  })
})

stream
  .pipe(inclusion)
  .pipe(template.inject(data1))
  .pipe(fs.createWriteStream('./index.html'))
```

Data magic
-------------------------------------------------------------------------------

The template magic is based on the data format used. Data are a collection of
key/value pair where the key is a valid CSS selector and the value is an object
(or array of object) defining the data to be injected and how to inject them.

a value Object can have one or more of the following properties:

- `replace` : The new HTML content for the element
- `append`  : The HTML content to put after the current content
- `prepend` : The HTML content to put before the current content
- `clone`   : The number of clones of the current element to create
- `attr:*`  : The new content for the attribute `*` (where `*` is the name of
              the targeted attribute)

### Replacing element content

```javascript
const mutate = require('html-mutate')

const html = mutate('<body>Hi!</body>')

const data = {
  'body': {
    replace: '<p>Hello world!</p>'
  }
}

html(data).pipe(process.stdout)

// Output:
// <body><p>Hello world!</p></body>
```

For a simple straight replacement, you can use a compact syntax:

```javascript
const mutate = require('html-mutate')

const html = mutate('<body>Hi!</body>')

const data = {
  'body': '<p>Hello world!</p>'
}

html(data).pipe(process.stdout)

// Output:
// <body><p>Hello world!</p></body>
```

> **NOTE:** _Using the value `null` will remove the element if it exists_

### Append or prepend content to element

```javascript
const mutate = require('html-mutate')

const html = mutate('<body>Hello world!</body>')

const data = {
  'body': {
    prepend: '<p>Hi!</p>',
    append : '<p>Bye!</p>'
  }
}

html(data).pipe(process.stdout)

// Output:
// <body><p>Hi!</p>Hello world!<p>Bye!</p></body>
```

### Selector matching more than one element

If a selector match more than one element, the object value will be used for
all of them. However, if the value is an Array, each value of the Array will be
successively used to alter the elements.

If there are more elements than values then the extra elements will be altered
using the last available value.

```javascript
const mutate = require('html-mutate')

const html = mutate([
  '<ul>',
  '  <li>A</li>',
  '  <li>B</li>',
  '  <li>C</li>',
  '  <li>D</li>',
  '  <li>E</li>',
  '</ul>'
].join('\n'))

const data = {
  'li': [
    { replace: 1 },
    { replace: 2 },
    { replace: 3 }
  ]
}

html(data).pipe(process.stdout)

// Output:
// <ul>
//   <li>1</li>
//   <li>2</li>
//   <li>3</li>
//   <li>3</li>
//   <li>3</li>
// </ul>
```

Again, for a straight replacement, you can use a more compact syntax:

```json
{
  "li": [1, 2, 3]
}
```

### Replacing attributes content

It is possible to replace attribute content rather than element content.
To do this, use the key `attr:*` in the value object where `*` is the name of
the attribute to change.

```javascript
const mutate = require('html-mutate')

const html = mutate([
  '<head>',
  '<meta name="description">',
  '<meta name="robots" content="index, follow">',
  '</head>'
].join('\n'))

const data = {
  'meta[name=description]': {
    'attr:content': 'Hello World'
  }
}

html(data).pipe(process.stdout)

// Output
// <head>
// <meta name="description" content="Hello World">
// <meta name="robots" content="index, follow">
// </head>
```

> **NOTE:** _Using the value `null` will remove the attribute if it exists_

### Duplicating and replacing elements

Elements can be duplicate using the key `clone`. Its value is a number
indicating the number of clones to produce

```javascript
const mutate = require('html-mutate')

const html = mutate('<span id="wtf">Hi!</span>\n')

const data = {
  "span": { clone: 2 }
}

html(data).pipe(process.stdout)

// Output:
// <span>Hi!</span><span>Hi!</span><span>Hi!</span>\n
```

> **NOTE:** _When using clone, if the target element has an `id` attribute,
            this attribute is removed. Duplicate ids can lead to some tricky
            issues with CSS or JS. If you are duplicating an element with an id
            there is a high chance you are doing something very nasty, and you
            shouldn't._

Rather than duplicating an element, it is possible to replace it using
`clone:0` with `replace` to define the new element:

```javascript
const mutate = require('html-mutate')

const html = mutate('<span>Hi!</span>\n')

const data = {
  "span": {
    clone: 0
    replace: "<strong>Hello</strong>"
  }
}

html(data).pipe(process.stdout)

// Output:
// <strong>Hello</strong>\n
```

More examples?
-------------------------------------------------------------------------------

Just look at the [tests](./test) ;)

But for a more real life example, here what it is possible to do:

Giving the following HTML file `base.html`

```html
<!DOCTYPE html>
<meta charset="utf8">
<title>To do list</title>

<main>
  <h1>What should be done</h1>
  <ul>
    <li>Write some HTML</li>
    <li>Save the world</li>
  </ul>
</main>
```

Applying the following transformation

```javascript
const fs     = require('fs')
const mutate = require('html-mutate')

const html = mutate('./base.html')

const DATA1 = {
  'h1': 'What have been be done',
  'li:first-child': {
    clone: 1,
    append: [
      '</ul>',
      '<h2>What remains</h2>',
      '<ul>'
    ].join('')
  }
}

const DATA2 = {
  'h1 + ul li': [{
    'attr:class': 'done',
    replace: 'Wrote some HTML'
  }, {
    'attr:class': 'in-progress',
    replace: 'Wrote some JavaScript'
  }]
}

html({})
  .pipe(html.inject(DATA1))
  .pipe(html.inject(DATA2))
  .pipe(fs.createWriteStream('./todo.html'))
```

You'll get the following (beautified) result within `todo.html`

```html
<!DOCTYPE html>
<meta charset="utf8">
<title>To do list</title>

<main>
  <h1>What have been done</h1>
  <ul>
    <li class="done">Wrote some HTML</li>
    <li class="in-progress">Wrote some JavaScript</li>
  </ul>
  <h2>What remains</h2>
  <ul>
    <li>Save the world</li>
  </ul>
</main>
```
