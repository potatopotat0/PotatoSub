const { contextBridge, ipcRenderer } = require('electron')

//l10n support
const fs = require('fs');
window.addEventListener('DOMContentLoaded', () => {
	var i18nFilePath = new String();
	var userLocale = Intl.DateTimeFormat().resolvedOptions().locale;
	if (fs.existsSync(`i18n\\${userLocale}.json`)) {
		i18nFilePath = `i18n\\${userLocale}.json`;
	} else if (fs.existsSync(`i18n\\${userLocale.split('-')[0]}.json`)) {
		i18nFilePath = `i18n\\${userLocale.split('-')[0]}.json`;
	} else {
		i18nFilePath = 'i18n\\en-US.json';
	}
	fs.readFile(i18nFilePath, { encoding: "utf-8", flag: "r" }, (err, data) => {
		if (err) throw err;
		const mapping = JSON.parse(data);
		for (const key in mapping) {
			document.body.innerHTML = document.body.innerHTML.replaceAll(key, mapping[key]);
			document.head.innerHTML = document.head.innerHTML.replaceAll(key, mapping[key]);
		}
	})
})

//expose node.js command to front end
contextBridge.exposeInMainWorld('ipc', {
	i18nQuery: (key, arg = []) => ipcRenderer.invoke("i18n:query", key, arg),
	renderOutput: (callback) => ipcRenderer.on("render-output", callback),
	renderFinished: (callback) => ipcRenderer.on("render-finished", callback)
})