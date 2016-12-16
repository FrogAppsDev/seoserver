var express = require('express'),
    _url = require('url'),
    app = express(),
    args = process.argv.splice(2),
    port = args[0] !== 'undefined' ? args[0] : 3000,
    config = require('../bin/config'),
    getContent,
    respond;

getContent = function(url, callback, onError) {
    var content = '',
        phantom = require('child_process').spawn('phantomjs', [__dirname + '/phantom-server.js', url]);
    phantom.stdout.setEncoding('utf8');
    phantom.stdout.on('data', function(data) {
        content += data.toString();
    });
    phantom.stderr.on('data', function(data) {
        if (config.verbose) {
            console.log('url: ' + url + ' stderr: ' + data);
        }
    });
    phantom.on('exit', function(code) {
        if (code !== 0) {
            if (config.verbose) {
                console.log('url: ' + url + ' ERROR: PhantomJS Exited with code: ' + code);
            }
            onError(404);
        } else {
            if (config.verbose) {
                console.log(
                    'url: ' + url +
                    ' HTMLSnapshot completed successfully.' +
                    ' Content-Length: ' + content.length
                );
            }
            callback(content);
        }
    });
};

respond = function(req, res) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    var crawlUrl;

    if (req.headers.referer) {
        crawlUrl = req.headers.referer;
    }

    if (req.headers['x-forwarded-host']) {
        var path = req.params[0];
        var queryObjects = _url.parse(req.url, true).query;
        var query = "";

        if (path.charAt(0) === "/") {
            path = path.substring(1, path.length);
        }

        if (Object.keys(queryObjects).length > 0) {
            var params = [];
            for (var k in queryObjects) {
                params.push(k + '=' + queryObjects[k]);
            }
            query = '?' + params.join('&');
        }

        crawlUrl = 'http://' + req.headers['x-forwarded-host'] + '/' + encodeURIComponent(path) + query;
    };

    console.log('url:', crawlUrl);

    getContent(crawlUrl, function (content) {
        res.send(content);
    }, function(status){
        res.send(status)
    });
};

app.get(/(.*)/, respond);
app.listen(port);
