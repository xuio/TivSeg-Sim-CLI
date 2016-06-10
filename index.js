var request = require('request');
var FormData = require('form-data');

var dataString = 'kurs=Mi1400A02&passwort=abc.123-de';

var options = {
	url: 'http://simplify.itiv.kit.edu/tivseg-sim/checklogin',
	method: 'POST',
	headers: {
		'Origin': 'http://simplify.itiv.kit.edu',
		'Accept-Encoding': 'gzip, deflate',
		'Accept-Language': 'en-US,en;q=0.8,de-DE;q=0.6,de;q=0.4',
		'Upgrade-Insecure-Requests': '1',
		'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36',
		'Content-Type': 'application/x-www-form-urlencoded',
		'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
		'Cache-Control': 'max-age=0',
		'Referer': 'http://simplify.itiv.kit.edu/tivseg-sim/root',
		'Connection': 'keep-alive'
	},
	body: 'kurs=Mi1400A02&passwort=abc.123-de'
};

function callback(error, response, body) {
	var sessionCookie = response.headers['set-cookie'][response.headers['set-cookie'].length - 1];
	sessionCookie = sessionCookie.split(';');
	sessionCookie = sessionCookie[0];
	console.log(sessionCookie);
	request({
		url: 'http://simplify.itiv.kit.edu/tivseg-sim/root',
		headers: {
			'Accept-Language': 'en-US,en;q=0.8,de-DE;q=0.6,de;q=0.4',
			'Upgrade-Insecure-Requests': '1',
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36',
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
			'Referer': 'http://simplify.itiv.kit.edu/tivseg-sim/root',
			'Connection': 'keep-alive',
			'Cache-Control': 'max-age=0',
			'Cookie': sessionCookie
		}
	}, function(error, response, body){
		console.log(body);
	});
}

request(options, callback);

//////

function callback(error, response, body) {
	if (!error && response.statusCode == 200) {
		console.log(body);
	}
}

request(options, callback);

var form = new FormData();

form.append("folder_id", "0");
form.append("filename", fs.createReadStream(path.join(__dirname, "image.png")));

form.getLength(function(err, length){
	if (err) {
		return requestCallback(err);
	}

	var req = request.port({
		url: 'http://simplify.itiv.kit.edu/tivseg-sim/uploadfile',
		method: 'POST',
		headers: {
			'Origin': 'http://simplify.itiv.kit.edu',
			'Accept-Encoding': 'gzip, deflate',
			'Accept-Language': 'en-US,en;q=0.8,de-DE;q=0.6,de;q=0.4',
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36',
			'Content-Type': 'multipart/form-data;',
			'Accept': 'application/json, text/javascript, */*; q=0.01',
			'Referer': 'http://simplify.itiv.kit.edu/tivseg-sim/root',
			'X-Requested-With': 'XMLHttpRequest',
			'Connection': 'keep-alive',
			'Cookie': sessionCookie
		},
		body: dataString
	},function(){

  });

  var r = request.post('http://simplify.itiv.kit.edu/tivseg-sim/uploadfile', requestCallback);
  r._form = form;     
  r.setHeader('content-length', length);

});

function requestCallback(err, res, body) {
  console.log(body);
}



/*
function upload(){
	var request = require('request');

var headers = ;

var dataString = '$------WebKitFormBoundaryqYfuBeXclBw0FLWv\r\nContent-Disposition: form-data; name="userfile"; filename="Motor.cpp"\r\nContent-Type: application/octet-stream\r\n\r\n\r\n------WebKitFormBoundaryqYfuBeXclBw0FLWv--\r\n';

var options = {
		url: 'http://simplify.itiv.kit.edu/tivseg-sim/uploadfile',
		method: 'POST',
		headers: headers,
		body: dataString
};

function callback(error, response, body) {
		if (!error && response.statusCode == 200) {
				console.log(body);
		}
}

request(options, callback);
}
*/

