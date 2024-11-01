import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';
import { SigmaGraphView, VIEW_TYPE_SIGMA } from 'sigma-graph-view';

// interface SigmaGraphPluginSettings {
// 	mySetting: string;
// }

// const DEFAULT_SETTINGS: SigmaGraphPluginSettings = {
// 	mySetting: 'default'
// }

// export default class SigmaGraphPlugin extends Plugin {

//   settings: SigmaGraphPluginSettings;

// 	async onload() {
// 		await this.loadSettings();

//     console.log("Loading Sigma Graph View...");

//     this.registerView(
//       VIEW_TYPE_SIGMA,
//       (leaf) => new SigmaGraphView(leaf)
//     );

//     // Add command to open custom graph view
//     this.addRibbonIcon("dot-network", "Open Custom Graph View", () => {
//       this.openSigmaGraphView();
//     });

// 		// This creates an icon in the left ribbon.
// 		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
// 			// Called when the user clicks the icon.
// 			new Notice('This is a notice!');
// 		});
// 		// Perform additional things with the ribbon
// 		ribbonIconEl.addClass('my-plugin-ribbon-class');

// 		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
// 		const statusBarItemEl = this.addStatusBarItem();
// 		statusBarItemEl.setText('Status Bar Text');

// 		// This adds a simple command that can be triggered anywhere
// 		this.addCommand({
// 			id: 'open-sample-modal-simple',
// 			name: 'Open sample modal (simple)',
// 			callback: () => {
// 				new SampleModal(this.app).open();
// 			}
// 		});
// 		// This adds an editor command that can perform some operation on the current editor instance
// 		this.addCommand({
// 			id: 'sample-editor-command',
// 			name: 'Sample editor command',
// 			editorCallback: (editor: Editor, view: MarkdownView) => {
// 				console.log(editor.getSelection());
// 				editor.replaceSelection('Sample Editor Command');
// 			}
// 		});
// 		// This adds a complex command that can check whether the current state of the app allows execution of the command
// 		this.addCommand({
// 			id: 'open-sample-modal-complex',
// 			name: 'Open sample modal (complex)',
// 			checkCallback: (checking: boolean) => {
// 				// Conditions to check
// 				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
// 				if (markdownView) {
// 					// If checking is true, we're simply "checking" if the command can be run.
// 					// If checking is false, then we want to actually perform the operation.
// 					if (!checking) {
// 						new SampleModal(this.app).open();
// 					}

// 					// This command will only show up in Command Palette when the check function returns true
// 					return true;
// 				}
// 			}
// 		});

// 		// This adds a settings tab so the user can configure various aspects of the plugin
// 		this.addSettingTab(new SigmaGraphSettingTab(this.app, this));

// 		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
// 		// Using this function will automatically remove the event listener when this plugin is disabled.
// 		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
// 			console.log('click', evt);
// 		});

// 		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
// 		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
// 	}

// 	onunload() {

// 	}

// 	async loadSettings() {
// 		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
// 	}

// 	async saveSettings() {
// 		await this.saveData(this.settings);
// 	}

//     async openSigmaGraphView() {
//         const { workspace } = this.app;

//         let leaf: WorkspaceLeaf | null = null;
//         const leaves = workspace.getLeavesOfType(VIEW_TYPE_SIGMA);

//         if (leaves.length > 0) {
//             // A leaf with our view already exists, use that
//             leaf = leaves[0];
//         } else {
//             // Our view could not be found in the workspace, create a new leaf
//             leaf = workspace.getLeaf();
//             await leaf.setViewState({ type: VIEW_TYPE_SIGMA, active: true });
//         }
//         workspace.revealLeaf(leaf);
//     }
// }

// class SampleModal extends Modal {
// 	constructor(app: App) {
// 		super(app);
// 	}

// 	onOpen(): void {
// 		const {contentEl} = this;
// 		contentEl.setText('Woah!');
// 	}

// 	onClose(): void {
// 		const {contentEl} = this;
// 		contentEl.empty();
// 	}
// }

// class SigmaGraphSettingTab extends PluginSettingTab {
// 	plugin: SigmaGraphPlugin;

// 	constructor(app: App, plugin: SigmaGraphPlugin) {
// 		super(app, plugin);
// 		this.plugin = plugin;
// 	}

// 	display(): void {
// 		const {containerEl} = this;

// 		containerEl.empty();

// 		new Setting(containerEl)
// 			.setName('Setting #1')
// 			.setDesc('It\'s a secret')
// 			.addText(text => text
// 				.setPlaceholder('Enter your secret')
// 				.setValue(this.plugin.settings.mySetting)
// 				.onChange(async (value) => {
// 					this.plugin.settings.mySetting = value;
// 					await this.plugin.saveSettings();
// 				})
//             );
// 	}
// } */

// Main plugin class
export default class SigmaGraphPlugin extends Plugin {
    
    async onload() {
        // Register the custom view
        this.registerView(
            VIEW_TYPE_SIGMA, 
            (leaf: WorkspaceLeaf) => new SigmaGraphView(leaf)
        );

        // Add ribbon icon
        this.addRibbonIcon(
            'dot-network',
            'Open Sigma Graph View',
            (evt: MouseEvent) => {
                this.activateView();
            }
        );

        // Add command to open graph view
        this.addCommand({
            id: 'open-sigma-graph-view',
            name: 'Open Sigma Graph View',
            callback: () => {
                this.activateView();
            }
        });
    }

    async onunload() { }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_SIGMA);

        if (leaves.length > 0) {
            // View is already open
            leaf = leaves[0];
        } else {
            // Create new leaf
            leaf = workspace.getLeaf();
            await leaf.setViewState({type: VIEW_TYPE_SIGMA, active: true});
        }

        // Reveal the leaf
        workspace.revealLeaf(leaf);
    }
}