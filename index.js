const express = require("express");
const axios = require("axios").default;
const Entities = require("html-entities").AllHtmlEntities;
const entities = new Entities();

const app = express();
const port = 8090;

const parentVmixSocial = "http://192.168.50.12:8089";

/// ROUTES
app.use(express.static("."));

app.get("/hello", (req, res) => {
	res.send("hello world");
});

app.get("/data", async (req, res) => {
	await getData(req.query.renew === 1);
	res.json(socialData);
	// res.send(data);
});

/// ?rowId=[id]
app.get("/sendRow", async (req, res) => {
	await sendRow(req.query.rowId);
	res.json(socialData);
	// res.send(data);
});

/// boilerplate
app.listen(port, () => {
	console.log(`Listening on port ${port}`);
});

/// FUNCTIONS and CONSTANTS
var confirmID = "";
var sessionID = guid();
var activeFilter = "";
var currentPage = 1;
var pageCount = 1;
var updateInterval = null;
var viewQueue = false;
const socialData = { fields: [], items: [] };

async function getData(renewSession = false) {
	if (renewSession === true) sessionID = guid();
	let url = `${parentVmixSocial}/update.aspx?sessionID=${sessionID}&filter=&page=${currentPage}&queue=${viewQueue}`;
	let res = await axios.get(url);
	var body = res.data;
	if (body) handleJS(body);
}

function s4() {
	return Math.floor((1 + Math.random()) * 0x10000)
		.toString(16)
		.substring(1);
}
function guid() {
	return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
}

function handleJS(text) {
	// console.log(text);
	eval(text);
	// // first we get the field names from the setHead command
	// var fields = [];
	// var re, res;
	// re = RegExp(/<th>(.*?)<\/th>/g);

	// while (true) {
	//     let m = re.exec(text);
	//     if (m === null) break;
	//     let content = m[1];
	//     if (content != ' ') fields.push(content);
	// }

	// re = RegExp(/(<tr id=)/);
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
	debug();
}
function prependRow(html) {
	// console.log(html);

	// cell contents show up in the odd indexes using this split method
	let cells = html.split(/<td.*?>(.*?)<\/td>/);

	// cells[0] contains the <tr data
	let rowId = cells[0].match(/sendRow\('(.*?)'\)/)[1];

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
	let timeDataAttrib = html.match(/data-date='(.*?)'/)[1];
	let timeData = new Date();
	if (timeDataAttrib) timeData = Date(timeDataAttrib);

	socialData.items.push({
		id: rowId,
		socialImage,
		avatarImage,
		userName,
		message,
		timeString,
		timeData,
		cells: [socialImage, avatarImage, userName, message, timeString],
	});
}
function clearRows() {
	socialData.items = [];
}
function updateTimes() {}
function setPaging(a, b) {}

async function sendRow(id) {
	let res = await axios.get(`${parentVmixSocial}/send.aspx?ID=${id}`);
	console.log(res.data);
}

function debug() {
	console.log(JSON.stringify(socialData));
}
