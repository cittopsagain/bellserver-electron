const electron = require('electron');
const url = require('url');
const path = require('path');
const appVer = 'Bell Scheduler Version 1.0';
const author = 'Dave Tolentin';

const bellSched = {
	'7520': '7:52:0',
	'7550': '7:55:0',
	'800': '8:0:0',
	'11300': '11:30:0',
	'1200': '12:0:0',
	'12250': '12:25:0',
	'12300': '12:30:0',
	'12550': '12:55:0',
	'1300': '13:0:0',
	'1500': '15:0:0',
	'16300': '16:30:0',
	'16550': '16:55:0',
	'1700': '17:0:0'/* ,
	'17550': '17:55:0',
	'1800': '18:0:0' */
};

const bell = [
	'7520',
	'7550',
	'800',
	'11300',
	'1200',
	'12250',
	'12300',
	'12550',
	'1300',
	'1500',
	'16300',
	'16550',
	'1700'/* ,
	'17550',
	'1800' */
];

// npm install --save-dev electron-packager
// npm run package-linux
const {app, BrowserWindow, Menu, ipcMain, dialog, remote} = electron;

const ipc = electron.ipcRenderer;

let win;
let intervalId;

// electron-packager . --asar

// Listen for app to be ready
app.on('ready', function() {
	// Create new window
	win = new BrowserWindow({});
	
	// Load the html into the window
	win.loadURL(url.format({
		pathname: path.join(__dirname, 'index.html'),
		protocol: 'file:',
		slashes: true
	}));
	
	// win.webContents.openDevTools();
	
	// Quit app when closed
	win.on('closed', function() {
		clearTimeout(intervalId);
		app.quit();
	});
	
	// Build menu from template
	const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
	
	// Insert the menu
	Menu.setApplicationMenu(mainMenu);
	
	app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required'); // audio not allowed before user interaction
	
	// In principle, it is wrong to look for an index of a key. Keys of a hash map are unordered, you should never expect specific order.
	// let index = Object.keys(bellSched).indexOf("1800");
	// let nextBell = nextBellIs('7550');

	ipcMain.on('asynchronous-onload-message', (event, arg) => {
		event.sender.send('asynchronous-onload-reply', {
			onload: true,
			next: getNextBellAfterOnLoadAndReload()
		});
	});
	
	// tickTock();
	
	// console.log(`Next Bell is: ${getNextBellAfterOnLoadAndReload()}`);
});

function tickTock() {
	intervalId = setTimeout(function () {
		let date = new Date();
		let hours = date.getHours();
		let minutes = date.getMinutes();
		let seconds = date.getSeconds();
		
		/**********************
		 *      Routine       *
		 **********************
		 *  0752 = 07:52 AM   *
		 *  0755 = 07:55 AM   *
		 *  0800 = 08:00 AM	  *
		 *  1130 = 11:30 AM   *
		 *  1200 = 12:00 PM   *
		 *  1225 = 12:25 PM   *
		 *  1230 = 12:30 PM   *
		 *  1255 = 12:55 PM   *
		 *  1300 = 01:00 PM   *
		 *  1500 = 03:00 PM   *
		 *  1630 = 04:30 PM   *
		 *  1655 = 04:55 PM   *
		 *  1700 = 05:55 PM   *
		 *  1755 = 05:55 PM   *
		 *  1800 = 06:00 PM   *
		 **********************
		 */
		
		let ourTimeIs = hours+":"+minutes+":"+seconds;
		let find = hours+""+minutes+""+seconds;
		
		if (ourTimeIs == bellSched[find]) {
			// loadAudio(hours+"_"+minutes);
			let nextBell = nextBellIs(find);
	
			ipcMain.on('asynchronous-message', (event, arg) => {
				event.sender.send('asynchronous-reply', {
					currentBell: hours+"_"+minutes,
					nextBell: bellSched[nextBell]
				});
			});
			
			win.reload();
			
			ipcMain.removeListener('asynchronous-message', (event, arg) => {
				
			});
		}

        tickTock();
    }, 1000);
}

function nextBellIs(currentTime) {
	let nextBell = 0;
	for (var i = 0; i < bell.length; i++) {
		if (bell[i] == currentTime) {
			nextBell = bell[i + 1];

			break;
		}
	}

	return (typeof nextBell == 'undefined') ? bell[0] : nextBell;
}

