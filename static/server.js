/*
 * server.js
 * Copyright (C) 2017 Jesse Yang <hello@yjc.me>
 *
 * Distributed under terms of the MIT license.
 */

var express = require('express');
var path = require('path');
var serveStatic = require('serve-static');
var history = require('connect-history-api-fallback');
var staticMiddleware = serveStatic(__dirname);
var compression = require('compression')

app = express();

app.use(staticMiddleware);
app.use(serveStatic(path.posix.join(__dirname, 'root')));
app.use(history({ disableDotRule: true }));
app.use(staticMiddleware);
app.use(compression())

var port = process.env.PORT || 5000;

app.listen(port);

console.log('server started '+ port);
