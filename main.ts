import { Plugin, WorkspaceLeaf } from 'obsidian';
import { SigmaGraphView, VIEW_TYPE_SIGMA } from 'sigma-graph-view';
import { SigmaDetailsView, VIEW_TYPE_SIGMA_DETAILS } from 'sigma-details-view';

// Main plugin class
export default class SigmaGraphPlugin extends Plugin {
	async onload() {
		// Register the custom view
		this.registerView(VIEW_TYPE_SIGMA, (leaf: WorkspaceLeaf) => new SigmaGraphView(leaf));

		this.registerView(
			VIEW_TYPE_SIGMA_DETAILS,
			(leaf: WorkspaceLeaf) => new SigmaDetailsView(leaf)
		);

		// Add ribbon icon
		this.addRibbonIcon('dot-network', 'Open Sigma Graph View', (evt: MouseEvent) => {
			this.activateGraphView();
		});

		// Add command to open graph view
		this.addCommand({
			id: 'open-sigma-graph-view',
			name: 'Open Sigma Graph View',
			callback: () => {
				this.activateGraphView();
			}
		});

		// This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: 'fit-sigma-graph-to-view',
		// 	name: 'Fit sigma graph to view',
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const sigmaView = this.app.workspace.getActiveViewOfType(SigmaGraphView);
		// 		if (sigmaView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				sigmaView.fitToView();
		// 			}
		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	}
		// });

		this.addCommand({
			id: 'export-to-gexf',
			name: 'Export the graph as a GEFX file.',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const sigmaView = this.app.workspace.getActiveViewOfType(SigmaGraphView);
				if (sigmaView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						const gexfString = sigmaView.gexfString();
						const rootPath = this.app.vault.getRoot().path;
						this.app.vault.create(`${rootPath}/graph.gexf`, gexfString);
					}
					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});
	}

	async onunload() {}

	private async activateGraphView(): Promise<void> {
		let leaf: WorkspaceLeaf | null;
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_SIGMA);

		if (leaves.length > 0) {
			// View is already open
			leaf = leaves[0];
		} else {
			// Create new leaf
			leaf = this.app.workspace.getLeaf();
			await leaf.setViewState({ type: VIEW_TYPE_SIGMA, active: true });
		}

		// Reveal the leaf
		await this.app.workspace.revealLeaf(leaf);
	}
}
