var http = require('http');
var https = require('https');
var url = require('url');
var fs = require('fs');
var path = require('path');
var sanitize = require('sanitize-filename');

var validURL = /^https?:\/\/[a-z\u00a1-\uffff0-9]+/;

module.exports = app
function app (request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');

  response.on('error', handleError(response, request));
  request.on('error', handleError(response, request));

  if (request.method !== 'GET') {
    // fail
    response.statusCode = 500;
    response.write('Server only support GET requests.');
    response.end();
    return;
  }

  var requestedURL = request.url.slice(1);
  request._cache_filename = path.join(__dirname, "cache", sanitize(requestedURL))
  if (requestedURL === '') {
    // INDEX
    response.write('Usage: http://' + request.headers.host + '/URL');
    response.end();
    return;
  } else if (requestedURL.search(validURL) !== 0) {
    // INVALID URL
    response.statusCode = 500;
    response.write('URL must be valid, got: ' + requestedURL);
    response.end();
    return;
  } else if (fs.existsSync(request._cache_filename)) {
    fs.readFile(request._cache_filename + ".metadata", (err, json) => {
      var metadata = JSON.parse(json)
      response.statusCode = metadata.status
      setHeaders(response, metadata.headers)

      var filestream = fs.createReadStream(request._cache_filename)
      filestream.pipe(response)
    })
  } else {
    // PROXY REQUEST
    var options = url.parse(requestedURL);
    options.headers = stripHeaders(request.headers);

    if (requestedURL.slice(0, 5) === 'https') {
      https.get(options, handleGet(response, request))
          .on('error', handleError(response, request));
    } else {
      http.get(options, handleGet(response, request))
          .on('error', handleError(response, request));
    }
  }
}

function handleError (response, request) {
  return function (err) {
    console.error(err.stack);
    // send error
    response.statusCode = 500;
    response.write('Error.');
    response.end();
  }
}

function handleGet (response, request) {
  var cachestream = fs.createWriteStream(request._cache_filename)
  return function (res) {
    response.statusCode = res.statusCode;

    setHeaders(response, res.headers)

    res.on('data', (data) => {
      response.write(data)
      cachestream.write(data)
    });
    res.on('end', (err) => {
      response.end(err)
      cachestream.end(err)

      fs.writeFile(
        request._cache_filename + ".metadata",
        JSON.stringify({
          status: res.statusCode,
          headers: res.headers,
        }),
        'utf8',
        (err) => console.error(err)
      )
    });
  }
}

function stripHeaders (headers) {
  var strippedHeaders = {};
  for (var header in headers) {
    if (header !== 'host' &&
        header !== 'origin' &&
        headers.hasOwnProperty(header)) {
      strippedHeaders[header] = headers[header];
    }
  }
  return strippedHeaders;
}

function setHeaders(response, headers) {
  for (var header in headers) {
    if (header === 'access-control-allow-origin' || headers.hasOwnProperty(header)) {
      continue;
    }
    response.setHeader(header, headers[header]);
  }
}