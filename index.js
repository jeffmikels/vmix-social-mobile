const express = require("express");
const axios = require("axios").default;
const Entities = require("html-entities").AllHtmlEntities;
const entities = new Entities();

const app = express();
const port = 8090;

const parentVmixSocial = "http://192.168.50.12:8089";

var sessionID = guid();
var viewQueue = false;
var firstLoad = true;
const socialData = { fields: [], items: [] };

// getData();
// var refreshInterval = setInterval(getData, 5000);

/// ROUTES
app.use(express.static("."));

app.get("/hello", (req, res) => {
	res.send("hello world");
});

app.get("/data", async (req, res) => {
	console.log("received data request");
	getData(req.query.renew === 1).then(() => {
		res.json(socialData);
	});
});

/// ?rowId=[id]
app.get("/sendRow", async (req, res) => {
	let id = req.query.rowId;
	console.log(`selecting row: ${id}`);
	sendRow(id);
	res.send(`selected row: ${id}`); // DON'T FORGET TO SEND THE RESPONSE!!!
});

/// boilerplate
app.listen(port, () => {
	console.log(`Listening on port ${port}`);
});

/// FUNCTIONS
function getData(renewSession = false, page = 1) {
	if (renewSession === true) {
		sessionID = guid();
		firstLoad = true;
		socialData.fields = [];
		socialData.items = [];
	}
	let url = `${parentVmixSocial}/update.aspx?sessionID=${sessionID}&filter=&page=${page}&queue=${viewQueue}`;
	console.log(url);
	return axios
		.get(url, { timeout: 2000 })
		.then((response) => {
			handleJS(response.data);
		})
		.catch((err) => {
			handleErr(err);
		});
}

function sendRow(id) {
	let url = `${parentVmixSocial}/send.aspx?ID=${id}`;
	console.log(url);
	return axios
		.get(url, { timeout: 2000 })
		.then((response) => {
			console.log(response.data);
		})
		.catch((err) => {
			handleErr(err);
		});
}

function s4() {
	return Math.floor((1 + Math.random()) * 0x10000)
		.toString(16)
		.substring(1);
}
function guid() {
	return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
}

function handleErr(err) {
	console.log(err.code);
	console.log(err.message);
	console.log("=== DON'T WORRY... WE'RE STILL HERE ===");
	// console.log(err.stack);
}

function handleJS(text) {
	// console.log(text);
	eval(text);
	// descending sort, most recent at top
	socialData.items.sort((b, a) => a.timeData - b.timeData);
}

function idExists(id) {
	for (let existing of socialData.items) if (existing.id == id) return true;
	return false;
}

function setHead(html) {
	// console.log(html);
	var re, res;
	re = RegExp(/<th>(.*?)<\/th>/g);
	socialData.fields = [];

	while (true) {
		let m = re.exec(html);
		if (m === null) break;
		let content = m[1];
		if (content != " ") socialData.fields.push(content);
	}
	// debug();
}
function prependRow(html) {
	// console.log(html);

	// cell contents show up in the odd indexes using this split method
	let cells = html.split(/<td.*?>(.*?)<\/td>/);

	// cells[0] contains the <tr data
	let rowId = cells[0].match(/sendRow\('(.*?)'\)/)[1];
	if (idExists(rowId)) return;

	// cells[1] contains the hidden "accepted icon"
	// cells[3] contains the social service icon
	let socialImage = parentVmixSocial + "/" + cells[3].match(/src='(.*?)'/)[1];

	// cells[5] contains the avatar image
	let avatarImage = cells[5].match(/src='(.*?)'/)[1];

	// cells[7] contains the profile name html-entities encoded
	let userName = entities.decode(cells[7]);

	// cells[9] contains the comment string html-entities encoded
	let message = entities.decode(cells[9]);

	// cells[7] contains the time string html-entities encoded
	let timeString = entities.decode(cells[11]);

	// but the real data is in the data-date attribute
	let timeData = new Date(timeString);
	let timeDataAttrib = html.match(/data-date='(.*?)'/)[1];
	if (timeDataAttrib) timeData = new Date(timeDataAttrib);

	let item = {
		id: rowId,
		socialImage,
		avatarImage,
		userName,
		message,
		timeString,
		timeData,
		cells: [socialImage, avatarImage, userName, message, timeString],
	};

	socialData.items.push(item);
}
function clearRows() {
	// socialData.items = [];
}
function updateTimes() {}

// if this is the first load, there might be multiple pages to load
// if this is a subsequent load, all the new data shows up at the top
// so we don't really need to grab data from any other page
function setPaging(pageCount, maxPerPage) {
	if (firstLoad) {
		firstLoad = false;
		for (var page = 2; page <= pageCount; page++) {
			console.log("loading another page... " + page);
			getData(false, page);
		}
	}
}

function debug() {
	console.log(JSON.stringify(socialData));
}
