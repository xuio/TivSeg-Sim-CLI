'use strict';

const Request = require('request');
const fs = require('fs');
const path = require('path');
const MultipartStream = require('multipart-stream');
const config = require('config');
const html2json = require('html2json').html2json;
const curl = require('curlrequest');

const browser = config.get('browser');
const simulator = config.get('simulator');

let sessionCookie = '';

// request with curl, server returns incomplete headers
const requestC = curl.request({
//	baseUrl: simulator.baseurl,
	useragent: browser.useragent,
	headers: {
		Origin: simulator.baseurl,
		'Accept-Language': 'en-US,en;q=0.8,de-DE;q=0.6,de;q=0.4',
		'Upgrade-Insecure-Requests': '1',
		Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
		Referer: `${simulator.baseurl}/root`,
		'Cache-Control': 'max-age=0',
		Connection: 'keep-alive'
	}
});

const request = Request.defaults({
//	baseUrl: simulator.baseurl,
	headers: {
		Origin: simulator.baseurl,
		'Accept-Language': 'en-US,en;q=0.8,de-DE;q=0.6,de;q=0.4',
		'Upgrade-Insecure-Requests': '1',
		'User-Agent': browser.useragent,
		Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
		Referer: `${simulator.baseurl}/root`,
		'Cache-Control': 'max-age=0',
		Connection: 'keep-alive'
	}
});

function login() {
	return new Promise((resolve, reject) => {
		request({
			url: `${simulator.baseurl}/checklogin`,
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: `kurs=${simulator.login.kurs}&passwort=${simulator.login.passwort}`
		}, (error, response, body) => {
			if (error) {
				reject(error);
			} else {
				let sessioncookie = response.headers['set-cookie'][response.headers['set-cookie'].length - 1];
				sessioncookie = sessioncookie.split(';');
				sessioncookie = sessioncookie[0];
				resolve(sessioncookie);
			}
		});
	});
}


function testHomepage() {
	return new Promise((resolve, reject) => {
		// console.log(sessionCookie);
		request({
			url: `${simulator.baseurl}/root`,
			method: 'GET',
			headers: {
				Cookie: sessionCookie
			}
		}, (error, response, body) => {
			// console.log(body.indexOf(`Eingeloggt als <i>${simulator.login.kurs}</i><br />`));
			if (!error && (body.indexOf(`Eingeloggt als <i>${simulator.login.kurs}</i><br />`) !== -1)) {
				resolve();
			} else {
				reject();
			}
		});
	});
}

function uploadFile(filePath) {
	return new Promise((resolve, reject) => {
		const stream = new MultipartStream();
		stream.addPart({
			headers: {
				'Content-Disposition': `form-data; name="userfile"; filename="${path.basename(filePath)}"`,
				'Content-Type': 'application/octet-stream',
			},
			body: fs.createReadStream(filePath)
		});
		let data;
		stream.on('data', (d) => {
			data += d;
		}).on('end', () => {
			data = data.replace('undefined', '');
			requestC({
				url: `${simulator.baseurl}/uploadfile`,
				method: 'POST',
				headers: {
					'Content-Type': `multipart/form-data; boundary=${stream.boundary}`,
					Accept: 'application/json, text/javascript, */*; q=0.01',
					'X-Requested-With': 'XMLHttpRequest',
					Connection: 'keep-alive',
					Cookie: sessionCookie,
					'Accept-Encoding': 'gzip, deflate',
				},
				'data-binary': data,
				compressed: 'true',
			}, (error, body, meta) => {
				// console.log('%s %s', meta.cmd, meta.args.join(' '));
				if (error) {
					reject(error);
				}
				body = JSON.parse(body);
				console.log(body);
				if ((body[error] != null)){
					resolve(body);
				} else {
					reject(body[error]);
				}
			});
		});
	});
}

function getFileMap() {
	return new Promise((resolve, reject) => {
		request({
			url: `${simulator.baseurl}/applications?_=${Date.now()}`,
			method: 'GET',
			headers: {
				Accept: 'text/plain, */*; q=0.01',
				Cookie: sessionCookie
			}
		}, (error, response, body) => {
			if (error) {
				reject();
			} else {
				const toParse = body.split('<script type="text/javascript">')[0];
				let json = html2json(toParse);
				json = json.child[1].child[1].child[3].child[3].child[1].child;
				const obj = {}; // output object
				json.forEach((element) => {
					if (element.hasOwnProperty('child')) {
						element.child.forEach((elementChild) => {
							if (elementChild.node === 'element' && elementChild.attr.class === 'files_hidden_id') {
								/* obj.push({
									file: elementChild.attr.id,
									id: elementChild.attr.value,
								});*/
								obj[elementChild.attr.id] = parseInt(elementChild.attr.value, 10);
							}
						});
					}
				});
				resolve(obj);
			}
		});
	});
}

function prepare(object, index, done) {
	// console.log(`${index}:${simulator.prepare[index]}`);
	process.stdout.write('.'); // console.log with no \n
	requestC({
		url: `${simulator.baseurl}/${object[index]}?_=${Date.now()}`,
		method: 'GET',
		headers: {
			Accept: 'text/plain, */*; q=0.01',
			Cookie: sessionCookie
		}
	}, (error) => {
		if (error) {
			console.error(error);
			return false;
		}
		if (index === (object.length - 1)) {
			console.log('.');
			return done();
		}
		return prepare(object, index + 1, done);
	});
}

function moveFile(fileId, filename, tmpfile) {
	console.log('move');
	return new Promise((resolve, reject) => {
		console.log('move');
		const toMove = [];
		toMove[0].fileId = fileId;
		toMove[0].tmpfile = tmpfile;
		toMove[0].name = filename;
		request({
			url: `${simulator.baseurl}/movefiles?_=${Date.now()}`,
			method: 'POST',
			headers: {
				Accept: 'application/json, text/javascript, */*; q=0.01',
				Cookie: sessionCookie
			}
		}, (error, response, body) => {
			if (error) {
				console.error(error);
				reject(error);
			}
			console.log(body);
			resolve();
		});
	});
}

// toMove[0][fileId]=941&toMove[0][tmpfile]=~tmp_96a57111a1af57da16784391fb6c62e0&toMove[0][name]=Motor.cpp
// {"error":null,"files":[],"file":{"tmpfile":"~tmp_9f410c19d62be11029ef19ed1360f0b9","filename":"PWM.h"}}
function uploadFiles(fileMap) {
	uploadFile(`${__dirname}/Motor.cpp`)
	.then((body) => {
		console.log(body);
		console.log('asdf');
		return moveFile(fileMap[body.file.filename], body.file.filename, body.file.tmpfile);
	}, (error) => {
		console.log(error);
	})
	.then(() => {
		process.stdout.write('preparing compiler');
		prepare(simulator.prepare.compile, 0, () => {
			console.log('done');
		});
	});
}

// do stuff
login()
.then((sessioncookie) => {
	sessionCookie = sessioncookie;
	console.log(`got session: ${sessionCookie}`);
	return testHomepage();
})
.then(() => {
	console.log('login successful');
	process.stdout.write('preparing simulator');
	return prepare(simulator.prepare.upload, 0, () => {
		getFileMap()
		.then((obj) => {
			console.log(obj);
			uploadFiles(obj);
		});
	});
})
.then((body) => {
	console.log(body);
});
