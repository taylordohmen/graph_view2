import { ButtonComponent, DropdownComponent, ItemView, ToggleComponent, WorkspaceLeaf } from 'obsidian';
import { SigmaGraphView, VIEW_TYPE_SIGMA } from 'sigma-graph-view';

export const VIEW_TYPE_SIGMA_CONTROL = 'sigma-control-view';

const FA2PLAY = '▶️ Force Atlas 2 Layout';
const FA2PAUSE = '⏸️ Force Atlas 2 Layout';
const FA2BUTTON_TEXTS = [FA2PLAY, FA2PAUSE];

const NOVERLAP_PLAY = '▶️ Noverlap Layout';
const NOVERLAP_PAUSE = '⏸️ Noverlap Layout';
const NOVERLAP_BUTTON_TEXTS = [NOVERLAP_PLAY, NOVERLAP_PAUSE];

// Custom View class for the graph
export class SigmaControlView extends ItemView {
	private container: HTMLElement;
	private fitToViewButton: ButtonComponent;
	private sigmaView: SigmaGraphView;
	private redrawButton: ButtonComponent;
	private circularButton: ButtonComponent;
	private circlepackButton: ButtonComponent;
	private fa2Button: ButtonComponent;
	private fa2State: number;
	private noverlapState: number;
	private layoutToggle: ToggleComponent;
	public viewDropdown: DropdownComponent;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		this.navigation = true;
		this.container = this.contentEl.createDiv({
			cls: 'sigma-control-container'
		});
	}

	getViewType(): string {
		return VIEW_TYPE_SIGMA_CONTROL;
	}

	getDisplayText(): string {
		return 'Sigma Graph Controls';
	}

	async onOpen(): Promise<void> {
		const sigmaLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_SIGMA);

		this.container.createDiv({
			cls: 'sigma-control-separator'
		});

		this.viewDropdown = new DropdownComponent(this.container);
		for ( const leaf of sigmaLeaves ) {
			
		}

		this.container.createDiv({
			cls: 'sigma-control-separator'
		});

		this.fitToViewButton = new ButtonComponent(this.container);
		this.fitToViewButton.setButtonText('Fit Graph To View');
		this.fitToViewButton.setClass('sigma-control-button');
		this.fitToViewButton.onClick((evt: MouseEvent) => this.sigmaView.fitToView());

		this.container.createDiv({
			cls: 'sigma-control-separator'
		});

		this.layoutToggle = new ToggleComponent(this.container);
		this.layoutToggle.setValue(true);
		this.layoutToggle.onChange((value: boolean) => !value);

		this.circularButton = new ButtonComponent(this.container);
		this.circularButton.setButtonText('Circular Layout');
		this.circularButton.setClass('sigma-control-button');
		this.circularButton.onClick((evt: MouseEvent) => this.sigmaView.circularLayout());

		this.container.createDiv({
			cls: 'sigma-control-separator'
		});

		this.randomButton = new ButtonComponent(this.container);
		this.randomButton.setButtonText('Random Layout');
		this.randomButton.setClass('sigma-control-button');
		this.randomButton.onClick((evt: MouseEvent) => this.sigmaView.randomLayout());

		this.container.createDiv({
			cls: 'sigma-control-separator'
		});

		this.circlepackButton = new ButtonComponent(this.container);
		this.circlepackButton.setButtonText('Circlepack Layout');
		this.circlepackButton.setClass('sigma-control-button');
		this.circlepackButton.onClick((evt: MouseEvent) => this.sigmaView.circlepackLayout());

		this.container.createDiv({
			cls: 'sigma-control-separator'
		});

		this.fa2Button = new ButtonComponent(this.container);
		this.fa2State = 0;
		this.fa2Button.setButtonText(FA2BUTTON_TEXTS[this.fa2State]);
		this.fa2Button.setClass('sigma-control-button');
		this.fa2Button.onClick((evt: MouseEvent) => {
			this.fa2State = (this.fa2State + 1) % 2;
			this.fa2Button.setButtonText(FA2BUTTON_TEXTS[this.fa2State]);
			this.sigmaView.toggleFA2Layout();
		});

		this.container.createDiv({
			cls: 'sigma-control-separator'
		});

		this.noverlapButton = new ButtonComponent(this.container);
		this.noverlapState = 0;
		this.noverlapButton.setButtonText(NOVERLAP_BUTTON_TEXTS[this.noverlapState]);
		this.noverlapButton.setClass('sigma-control-button');
		this.noverlapButton.onClick((evt: MouseEvent) => {
			this.noverlapState = (this.noverlapState + 1) % 2;
			this.noverlapButton.setButtonText(NOVERLAP_BUTTON_TEXTS[this.noverlapState]);
			this.sigmaView.toggleNoverlapLayout();
		});

		this.container.createDiv({
			cls: 'sigma-control-separator'
		});

		this.redrawButton = new ButtonComponent(this.container);
		this.redrawButton.setButtonText('Redraw Graph');
		this.redrawButton.setClass('sigma-control-button');
		this.redrawButton.onClick((evt: MouseEvent) => {
			this.sigmaView.onClose();
			this.sigmaView.onOpen();
		});

		this.container.createDiv({
			cls: 'sigma-control-separator'
		});
	}

	async onClose(): Promise<void> {}
}