function getNextBellAfterOnLoadAndReload() {
	let d = new Date();
	let h = d.getHours();
	let m = d.getMinutes();
	let s = d.getSeconds();
	let ms = d.getMilliseconds();
	let nextBell = bellSched['7520'];
	// Note: The seconds is not yet considered only the minutes
	
	let eq = [];
	for (let i = 0; i < bell.length; i++) {
		let t = bellSched[bell[i]];
		
		if (parseInt(t.toString().split(':')[0]) < h) {
			continue;
		}
		
		eq.push(bell[i]);
	}
	
	let ss = false;
	for (let i = 0; i < eq.length; i++) {
		let t = bellSched[eq[i]];
		if (h == parseInt(t.toString().split(':')[0])) {
			ss = true;
			break;
		}
	}
	
	// Consider the undefined
	if (! ss) {
		if (typeof bellSched[eq[0]] != 'undefined') {
			nextBell = bellSched[eq[0]];
		}
	} else {
		let trimmed = [];
		for (let i = 0; i < eq.length; i++) {
			let t = bellSched[eq[i]].toString().split(':')[0];			
			if (h == parseInt(t)) {
				trimmed.push(eq[i]);
			}
		}
		
		if (trimmed.length == 1) {
			nextBell = bellSched[nextBellIs(trimmed[0])];
		} else {
			// Compare the minutes
			
			// Time is 4:59 PM 
			// Result with 16:30 PM, 16:55 PM
			let tt = [];
			let greater = [];
			for (let i = 0; i < trimmed.length; i++) {
				let time = bellSched[trimmed[i]];
				let min = time.toString().split(':')[1];
				
				if (m > parseInt(min)) {
					greater.push(trimmed[i]);
				} else {
					tt.push(trimmed[i]);
					break;
				}
			}
			
			if (tt.length == 0) {
				// Get the last index
				nextBell = bellSched[nextBellIs(greater[greater.length - 1])];
			} else {
				nextBell = bellSched[tt];
			}
		}
	}
	
	return nextBell;
}

function loadAudio(time) {
	win.loadURL(url.format({
		pathname: path.join(__dirname, 'index.html'),
		protocol: 'file:',
		slashes: true
	}));
}

let count = 0;
// Create menu template
const mainMenuTemplate = [
	{
		label: 'Play/Stop',
		click() {
			count++;
			
			// (node:30308) MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 
			// 11 status-message listeners added. Use emitter.setMaxListeners() to increase limit
			let msg = '';
			if (count %2 == 0) {
				tickTock();
				
				ipcMain.on('status-message', (event, arg) => {	
					event.sender.send('status-reply', msg);
				});
				
				ipcMain.once('asynchronous-reload-message', (event, arg) => {
					event.sender.send('asynchronous-reload-reply', {
						reload: true,
						next_: getNextBellAfterOnLoadAndReload()
					});
				});
				
				win.reload();
			} else {
				clearTimeout(intervalId);
				
				msg = '<br/>Status: <b style="color: red;">Stopped</b>';

				// console.log("Stop");
				
				ipcMain.on('status-message', (event, arg) => {	
					event.sender.send('status-reply', msg);
				});
				
				win.reload();
			}
		}
	},
	{
		label: 'Quit',
		accelerator: process.platform == 'darwin' ? 'Command+Q' : 'Ctrl+Q',
		click() {
			app.quit();
		}
	},
	{
		label: '?',
		click() {
			// Ubuntu 18.04
			// gtkdialog mapped without a transient parent. this is discouraged
			dialog.showMessageBox(win, {
					type: "info", 
					title: "About", 
					message: appVer+"\r\n"+author
				}
			);
		}
	}
];

// Add developer toosl item if not in production
/* if (process.env.NODE_ENV !== 'production') {
	mainMenuTemplate.push({
		label: 'Developer Tools',
		submenu: [
			{
				label: 'Toggle DevTools',
				accelerator: process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
				click: function(item, focusedWindow) {
					focusedWindow.toggleDevTools();
				}
			},
			{
				role: 'reload'
			}
		]
	});
} */