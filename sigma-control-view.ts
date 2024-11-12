import { ItemView, WorkspaceLeaf } from 'obsidian';

export const VIEW_TYPE_SIGMA_CONTROL = 'sigma-control-view';

// Custom View class for the graph
export class SigmaControlView extends ItemView {

    private container: HTMLElement;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
        this.navigation = true;
        this.container = this.contentEl.createDiv({ cls: 'sigma-graph-container' });
    }

    getViewType(): string {
        return VIEW_TYPE_SIGMA_CONTROL;
    }

    getDisplayText(): string {
        return 'Sigma Graph Controls';
    }

    async onOpen(): Promise<void> {

    }

    async onClose(): Promise<void> {

    }
}