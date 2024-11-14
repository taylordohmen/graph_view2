import { ButtonComponent, ItemView, WorkspaceLeaf } from "obsidian";
import { SigmaGraphView, VIEW_TYPE_SIGMA } from 'sigma-graph-view';

export const VIEW_TYPE_SIGMA_CONTROL = "sigma-control-view";

// Custom View class for the graph
export class SigmaControlView extends ItemView {
	private container: HTMLElement;
	private fitToViewButton: ButtonComponent;
	private sigmaView: SigmaGraphView;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		this.navigation = true;
		this.container = this.contentEl.createDiv({
			cls: "sigma-control-container",
		});
	}

	getViewType(): string {
		return VIEW_TYPE_SIGMA_CONTROL;
	}

	getDisplayText(): string {
		return "Sigma Graph Controls";
	}

	async onOpen(): Promise<void> {
		this.sigmaView = this.app.workspace.getLeavesOfType(VIEW_TYPE_SIGMA)[0].view;
		this.fitToViewButton = new ButtonComponent(this.container);
		this.fitToViewButton.setButtonText('Fit graph to view');
		this.fitToViewButton.onClick((evt: MouseEvent) => this.sigmaView.fitToView());
	}

	async onClose(): Promise<void> {}
}
