# Node local HTTP cache

## Usage terminal
```sh
PORT=9090 node server.js
```

In another terminal:
```sh
curl -v "localhost:9090/http://github.com"
```

If `PORT` is not given, it defaults to `8000`.

## Use as middleware

```js
const express = require('express')
const app = express()
const cors = require('./node-cors') // path to this repo

app.use('/prefix-path', cors)

app.listen(8000)
```
