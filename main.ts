import {
	App,
	MarkdownView,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TAbstractFile,
	TFile,
  } from 'obsidian';

//設定項目を追加　this.settings.hogehoge で値を参照する
interface MyPluginSettings {
	defaultWidth: number;
	defaultHeight: number;
	//delayTime: number;
}
//設定項目のデフォルト値
const DEFAULT_SETTINGS: MyPluginSettings = {
	defaultWidth: 200, 
	defaultHeight: 0,
	//delayTime: 0,
}
//画像の拡張子判別用
const IMAGE_EXTS = [
	'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg',
]

// メイン処理
export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();
		this.registerEvent(
			this.app.vault.on('create', (file) => {
				//ファイルチェック
				if (!(file instanceof TFile)){
					return
				}
				//Obsidianの起動時に発火するイベントを無視
				const timeGapMs = (new Date().getTime()) - file.stat.ctime
				if (timeGapMs > 1000){
					return
				}
				if (!isImage(file)){
					return
				}
				const activeFile = this.getActiveFile()
				if (!activeFile) {
					return
				}

				//ActiveFileのwikilinkを生成
				const path = this.app.fileManager.generateMarkdownLink(file, activeFile.path).split('/');
				const wikilink = path[path.length - 1];

				//ホントはdelayはいらないはずだけど、はずすとなぜかうまくいかない
				setTimeout(() => {
					this.startEditLink(wikilink);
				}, 0);
			})
		)
		this.addSettingTab(new SettingTab(this.app, this));
	}
	

	onunload() {

	}

	async startEditLink(wikilink: string) {
		debugLog("edit start!")
		
		const editor = this.getActiveEditor()
		if (!editor) {
			new Notice(`Failed to rename: no active editor`)
			return
		}

		const currentFile = editor.getDoc().getValue()

		debugLog(currentFile)
		debugLog(wikilink)

		//wikilink, markdown linkを判別し、その後defaultHHeightが設定されているか否かを判別
		if(wikilink.endsWith(")")){
			if(this.settings.defaultHeight === 0){
				var resizedLink = wikilink.replace("]", "|" + this.settings.defaultWidth + "]")
			} else {
				var resizedLink = wikilink.replace("]", "|" + this.settings.defaultWidth + "x" + this.settings.defaultHeight + "]")
			}
		} else {
			if(this.settings.defaultHeight === 0){
				var resizedLink = wikilink.slice(0, -2) + "|" + this.settings.defaultWidth + "]]"
			} else {
				var resizedLink = wikilink.slice(0, -2) + "|" + this.settings.defaultWidth + "x" + this.settings.defaultHeight + "]]"
			}
		}
		
		const replacedContent = currentFile.replace(wikilink, resizedLink)
		editor.setValue(replacedContent)

		debugLog(replacedContent)
	}

	getActiveEditor() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView)
		return view?.editor
	}

	getActiveFile() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView)
		const file = view?.file
		return file
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

//画像ファイルか否かを判定
function isImage(file: TAbstractFile): boolean {
	if (file instanceof TFile) {
		if (IMAGE_EXTS.contains(file.extension.toLowerCase())) {
			return true
		}
	}
	return false
}

//デバッグ用 環境変数BUILD_ENVが'production'に設定されていた場合に、
export const DEBUG = !(process.env.BUILD_ENV === 'production')
if (DEBUG) console.log('DEBUG is enabled')
export function debugLog(...args: any[]) {
	if (DEBUG) {
		console.log((new Date()).toISOString().slice(11, 23), ...args)
	}
}

//設定タブを定義
  class SettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Default Width')
			.setDesc('Set default width of pasted image')
			.addText(text => text
				.setPlaceholder('Enter number')
				.setValue(this.plugin.settings.defaultWidth.toString())
				.onChange(async (value) => {
					const numericValue = parseInt(value, 10);
					if (!isNaN(numericValue)) {
						this.plugin.settings.defaultWidth = numericValue;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
		.setName('Default Height')
		.setDesc('Set default height of pasted image\n(To desable this option, set zero.')
		.addText(text => text
			.setPlaceholder('Enter number')
			.setValue(this.plugin.settings.defaultHeight.toString())
			.onChange(async (value) => {
				const numericValue = parseInt(value, 10);
				if (!isNaN(numericValue)) {
					this.plugin.settings.defaultHeight = numericValue;
					await this.plugin.saveSettings();
				}
			}));
				
		//new Setting(containerEl)
		//	.setName('Delay Time')
		//	.setDesc('Adjust the time according to the size of the files you paste at a time.\n(default: 50ms)')
		//	.addText(text => text
		//		.setPlaceholder('Enter number')
		//		.setValue(this.plugin.settings.delayTime.toString())
		//		.onChange(async (value) => {
		//			const numericValue = parseInt(value, 10);
		//			if (!isNaN(numericValue)) {
		//				this.plugin.settings.delayTime = numericValue;
		//				await this.plugin.saveSettings();
		//			}
		//		}));
	}
}