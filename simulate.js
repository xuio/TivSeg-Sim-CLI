'use strict';

const Request = require('request');
// require('request-debug')(Request);
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const MultipartStream = require('multipart-stream');
const config = require('config');
const html2json = require('html2json').html2json;
const curl = require('curlrequest');

const browser = config.get('browser');
const simulator = config.get('simulator');

let sessionCookie = '';

const requestC = curl.request({
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
			console.log(body);
			if (error) {
				reject(error);
			} else {
				sessionCookie = response.headers['set-cookie'][response.headers['set-cookie'].length - 1];
				sessionCookie = sessionCookie.split(';');
				sessionCookie = sessionCookie[0];
				resolve();
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

// "baseurl": "http://simplify.itiv.kit.edu/tivseg-sim",

function uploadFile(filePath) {
	return new Promise((resolve, reject) => {
		const stream = new MultipartStream();
		stream.addPart({
			headers: {
				'Content-Disposition': `form-data; name="userfile"; filename="${path.basename(filePath)}"`,
				'Content-Type': 'application/octet-stream',
			},
			body: fs.createReadStream(filePath)// (`${__dirname}/Motor.cpp`)
		});
		let data;
		MultipartStream.on('data', (d) => {
			data += d;
		}).on('end', () => {
			requestC({
				url: `${simulator.baseurl}/uploadfile`,
				method: 'POST',
				headers: {
					'Content-Type': `multipart/form-data; boundary=${stream.boundary}`,
					Accept: 'application/json, text/javascript, */*; q=0.01',
					'X-Requested-With': 'XMLHttpRequest',
					Connection: 'keep-alive',
					Cookie: sessionCookie
				},
				body: data,
			}, (error, response, body) => {
				// console.log(response);
				if (error) {
					console.error(error);
					reject(Error(error));
				} else {
					resolve(body);
				}
			});
		});
	});
}

function check() {
	return new Promise((resolve, reject) => {
		request({
			url: `${simulator.baseurl}/check?_=${Date.now()}`,
			method: 'GET',
			headers: {
				Accept: 'text/plain, */*; q=0.01',
				Cookie: sessionCookie
			}
		}, (error, response, body) => {
			if (error) {
				reject();
			} else {
				const obj = JSON.parse(body);
				resolve(obj);
			}
		});
	});
}

function currentStep() {
	return new Promise((resolve, reject) => {
		request({
			url: `${simulator.baseurl}/current-step?_=${Date.now()}`,
			method: 'GET',
			headers: {
				Accept: 'text/plain, */*; q=0.01',
				Cookie: sessionCookie
			}
		}, (error, response, body) => {
			if (error && (body.indexOf('bInvalid credentials. Your session may have expired.') !== -1)) {
				reject();
			} else {
				console.log(body);
				const obj = JSON.parse(body);
				resolve(obj);
			}
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
				const obj = []; // output object
				json.forEach((element) => {
					if (element.hasOwnProperty('child')) {
						element.child.forEach((elementChild) => {
							if (elementChild.node === 'element' && elementChild.attr.class === 'files_hidden_id') {
								obj.push({
									file: elementChild.attr.id,
									id: elementChild.attr.value,
								});
							}
						});
					}
				});
				resolve(obj);
			}
		});
	});
}

// {check, projects,check,current-step,check,2,check,current-step,check,current-step,check,components,check,current-step,check,components-arch, check,current-step,check,current-step,check,current-step,check,applications,check,current-step}

function poll(index, done) {
	console.log(`${index}:${simulator.prepare[index]}`);
	requestC({
		url: `${simulator.baseurl}/${simulator.prepare[index]}?_=${Date.now()}`,
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
		if (index === (simulator.prepare.length - 1)) {
			console.log('poll end');
			return done();
		}
		return poll(index + 1, done);
	});
}

// do stuff
login()
.then(() => {
	console.log(`got session: ${sessionCookie}`);
	return testHomepage();
}, () => {
	console.log('ERROR 1');
	return false;
})
.then(() => {
	console.log('login successful');
	return currentStep();
}, () => {
	console.log('ERROR 2');
	return false;
})
.then((obj) => {
	console.log(obj);
	return check();
}, () => {
	console.log('ERROR 3');
	return false;
})
.then(() => {
	console.log('starting prepare');
	return poll(0, () => {
		getFileMap()
		.then((obj) => {
			console.log(obj);
		});
	});
}, () => {
	console.log('ERROR 4');
	return false;
});
/*	return uploadFile(`${__dirname}/Motor.cpp`);
})
.then((body) => {
	console.log(body);
});*/

// {"error":null,"files":[],"file":{"tmpfile":"~tmp_9f410c19d62be11029ef19ed1360f0b9","filename":"PWM.h"}}
