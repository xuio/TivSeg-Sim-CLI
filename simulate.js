'use strict';

const Request = require('request');
const fs = require('fs');
const path = require('path');
const MultipartStream = require('multipart-stream');
const config = require('config');
const html2json = require('html2json').html2json;
const curl = require('curlrequest');

// require('request-debug')(Request);

const browser = config.get('browser');
const simulator = config.get('simulator');

let sessionCookie = '';
let fileMap = '';

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

function uploadFile(file) {
	return new Promise((resolve, reject) => {
		const stream = new MultipartStream();
		stream.addPart({
			headers: {
				'Content-Disposition': `form-data; name="userfile"; filename="${file.name}"`,
				'Content-Type': 'application/octet-stream',
			},
			body: fs.createReadStream(file.path)
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
			}, (error, body) => {
				// check if error, curl gives us a strange error message anyway \dirty
				if (error && error !== "Couldn't resolve host. The given remote host was not resolved.") {
					return reject(error);
				}

				// parse response
				body = JSON.parse(body);
				if (body.error === null) {
					return resolve(body);
				}
				return reject(body.error);
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
				// only get first part of response, body does not conform to HTML standart after script tag
				// \WTF
				const toParse = body.split('<script type="text/javascript">')[0];

				// parse html to json
				let json = html2json(toParse);

				// get object we want (html2json is strange)
				json = json.child[1].child[1].child[3].child[3].child[1].child;

				// prototype for output object
				const obj = {};

				// loop over objects
				json.forEach((element) => {
					// only get interesting objects and parse them
					if (element.hasOwnProperty('child')) {
						element.child.forEach((elementChild) => {
							if (elementChild.node === 'element' && elementChild.attr.class === 'files_hidden_id') {
								obj[elementChild.attr.id] = parseInt(elementChild.attr.value, 10);
							}
						});
					}
				});

				// looks like this: {fileName: fileId, ...}
				resolve(obj);
			}
		});
	});
}

function prepare(url) {
	return new Promise((resolve, reject) => {
		process.stdout.write('.'); // console.log with no \n
		requestC({
			url: `${simulator.baseurl}/${url}?_=${Date.now()}`,
			method: 'GET',
			headers: {
				Accept: 'text/plain, */*; q=0.01',
				Cookie: sessionCookie
			}
		}, (error) => {
			if (error) {
				reject(error);
			} else {
				resolve();
			}
		});
	});
}

function urlencodeObj(obj) {
	obj.forEach((element, index, array) => {
		const out = [];
		for (const key in element) {
			if (element.hasOwnProperty(key)) {
				out.push(`toMove[${index}][${encodeURIComponent(key)}]=${encodeURIComponent(element[key])}`);
			}
		}
		array[index] = out.join('&');
	});

	return obj.length > 1 ? obj.join('&') : obj[0];
}

function moveFile(obj) {
	return new Promise((resolve, reject) => {
		const toMoveUrlEncoded = urlencodeObj(obj);
		requestC({
			url: `${simulator.baseurl}/movefiles?_=${Date.now()}`,
			method: 'POST',
			headers: {
				Accept: 'application/json, text/javascript, */*; q=0.01',
				Cookie: sessionCookie
			},
			compressed: true,
			data: toMoveUrlEncoded,
		}, (error, body, meta) => {
			if (error) {
				console.error(error);
				return reject(error);
			}

			body = JSON.parse(body);
			if (body.error) {
				console.error(body.error);
				return reject(body.error);
			}
			return resolve();
		});
	});
}

function compile() {
	return new Promise((resolve, reject) => {
		request({
			url: `${simulator.baseurl}/compile?_=${Date.now()}`,
			method: 'GET',
			headers: {
				Accept: 'text/plain, */*; q=0.01',
				Cookie: sessionCookie
			}
		}, (error, response, body) => {
			if (error){
				console.error(error);
				reject(error);
			} else {
				body = html2json(body);
				let out = [];
				body.child.forEach((child) => {
					if (child.tag === 'script') {
						out.push(child.child);
					}
				});
				const out1 = [];
				out1.push(out[2][0].text);
				out1.push(out[3][0].text);
				return resolve(out1);
			}
		});
	});
}

// fileId, filename, tmpfile -> fileMap[body.file.filename], body.file.filename, body.file.tmpfile
// toMove[0][fileId]=941&toMove[0][tmpfile]=~tmp_96a57111a1af57da16784391fb6c62e0&toMove[0][name]=Motor.cpp
// {"error":null,"files":[],"file":{"tmpfile":"~tmp_9f410c19d62be11029ef19ed1360f0b9","filename":"PWM.h"}}

/* magic starts here */
// login with credentials from config file
login()
.then((sessioncookie) => {
	// got session cookie, log it to the console
	sessionCookie = sessioncookie;
	console.log(`got session: ${sessionCookie}`);
	// request the homepage to test if we are logged in successfully
	return testHomepage();
})
.then(() => {
	console.log('login successful');
	process.stdout.write('preparing simulator');

	// create array of promises we need
	const promises = [];

	// add promise for each prepare upload url
	simulator.prepare.upload.forEach((url) => {
		promises.push(prepare(url));
	});

	// resolve all promises before continuing
	return Promise.all(promises);
}, () => {
	console.error('login failed!');
})
.then(() => { // wtf eslint
	console.log('\ngetting file map');
	return getFileMap();
})
.then((fileMap_) => {
	// hacky workaround, so we can pass it through the next promise
	fileMap = fileMap_;
	// console.log(fileMap);

	// create promises for the files we need to upload
	const promises = [];

	// iterate ofer all files given in settings.simulator.filesToUpload
	simulator.filesToUpload.files.forEach((file_) => {
		const file = {};
		// generate full path to file
		file.path = path.join(simulator.filesToUpload.basedir, file_);
		// extract filename
		file.name = path.basename(file.path);
		// check if file is allowed / has destination ID
		if (fileMap.hasOwnProperty(file.name)) {
			promises.push(uploadFile(file));
		}
	});
	// console.log(promises);
	// upload all files, then resolve
	return Promise.all(promises);
})
.then((obj) => {
	// files are uploaded, let's move them
	// prepare file moving array
	const toMove = [];
	obj.forEach((elem) => {
		toMove.push({
			fileId: fileMap[elem.file.filename],
			tmpfile: elem.file.tmpfile,
			name: elem.file.filename,
		});
	});
	return moveFile(toMove);
}, (error) => {
	console.error(`move error: ${error}`);
})
.then(() => {
	console.log('upload finished');
}, (error) => {
	console.error(error);
})
.then(() => {
	console.log('files moved successfully');
	process.stdout.write('preparing compiler');

	// create array of promises we need
	const promises = [];

	// add promise for each prepare compile url
	simulator.prepare.compile.forEach((url) => {
		promises.push(prepare(url));
	});

	// resolve all promises before continuing
	return Promise.all(promises);
})
.then(() => {
	console.log('\ncompiling');
	return compile();
})
.then((eval_) => {
	eval(eval_[0]);
	eval(eval_[1]);
});
