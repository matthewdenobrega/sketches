//Node modules
var util = require('util'),
    http = require('http'),
    fs = require('fs'),
    url = require('url'),
    queryString = require('querystring');
//Imported modules
var connect = require('connect');

//Config
var port = 1337;

//Content types
var contentTypes = {
    html:'text/html',
    css:'text/css',
    js:'application/javascript',
    json:'application/json'
};

//Connect app to handle http requests
var app = connect()
    .use(function(req, res, next){
        var url_parts = url.parse(req.url, true);

        if(url_parts.pathname == '/') {
            fs.readFile('index.html', function (err, data) {
                if (err) {
                    res.writeHead(404);
                    res.end(JSON.stringify(err));
                    return;
                }
                res.setHeader('content-type', contentTypes['html']);
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.writeHead(200);
                res.end(data);
            });
        }
        else {
            util.puts(url_parts.pathname);
            fs.readFile(url_parts.pathname.substr(1), function (err, data) {
                if (err) {
                    res.writeHead(404);
                    res.end(JSON.stringify(err));
                    return;
                }
                var extension = url_parts.pathname.substring(url_parts.pathname.lastIndexOf('.') + 1, url_parts.length);
                util.puts(extension);
                res.setHeader('content-type', contentTypes[extension]);
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.writeHead(200);
                res.end(data);
            });
        }
    });

http.createServer(app).listen(port);

util.puts('Listening on ' + port + '...');
util.puts('Press Ctrl + C to stop.');